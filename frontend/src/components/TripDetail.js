import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import API from '../services/api';
import RouteMap from './RouteMap';
import LogSheets from './LogSheets';
import './TripDetail.css';

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [id]);

  const loadTrip = async () => {
    try {
      const response = await API.get(`trips/${id}/`);
      setTrip(response.data);
    } catch (err) {
      setError('Failed to load trip details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    setDeleting(true);
    try {
      await API.delete(`trips/${id}/`);
      await Swal.fire({
        title: 'Deleted!',
        text: 'Your trip has been deleted.',
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        timer: 2000
      });
      navigate('/dashboard');
    } catch (err) {
      await Swal.fire({
        title: 'Error!',
        text: err.response?.data?.error || 'Failed to delete trip',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      setError(err.response?.data?.error || 'Failed to delete trip');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="trip-detail-container">
        <div className="loading">Loading trip details...</div>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="trip-detail-container">
        <div className="error">{error}</div>
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="trip-detail-container">
        <div className="error">Trip not found</div>
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="trip-detail-container">
      <div className="trip-detail-header">
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        <div className="header-actions">
          <button 
            onClick={handleDelete} 
            className="btn-delete"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : '🗑️ Delete Trip'}
          </button>
        </div>
      </div>

      {error && trip && <div className="error-message">{error}</div>}

      <div className="trip-detail-content">
        <div className="trip-info-card">
          <h1>Trip Details</h1>
          <div className="trip-info-grid">
            <div className="info-item">
              <span className="info-label">Current Location</span>
              <span className="info-value">{trip.current_location}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Pickup Location</span>
              <span className="info-value">{trip.pickup_location}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Dropoff Location</span>
              <span className="info-value">{trip.dropoff_location}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Distance</span>
              <span className="info-value">{trip.total_distance?.toFixed(1) || 'N/A'} miles</span>
            </div>
            <div className="info-item">
              <span className="info-label">Current Cycle Hours</span>
              <span className="info-value">{trip.current_cycle_hours} hours</span>
            </div>
            <div className="info-item">
              <span className="info-label">Created Date</span>
              <span className="info-value">
                {new Date(trip.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>

        <RouteMap trip={trip} />
        {trip.id && <LogSheets tripId={trip.id} />}
      </div>
    </div>
  );
};

export default TripDetail;

