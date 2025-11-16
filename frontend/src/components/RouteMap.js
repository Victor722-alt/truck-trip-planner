import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import './RouteMap.css';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.0/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.0/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.0/dist/images/marker-shadow.png',
});

const RouteMap = ({ trip }) => {
  const [coordinates, setCoordinates] = React.useState([]);

  useEffect(() => {
    if (trip) {
      // In a real app, you'd geocode these locations
      // For now, using placeholder coordinates
      const geocodeLocation = async (location) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
          );
          const data = await response.json();
          if (data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          }
        } catch (err) {
          console.error('Geocoding error:', err);
        }
        return null;
      };

      const loadCoordinates = async () => {
        const current = await geocodeLocation(trip.current_location);
        const pickup = await geocodeLocation(trip.pickup_location);
        const dropoff = await geocodeLocation(trip.dropoff_location);

        if (current && pickup && dropoff) {
          setCoordinates([current, pickup, dropoff]);
        }
      };

      loadCoordinates();
    }
  }, [trip]);

  if (!trip || coordinates.length === 0) {
    return <div className="route-map-placeholder">Loading map...</div>;
  }

  const center = coordinates[1] || coordinates[0];

  return (
    <div className="route-map-container">
      <h3>Route Map</h3>
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {coordinates[0] && (
          <Marker position={coordinates[0]}>
            <Popup>Current: {trip.current_location}</Popup>
          </Marker>
        )}
        {coordinates[1] && (
          <Marker position={coordinates[1]}>
            <Popup>Pickup: {trip.pickup_location}</Popup>
          </Marker>
        )}
        {coordinates[2] && (
          <Marker position={coordinates[2]}>
            <Popup>Dropoff: {trip.dropoff_location}</Popup>
          </Marker>
        )}
        {coordinates.length >= 2 && (
          <Polyline positions={coordinates} color="blue" weight={3} />
        )}
      </MapContainer>
    </div>
  );
};

export default RouteMap;

