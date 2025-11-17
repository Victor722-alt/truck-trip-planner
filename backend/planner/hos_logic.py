import os
import requests
import base64
from datetime import datetime, timedelta
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from io import BytesIO
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend to avoid GUI issues
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from .models import Trip, DailyLog
from django.contrib.auth.models import User


def geocode_location(location_name):
    """Convert location name to coordinates."""
    geolocator = Nominatim(user_agent="truck_trip_planner")
    try:
        location = geolocator.geocode(location_name)
        if location:
            return (location.latitude, location.longitude)
    except Exception as e:
        print(f"Geocoding error: {e}")
    return None


def get_route_distance(start_coords, end_coords):
    """Get route distance using OpenRouteService API or fallback to geodesic."""
    ors_api_key = os.getenv('ORS_API_KEY', '')
    
    if ors_api_key and ors_api_key != 'your_ors_key_here':
        try:
            url = "https://api.openrouteservice.org/v2/directions/driving-car"
            headers = {
                'Authorization': f'Bearer {ors_api_key}',
                'Content-Type': 'application/json'
            }
            body = {
                "coordinates": [
                    [start_coords[1], start_coords[0]],  # lon, lat
                    [end_coords[1], end_coords[0]]
                ]
            }
            response = requests.post(url, json=body, headers=headers, timeout=10)
            response.raise_for_status()  # Raises HTTPError for bad status codes
            data = response.json()
            distance_km = data['features'][0]['properties']['segments'][0]['distance'] / 1000
            return distance_km * 0.621371  # Convert to miles
        except requests.RequestException as e:
            print(f"ORS API request error: {e}, using fallback")
        except (KeyError, IndexError) as e:
            print(f"ORS API response parsing error: {e}, using fallback")
        except ValueError as e:
            print(f"ORS API data validation error: {e}, using fallback")
        except Exception as e:
            print(f"ORS API unexpected error: {e}, using fallback")
    
    # Fallback to geodesic distance
    return geodesic(start_coords, end_coords).miles


def generate_log_sheet_image(date, miles, hours_driven, hours_remaining):
    """Generate a daily log sheet image."""
    fig, ax = plt.subplots(figsize=(8.5, 11))
    ax.axis('off')
    
    # Title
    ax.text(0.5, 0.95, 'DAILY LOG SHEET', ha='center', fontsize=20, weight='bold', transform=ax.transAxes)
    
    # Date
    ax.text(0.1, 0.85, f'Date: {date}', fontsize=12, transform=ax.transAxes)
    
    # Miles driven
    ax.text(0.1, 0.75, f'Miles Driven: {miles:.1f}', fontsize=12, transform=ax.transAxes)
    
    # Hours
    ax.text(0.1, 0.65, f'Hours Driven: {hours_driven:.1f}', fontsize=12, transform=ax.transAxes)
    ax.text(0.1, 0.55, f'Hours Remaining: {hours_remaining:.1f}', fontsize=12, transform=ax.transAxes)
    
    # Grid for log entries
    y_pos = 0.45
    ax.text(0.1, y_pos, 'Time | Location | Miles | Remarks', fontsize=10, weight='bold', transform=ax.transAxes)
    
    # Save to bytes
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    image_b64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()
    
    return image_b64


def plan_trip_and_save(user: User, data):
    """Plan trip with HOS logic and save to database."""
    current_location = data['current_location']
    pickup_location = data['pickup_location']
    dropoff_location = data['dropoff_location']
    current_cycle_hours = data['current_cycle_hours']
    
    # Geocode locations
    current_coords = geocode_location(current_location)
    pickup_coords = geocode_location(pickup_location)
    dropoff_coords = geocode_location(dropoff_location)
    
    if not all([current_coords, pickup_coords, dropoff_coords]):
        raise ValueError("Could not geocode one or more locations")
    
    # Calculate distances
    distance_to_pickup = get_route_distance(current_coords, pickup_coords)
    distance_pickup_to_dropoff = get_route_distance(pickup_coords, dropoff_coords)
    total_distance = distance_to_pickup + distance_pickup_to_dropoff
    
    # HOS Rules (simplified)
    MAX_DRIVING_HOURS = 11  # Max driving hours per day
    MAX_ON_DUTY_HOURS = 14  # Max on-duty hours per day
    REQUIRED_REST = 10  # Required rest hours
    
    # Calculate trip days
    avg_speed = 55  # mph
    total_hours = total_distance / avg_speed
    hours_remaining = 11 - current_cycle_hours
    
    daily_logs = []
    current_date = datetime.now().date()
    remaining_distance = total_distance
    remaining_hours = hours_remaining
    
    while remaining_distance > 0:
        if remaining_hours <= 0:
            # Need rest day
            daily_logs.append({
                'date': current_date,
                'miles': 0,
                'hours_driven': 0,
                'hours_remaining': 0,
                'image_b64': generate_log_sheet_image(
                    str(current_date), 0, 0, 0
                )
            })
            current_date += timedelta(days=1)
            remaining_hours = MAX_DRIVING_HOURS
            continue
        
        # Calculate miles for this day
        miles_today = min(remaining_distance, remaining_hours * avg_speed)
        hours_driven_today = miles_today / avg_speed
        remaining_distance -= miles_today
        remaining_hours -= hours_driven_today
        
        daily_logs.append({
            'date': current_date,
            'miles': miles_today,
            'hours_driven': hours_driven_today,
            'hours_remaining': remaining_hours,
            'image_b64': generate_log_sheet_image(
                str(current_date), miles_today, hours_driven_today, remaining_hours
            )
        })
        
        current_date += timedelta(days=1)
        if remaining_hours <= 0:
            remaining_hours = MAX_DRIVING_HOURS
    
    # Create trip in database
    trip = Trip.objects.create(
        user=user,
        current_location=current_location,
        pickup_location=pickup_location,
        dropoff_location=dropoff_location,
        current_cycle_hours=current_cycle_hours,
        total_distance=total_distance
    )
    
    # Create daily logs
    for log in daily_logs:
        DailyLog.objects.create(
            trip=trip,
            log_date=log['date'],
            log_image=log['image_b64'],
            miles_driven=log['miles']
        )
    
    return {
        'trip_id': trip.id,
        'total_distance': total_distance,
        'estimated_days': len(daily_logs),
        'daily_logs': daily_logs
    }

