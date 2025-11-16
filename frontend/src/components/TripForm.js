import React, { useState } from 'react';
import API from '../services/api';
import './TripForm.css';

const TripForm = ({ onTripCreated }) => {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_hours: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      onTripCreated(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error || 
        Object.values(err.response?.data || {}).flat().join(', ') || 
        'Failed to create trip'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trip-form-container">
      <h2>Plan New Trip</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="trip-form">
        <div className="form-group">
          <label>Current Location</label>
          <input
            type="text"
            name="current_location"
            value={formData.current_location}
            onChange={handleChange}
            placeholder="e.g., New York, NY"
            required
          />
        </div>
        <div className="form-group">
          <label>Pickup Location</label>
          <input
            type="text"
            name="pickup_location"
            value={formData.pickup_location}
            onChange={handleChange}
            placeholder="e.g., Chicago, IL"
            required
          />
        </div>
        <div className="form-group">
          <label>Dropoff Location</label>
          <input
            type="text"
            name="dropoff_location"
            value={formData.dropoff_location}
            onChange={handleChange}
            placeholder="e.g., Los Angeles, CA"
            required
          />
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
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Planning Trip...' : 'Plan Trip'}
        </button>
      </form>
    </div>
  );
};

export default TripForm;

