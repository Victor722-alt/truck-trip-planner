import React, { useState, useEffect } from 'react';
import API from '../services/api';
import './TripHistory.css';

const TripHistory = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const response = await API.get('trips/');
      setTrips(response.data);
    } catch (err) {
      console.error('Failed to load trips:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="trip-history-container">Loading trips...</div>;
  }

  if (trips.length === 0) {
    return (
      <div className="trip-history-container">
        <h2>Trip History</h2>
        <p>No trips found. Plan your first trip!</p>
      </div>
    );
  }

  return (
    <div className="trip-history-container">
      <h2>Trip History</h2>
      <div className="trips-grid">
        {trips.map((trip) => (
          <div key={trip.id} className="trip-card">
            <div className="trip-route">
              <span className="trip-location">{trip.pickup_location}</span>
              <span className="trip-arrow">→</span>
              <span className="trip-location">{trip.dropoff_location}</span>
            </div>
            <div className="trip-details">
              <div className="trip-detail-item">
                <strong>Distance:</strong> {trip.total_distance?.toFixed(1) || 'N/A'} miles
              </div>
              <div className="trip-detail-item">
                <strong>Created:</strong>{' '}
                {new Date(trip.created_at).toLocaleDateString()}
              </div>
              <div className="trip-detail-item">
                <strong>Current Cycle Hours:</strong> {trip.current_cycle_hours}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripHistory;

