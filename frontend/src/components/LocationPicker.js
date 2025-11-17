import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import './LocationPicker.css';

// Fix for default marker icons
if (typeof window !== 'undefined' && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.0/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.0/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.0/dist/images/marker-shadow.png',
  });
}

function LocationMarker({ onLocationSelect, resetTrigger, initialCenter }) {
  const [position, setPosition] = useState(null);
  const [locationName, setLocationName] = useState('');

  // Reset state when resetTrigger changes
  useEffect(() => {
    setPosition(null);
    setLocationName('');
  }, [resetTrigger]);

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data.display_name) {
        const name = data.display_name.split(',')[0] + ', ' + 
                    (data.address?.state || data.address?.country || '');
        setLocationName(name);
        onLocationSelect(name, lat, lng);
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      onLocationSelect(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng);
    }
  }, [onLocationSelect]);

  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      reverseGeocode(lat, lng);
    },
  });

  useEffect(() => {
    // Center map on initialCenter if provided, otherwise try geolocation
    if (initialCenter && Array.isArray(initialCenter) && initialCenter.length === 2) {
      map.setView(initialCenter, 10);
    } else if (position === null && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 13);
          // Don't auto-select location, just center the map
        },
        () => {
          // Default to center of US if geolocation fails
          if (!initialCenter) {
            map.setView([39.8283, -98.5795], 4);
          }
        }
      );
    }
  }, [map, position, initialCenter]);

  return position === null ? null : (
    <Marker position={position}>
      {locationName && (
        <Popup>{locationName}</Popup>
      )}
    </Marker>
  );
}

const LocationPicker = ({ onLocationSelect, onClose, fieldLabel, initialCenter }) => {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);

  // Reset state when component mounts or fieldLabel changes
  useEffect(() => {
    setSelectedLocation('');
    setSelectedCoords(null);
  }, [fieldLabel]);
  
  // Determine map center and zoom
  const getMapCenter = () => {
    if (initialCenter && Array.isArray(initialCenter) && initialCenter.length === 2) {
      return initialCenter;
    }
    return [39.8283, -98.5795]; // Default center of US
  };
  
  const getMapZoom = () => {
    if (initialCenter && Array.isArray(initialCenter) && initialCenter.length === 2) {
      return 10; // Closer zoom when centered on a specific location
    }
    return 4; // Wider view for default
  };

  const handleLocationSelect = (name, lat, lng) => {
    setSelectedLocation(name);
    setSelectedCoords({ lat, lng });
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      setSelectedLocation('');
      setSelectedCoords(null);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedLocation('');
    setSelectedCoords(null);
    onClose();
  };

  return (
    <div className="location-picker-overlay">
      <div className="location-picker-modal">
        <div className="location-picker-header">
          <h3>Select {fieldLabel}</h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        <div className="location-picker-content">
          <p className="picker-instructions">
            Click on the map to select your location
          </p>
          <div className="map-container">
            <MapContainer
              key={fieldLabel} // Force remount when field changes
              center={getMapCenter()}
              zoom={getMapZoom()}
              style={{ height: '400px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationMarker 
                onLocationSelect={handleLocationSelect} 
                resetTrigger={fieldLabel}
                initialCenter={initialCenter}
              />
            </MapContainer>
          </div>
          {selectedLocation && (
            <div className="selected-location">
              <strong>Selected:</strong> {selectedLocation}
            </div>
          )}
          <div className="picker-actions">
            <button onClick={handleClose} className="btn-cancel">Cancel</button>
            <button 
              onClick={handleConfirm} 
              className="btn-confirm"
              disabled={!selectedLocation}
            >
              Use This Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;

