import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTruck, FaMapMarkerAlt, FaBox, FaMapPin, FaClock, FaMap } from 'react-icons/fa';
import Swal from 'sweetalert2';
import API from '../services/api';
import LocationPicker from './LocationPicker';
import ItineraryMap from './ItineraryMap';
import './TripForm.css';

const TripForm = ({ onTripCreated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_hours: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [locationCoordinates, setLocationCoordinates] = useState({});

  const reverseGeocode = useCallback(async (lat, lng, fieldName) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data.display_name) {
        const location = data.display_name.split(',')[0] + ', ' + 
                        (data.address?.state || data.address?.country || '');
        setFormData(prev => ({
          ...prev,
          [fieldName]: location,
        }));
        // Store coordinates for map centering
        setLocationCoordinates(prev => ({
          ...prev,
          [fieldName]: [lat, lng],
        }));
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
  }, []);

  useEffect(() => {
    // Request location permission on component mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          reverseGeocode(latitude, longitude, 'current_location');
          setLocationPermission('granted');
        },
        (error) => {
          setLocationPermission('denied');
        },
        { timeout: 5000 }
      );
    } else {
      setLocationPermission('not-supported');
    }
  }, [reverseGeocode]);

  const handleLocationRequest = (fieldName) => {
    if (navigator.geolocation && locationPermission !== 'denied') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          reverseGeocode(latitude, longitude, fieldName);
        },
        () => {
          // User denied or error - show map picker
          setShowLocationPicker(fieldName);
        },
        { timeout: 5000 }
      );
    } else {
      // Show map picker directly
      setShowLocationPicker(fieldName);
    }
  };

  const handleLocationSelect = async (location, fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: location,
    }));
    
    // Geocode the selected location to get coordinates for next map centering
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
      );
      const data = await response.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setLocationCoordinates(prev => ({
          ...prev,
          [fieldName]: [lat, lng],
        }));
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
    
    setShowLocationPicker(null);
  };
  
  const getInitialMapCenter = (fieldName) => {
    // When selecting pickup, center on current location
    if (fieldName === 'pickup_location' && locationCoordinates.current_location) {
      return locationCoordinates.current_location;
    }
    // When selecting dropoff, center on pickup (or current if pickup not set)
    if (fieldName === 'dropoff_location') {
      if (locationCoordinates.pickup_location) {
        return locationCoordinates.pickup_location;
      }
      if (locationCoordinates.current_location) {
        return locationCoordinates.current_location;
      }
    }
    // Default center
    return null;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await API.post('trips/', {
        ...formData,
        current_cycle_hours: parseFloat(formData.current_cycle_hours),
      });
      
      const tripData = response.data;
      
      await Swal.fire({
        title: 'Trip Created!',
        text: `Your trip from ${formData.pickup_location} to ${formData.dropoff_location} has been planned successfully.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'View Trip Details',
        showCancelButton: true,
        cancelButtonText: 'Go to Dashboard',
        cancelButtonColor: '#64748b'
      }).then((result) => {
        if (result.isConfirmed && tripData.id) {
          navigate(`/trips/${tripData.id}`);
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          navigate('/dashboard');
        }
      });
      
      if (onTripCreated) {
        onTripCreated(tripData);
      }
      
      // Clear form after successful trip creation
      setFormData({
        current_location: '',
        pickup_location: '',
        dropoff_location: '',
        current_cycle_hours: '',
      });
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
        Object.values(err.response?.data || {}).flat().join(', ') || 
        'Failed to create trip';
      
      await Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trip-form-container">
      <div className="trip-form-header">
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn-back"
          title="Back to Dashboard"
        >
          ← Back
        </button>
        <h2><FaTruck /> Plan New Trip</h2>
        <p className="subtitle">Enter your trip details below and we'll calculate the optimal route with HOS compliance</p>
      </div>
      {error && <div className="error">{error}</div>}
      
      {/* Live Itinerary Map Preview - Show as soon as first location is entered */}
      {(formData.current_location || formData.pickup_location || formData.dropoff_location) && (
        <div className="itinerary-preview">
          <h3>Your Itinerary</h3>
          <p className="itinerary-hint">
            {!formData.current_location && !formData.pickup_location && formData.dropoff_location && "Add pickup and current locations to see the complete route"}
            {!formData.pickup_location && formData.current_location && formData.dropoff_location && "Add pickup location to see the complete route"}
            {!formData.dropoff_location && (formData.current_location || formData.pickup_location) && "Add dropoff location to see the complete route"}
            {formData.current_location && formData.pickup_location && formData.dropoff_location && "Route follows actual roads for the most economical path"}
          </p>
          <ItineraryMap 
            locations={{
              current_location: formData.current_location,
              pickup_location: formData.pickup_location,
              dropoff_location: formData.dropoff_location,
            }}
            height="500px"
          />
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="trip-form">
        <div className="form-group">
          <label>Current Location</label>
          <div className="input-with-button">
            <input
              type="text"
              name="current_location"
              value={formData.current_location}
              onChange={handleChange}
              placeholder="e.g., New York, NY or 123 Main St, New York"
              required
            />
            <button
              type="button"
              className="location-btn"
              onClick={() => handleLocationRequest('current_location')}
              title="Use my location"
            >
              <FaMapMarkerAlt />
            </button>
          </div>
          <span className="help-text">Where are you starting from? Click the icon to use your location or pick on map</span>
        </div>
        <div className="form-group">
          <label>Pickup Location</label>
          <div className="input-with-button">
            <input
              type="text"
              name="pickup_location"
              value={formData.pickup_location}
              onChange={handleChange}
              placeholder="e.g., Chicago, IL or 456 Oak Ave, Chicago"
              required
            />
            <button
              type="button"
              className="location-btn"
              onClick={() => handleLocationRequest('pickup_location')}
              title="Pick location on map"
            >
              <FaMap />
            </button>
          </div>
          <span className="help-text">Where will you pick up the load? Click the icon to pick on map</span>
        </div>
        <div className="form-group">
          <label>Dropoff Location</label>
          <div className="input-with-button">
            <input
              type="text"
              name="dropoff_location"
              value={formData.dropoff_location}
              onChange={handleChange}
              placeholder="e.g., Los Angeles, CA or 789 Pine Rd, Los Angeles"
              required
            />
            <button
              type="button"
              className="location-btn"
              onClick={() => handleLocationRequest('dropoff_location')}
              title="Pick location on map"
            >
              <FaMap />
            </button>
          </div>
          <span className="help-text">Where is the final destination? Click the icon to pick on map</span>
        </div>
        <div className="form-group">
          <label>Current Cycle Hours</label>
          <input
            type="number"
            name="current_cycle_hours"
            value={formData.current_cycle_hours}
            onChange={handleChange}
            placeholder="0.0"
            min="0"
            max="11"
            step="0.1"
            required
          />
          <span className="help-text">Hours already used today (0-11 hours)</span>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Planning Your Trip...' : 'Plan My Trip'}
        </button>
      </form>
      {showLocationPicker && (
        <LocationPicker
          fieldLabel={showLocationPicker.replace('_', ' ')}
          onLocationSelect={(location) => handleLocationSelect(location, showLocationPicker)}
          onClose={() => setShowLocationPicker(null)}
          initialCenter={getInitialMapCenter(showLocationPicker)}
        />
      )}
    </div>
  );
};

export default TripForm;

