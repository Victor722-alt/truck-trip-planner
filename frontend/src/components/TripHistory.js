import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaClipboardList, FaTruck } from 'react-icons/fa';
import API from '../services/api';
import './TripHistory.css';

const TripHistory = ({ refreshTrigger }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTrips();
  }, [refreshTrigger]);

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

  const handleTripClick = (tripId) => {
    navigate(`/trips/${tripId}`);
  };

  if (loading) {
    return <div className="trip-history-container">Loading trips...</div>;
  }

  return (
    <div className="trip-history-container">
      {trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FaTruck /></div>
          <h3>No trips yet</h3>
          <p>Start planning your first trip to see it here</p>
        </div>
      ) : (
        <>
          <h2 className="trips-title"><FaClipboardList /> My Trips</h2>
        <div className="trips-grid">
          {trips.map((trip) => (
            <div 
              key={trip.id} 
              className="trip-card"
              onClick={() => handleTripClick(trip.id)}
            >
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
                  <strong>Cycle Hours:</strong> {trip.current_cycle_hours}h
                </div>
              </div>
              <div className="trip-card-footer">
                <span className="view-details">Click to view details →</span>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
};

export default TripHistory;

