import os
import requests
import base64
from datetime import datetime, timedelta
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from io import BytesIO
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
from .models import Trip, DailyLog
from django.contrib.auth.models import User

ORS_API_KEY = os.getenv('ORS_API_KEY', '')

def geocode_location(location_name):
    """Convert location name to coordinates."""
    geolocator = Nominatim(user_agent="truck_trip_planner", timeout=10)
    try:
        location = geolocator.geocode(location_name, timeout=10)
        if location:
            return (location.latitude, location.longitude)
    except Exception as e:
        print(f"Geocoding error: {e}")
    return None

def get_route_distance(start_coords, end_coords):
    """Get route distance using ORS (truck profile) or fallback to geodesic."""
    if ORS_API_KEY and ORS_API_KEY != 'your_ors_key_here':
        try:
            url = "https://api.openrouteservice.org/v2/directions/driving-hgv"  # Heavy Goods Vehicle
            headers = {'Authorization': f'Bearer {ORS_API_KEY}', 'Content-Type': 'application/json'}
            body = {
                "coordinates": [[start_coords[1], start_coords[0]], [end_coords[1], end_coords[0]]]
            }
            response = requests.post(url, json=body, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            distance_km = data['features'][0]['properties']['segments'][0]['distance'] / 1000
            return distance_km * 0.621371  # Miles
        except Exception as e:
            print(f"ORS error: {e}, using fallback")
    
    # Fallback
    return geodesic(start_coords, end_coords).miles

def simulate_hos_trip(distance_to_pickup, distance_pickup_to_dropoff, current_cycle_hours):
    """Simulate trip with optimized HOS rules, including sleeper berth splits for minimal downtime."""
    total_distance = distance_to_pickup + distance_pickup_to_dropoff
    if total_distance > 4000:  # Rough check for feasibility
        raise ValueError("Trip too long for 70hr cycle")
    
    start_time = datetime(2025, 11, 17, 6, 30)  # 6:30 AM start (per Schneider example)
    current_time = start_time
    cycle_hours = current_cycle_hours
    daily_logs_data = []
    fuel_miles = 0
    drive_since_break = 0
    current_day = start_time.date()
    day_statuses = []  # List of (start_hr, duration, line_id 1-4, remark)
    day_miles = 0
    locations = ['Start']  # Placeholder for remarks

    # Pre-trip inspection: 0.5hr on-duty (Line 4)
    day_statuses.append((current_time.hour + current_time.minute/60, 0.5, 4, "Pre-trip inspection"))
    current_time += timedelta(hours=0.5)
    cycle_hours += 0.5

    # Drive to pickup
    segment_distances = [distance_to_pickup, distance_pickup_to_dropoff]
    for seg_idx, seg_dist in enumerate(segment_distances):
        remaining_dist = seg_dist
        while remaining_dist > 0:
            if current_time.date() != current_day:
                # End day, generate log
                daily_logs_data.append({
                    'date': current_day,
                    'statuses': day_statuses,
                    'miles': day_miles,
                    'locations': locations
                })
                current_day = current_time.date()
                day_statuses = []
                day_miles = 0
                locations = []

            # Check limits
            on_duty_today = sum(dur for _, dur, lid, _ in day_statuses if lid in [3,4])  # Driving + on-duty
            driving_today = sum(dur for _, dur, lid, _ in day_statuses if lid == 3)
            if driving_today >= 11 or on_duty_today >= 14:
                # Optimized sleeper split: 7hr sleeper + 3hr off-duty (per page 8 example pairing)
                hr_start = current_time.hour + current_time.minute/60
                # 7hr sleeper (Line 2)
                day_statuses.append((hr_start, 7, 2, "7hr sleeper berth rest"))
                current_time += timedelta(hours=7)
                # No cycle addition for rest
                # 3hr off-duty (Line 1)
                hr_start += 7
                day_statuses.append((hr_start, 3, 1, "3hr off-duty rest"))
                current_time += timedelta(hours=3)
                drive_since_break = 0
                continue

            if drive_since_break >= 8:
                # 30-min break (on-duty, Line 4)
                hr_start = current_time.hour + current_time.minute/60
                day_statuses.append((hr_start, 0.5, 4, "30-min rest break"))
                current_time += timedelta(hours=0.5)
                cycle_hours += 0.5
                drive_since_break = 0
                continue

            if fuel_miles >= 1000:
                # Fueling 0.5hr on-duty (Line 4)
                hr_start = current_time.hour + current_time.minute/60
                day_statuses.append((hr_start, 0.5, 4, "Fueling"))
                current_time += timedelta(hours=0.5)
                cycle_hours += 0.5
                fuel_miles = 0
                continue

            # Drive 1hr chunk (Line 3)
            chunk_miles = min(remaining_dist, 55)  # 55 mph
            chunk_hr = chunk_miles / 55
            hr_start = current_time.hour + current_time.minute/60
            remark = "Driving to pickup" if seg_idx == 0 else "Driving to dropoff"
            day_statuses.append((hr_start, chunk_hr, 3, remark))
            current_time += timedelta(hours=chunk_hr)
            cycle_hours += chunk_hr
            remaining_dist -= chunk_miles
            day_miles += chunk_miles
            fuel_miles += chunk_miles
            drive_since_break += chunk_hr
            locations.append(f"Location {len(locations)}")  # Placeholder; integrate reverse geocoding in future

        if seg_idx == 0:  # Pickup 1hr on-duty (Line 4)
            hr_start = current_time.hour + current_time.minute/60
            day_statuses.append((hr_start, 1, 4, "Pickup loading"))
            current_time += timedelta(hours=1)
            cycle_hours += 1

    # Post-trip 0.5hr on-duty
    hr_start = current_time.hour + current_time.minute/60
    day_statuses.append((hr_start, 0.5, 4, "Post-trip inspection"))
    current_time += timedelta(hours=0.5)
    cycle_hours += 0.5

    # Final day log
    daily_logs_data.append({
        'date': current_day,
        'statuses': day_statuses,
        'miles': day_miles,
        'locations': locations
    })

    if cycle_hours > 70:
        raise ValueError("Exceeds 70hr cycle")

    return daily_logs_data, (current_time - start_time).total_seconds() / 3600

def generate_log_sheet_image(log_data, driver_name="Driver"):
    """Generate EXACT FMCSA Driver's Daily Log (matches April 2022 guide page 15-17)"""
    date = log_data['date']
    statuses = log_data['statuses']  # (start_hr, duration, line_id 1-4, remark)
    miles = log_data.get('miles', 0)

    fig = plt.figure(figsize=(11, 8.5))  # US Letter
    ax = fig.add_axes([0, 0, 1, 1])
    ax.axis('off')

    # === HEADER ===
    ax.text(0.5, 0.96, "DRIVER'S DAILY LOG", ha='center', va='center', fontsize=16, fontweight='bold')
    ax.text(0.08, 0.93, f"Month/Day/Year: {date.strftime('%m/%d/%Y')}", fontsize=11)
    ax.text(0.08, 0.91, "Original – File at home terminal.", fontsize=9)
    ax.text(0.08, 0.895, "Duplicate – Driver retains in his/her possession for 8 days.", fontsize=9)

    ax.text(0.08, 0.86, f"Driver's Name (First Name - Last Name): {driver_name.upper()}", fontsize=11)
    ax.text(0.08, 0.84, "Name of Carrier: YOUR TRUCKING COMPANY LTD", fontsize=11)
    ax.text(0.08, 0.82, "Main Terminal Address: 123 Truck Ave, Cotonou, Benin", fontsize=11)
    ax.text(0.08, 0.80, "Truck/Tractor and Trailer Numbers or License Plate(s)/State (show each unit): T-001 / TL-456", fontsize=11)

    ax.text(0.68, 0.86, f"Total Miles Driving Today: {miles:.0f}", fontsize=11)
    ax.text(0.68, 0.84, f"Total Mileage Today: {miles:.0f}", fontsize=11)

    # === GRID BACKGROUND ===
    # Vertical lines (24 hours + Mid lines)
    for h in range(25):
        lw = 1.5 if h == 12 else 0.5
        ax.axvline(x=h, ymin=0.15, ymax=0.68, color='black', lw=lw)
    # Horizontal duty lines
    for y, label in [(0.68, "4. On Duty Not Driving"), (0.57, "3. Driving"),
                     (0.46, "2. Sleeper Berth"), (0.35, "1. Off Duty")]:
        ax.axhline(y=y, xmin=0, xmax=1, color='black', lw=1.2)
        ax.text(-0.01, y-0.03, label, ha='right', va='center', fontsize=10, fontweight='bold')

    # X-axis labels
    ax.text(0, 0.31, "Mid.", ha='center', fontsize=9)
    for i in range(1, 12):
        ax.text(i, 0.31, str(i), ha='center', fontsize=9)
    ax.text(12, 0.31, "Noon", ha='center', fontsize=9)
    for i in range(1, 12):
        ax.text(12+i, 0.31, str(i), ha='center', fontsize=9)
    ax.text(24, 0.31, "Mid.", ha='center', fontsize=9)

    # === DRAW STATUS BARS ===
    colors = {1: '#00FF00', 2: '#FFFF00', 3: '#0000FF', 4: '#FF0000'}  # Green, Yellow, Blue, Red
    for start_hr, duration, line_id, remark in statuses:
        y_map = {1: 0.35, 2: 0.46, 3: 0.57, 4: 0.68}
        y = y_map[line_id]
        ax.hlines(y, start_hr, start_hr + duration, colors=colors[line_id], linewidth=12)

    # === REMARKS ===
    ax.text(0.05, 0.28, "Remarks:", fontsize=11, fontweight='bold')
    y_rem = 0.85
    for i, (start_hr, _, _, remark) in enumerate(statuses[:15]):  # Max 15 remarks
        time_str = f"{int(start_hr):02d}:{int((start_hr % 1)*60):02d}"
        ax.text(0.08, y_rem - i*0.015, f"{time_str} – {remark}", fontsize=9)
    
    # Shipping Documents
    ax.text(0.05, 0.10, "Shipping Documents: BOL #123 | Shipper: Sample Co.", fontsize=10)

    # === TOTALS BOX (Right side) ===
    total_driving = sum(d for _, d, lid, _ in statuses if lid == 3)
    total_on_duty_nd = sum(d for _, d, lid, _ in statuses if lid == 4)
    total_on_duty = total_driving + total_on_duty_nd

    ax.text(0.78, 0.68, f"Line 3 (Driving): {total_driving:.1f} hrs", fontsize=10)
    ax.text(0.78, 0.57, f"Line 4 (On Duty): {total_on_duty_nd:.1f} hrs", fontsize=10)
    ax.text(0.78, 0.46, f"Total On Duty: {total_on_duty:.1f} hrs", fontsize=10)
    ax.text(0.78, 0.35, f"Miles: {miles:.0f}", fontsize=10)

    # 70-Hour / 8-Day Rule Summary
    ax.text(0.65, 0.25, "70-Hour/8 Day Rule Summary", fontsize=11, fontweight='bold')
    ax.text(0.65, 0.22, "Total on duty last 8 days: 48.0", fontsize=10)
    ax.text(0.65, 0.19, "Hours remaining: 22.0", fontsize=10)

    # === SIGNATURE ===
    ax.text(0.1, 0.05, "Driver Signature/Certification of Daily Log:", fontsize=11)
    ax.axhline(y=0.06, xmin=0.35, xmax=0.65, color='black', lw=1)
    ax.text(0.7, 0.05, f"Date: {date.strftime('%m/%d/%Y')}", fontsize=11)

    # === FINALIZE ===
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=200, bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')
def plan_trip_and_save(user: User, data):
    """Main function: Simulate, generate logs, save to DB."""
    current_location = data['current_location']
    pickup_location = data['pickup_location']
    dropoff_location = data['dropoff_location']
    current_cycle_hours = float(data['current_cycle_hours'])

    # Geocode
    current_coords = geocode_location(current_location)
    pickup_coords = geocode_location(pickup_location)
    dropoff_coords = geocode_location(dropoff_location)
    
    if not all([current_coords, pickup_coords, dropoff_coords]):
        raise ValueError("Geocoding failed for one or more locations")

    # Distances
    distance_to_pickup = get_route_distance(current_coords, pickup_coords)
    distance_pickup_to_dropoff = get_route_distance(pickup_coords, dropoff_coords)
    total_distance = distance_to_pickup + distance_pickup_to_dropoff

    # Simulate
    daily_logs_data, total_time = simulate_hos_trip(distance_to_pickup, distance_pickup_to_dropoff, current_cycle_hours)

    # Create trip
    trip = Trip.objects.create(
        user=user,
        current_location=current_location,
        pickup_location=pickup_location,
        dropoff_location=dropoff_location,
        current_cycle_hours=current_cycle_hours,
        total_distance=total_distance
    )

    # Generate & save logs
    logs = []
    for log in daily_logs_data:
        # Use full name if available, else username
        driver_name = user.get_full_name().strip()
        if not driver_name:
            driver_name = user.username.upper()

        image_b64 = generate_log_sheet_image(log, driver_name=driver_name)

        daily_log = DailyLog.objects.create(
            trip=trip,
            log_date=log['date'],
            log_image=image_b64,
            miles_driven=log['miles']
        )
        logs.append({
            'id': daily_log.id,
            'date': str(log['date']),
            'image_b64': image_b64,
            'miles': log['miles']
        })

    return {
        'trip_id': trip.id,
        'total_distance': total_distance,
        'total_time_hours': total_time,
        'estimated_days': len(logs),
        'daily_logs': logs
    }