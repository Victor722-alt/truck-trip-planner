import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import './ItineraryMap.css';

// Fix for default marker icons
if (typeof window !== 'undefined' && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.0/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.0/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.0/dist/images/marker-shadow.png',
  });
}

// Custom marker icons
const createCustomIcon = (color, number, label) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin" style="background-color: ${color};">
        <span class="marker-number">${number}</span>
      </div>
      <div class="marker-label">${label}</div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
  });
};

// Component to fit map bounds
function MapBounds({ coordinates }) {
  const map = useMap();
  
  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);
  
  return null;
}

// Component to get route geometry from OpenRouteService with economical routing
function RouteLine({ coordinates, apiKey }) {
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (coordinates.length < 2) {
      setRouteGeometry(null);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      try {
        // Always try to use OpenRouteService for actual road routes
        // If no API key, we'll use OSRM (free alternative) or fallback
        if (apiKey && apiKey !== 'your_ors_key_here') {
          const coords = coordinates.map(coord => [coord[1], coord[0]]); // [lon, lat]
          const response = await fetch(
            `https://api.openrouteservice.org/v2/directions/driving-car`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                coordinates: coords,
                format: 'geojson',
                preference: 'fastest', // 'fastest' is typically most economical for fuel
                geometry: true,
              }),
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.features && data.features[0]) {
              const geometry = data.features[0].geometry.coordinates;
              // Convert [lon, lat] to [lat, lon]
              const routeCoords = geometry.map(coord => [coord[1], coord[0]]);
              setRouteGeometry(routeCoords);
              setLoading(false);
              return;
            }
          }
        }
        
        // Try OSRM (free, open-source routing) as fallback
        try {
          const coords = coordinates.map(coord => `${coord[1]},${coord[0]}`).join(';');
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.code === 'Ok' && data.routes && data.routes[0]) {
              const geometry = data.routes[0].geometry.coordinates;
              const routeCoords = geometry.map(coord => [coord[1], coord[0]]);
              setRouteGeometry(routeCoords);
              setLoading(false);
              return;
            }
          }
        } catch (osrmError) {
          console.log('OSRM routing not available, using straight line');
        }
        
        // Final fallback to straight line
        setRouteGeometry(coordinates);
      } catch (err) {
        console.error('Route fetching error:', err);
        setRouteGeometry(coordinates);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [coordinates, apiKey]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!routeGeometry || routeGeometry.length < 2) {
    return null;
  }

  return (
    <Polyline
      positions={routeGeometry}
      color="#ff6b35"
      weight={5}
      opacity={0.8}
      dashArray="10, 5"
    />
  );
}

const ItineraryMap = ({ locations, height = '500px' }) => {
  const [coordinates, setCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geocodeLocation = async (location) => {
      if (!location || location.trim() === '') return null;
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
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
      setLoading(true);
      const coords = [];
      
      if (locations.current_location) {
        const coord = await geocodeLocation(locations.current_location);
        if (coord) coords.push({ coord, label: 'Current', number: 1, color: '#3b82f6' });
      }
      
      if (locations.pickup_location) {
        const coord = await geocodeLocation(locations.pickup_location);
        if (coord) coords.push({ coord, label: 'Pickup', number: 2, color: '#10b981' });
      }
      
      if (locations.dropoff_location) {
        const coord = await geocodeLocation(locations.dropoff_location);
        if (coord) coords.push({ coord, label: 'Dropoff', number: 3, color: '#ef4444' });
      }
      
      setCoordinates(coords);
      setLoading(false);
    };

    loadCoordinates();
  }, [locations]);

  // Show map as soon as we have at least one location
  if (coordinates.length === 0 && loading) {
    return (
      <div className="itinerary-map-container" style={{ height }}>
        <div className="map-loading">Loading map...</div>
      </div>
    );
  }

  // If no coordinates after loading, show placeholder only if no locations provided
  if (coordinates.length === 0 && !loading) {
    const hasAnyLocation = locations.current_location || locations.pickup_location || locations.dropoff_location;
    if (!hasAnyLocation) {
      return (
        <div className="itinerary-map-container" style={{ height }}>
          <div className="map-placeholder">
            <p>Add locations to see your itinerary on the map</p>
          </div>
        </div>
      );
    }
    // If locations provided but geocoding failed, still show map centered
    return (
      <div className="itinerary-map-container" style={{ height }}>
        <MapContainer
          center={[39.8283, -98.5795]}
          zoom={4}
          style={{ height: '100%', width: '100%', borderRadius: '12px' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <div className="map-loading-overlay">
            <p>Geocoding locations...</p>
          </div>
        </MapContainer>
      </div>
    );
  }

  const allCoords = coordinates.map(item => item.coord);
  // Center on first coordinate if only one, or middle if multiple
  const center = allCoords.length > 0 
    ? (allCoords.length === 1 ? allCoords[0] : allCoords[Math.floor(allCoords.length / 2)])
    : [39.8283, -98.5795];
  
  // Default zoom based on number of points
  const defaultZoom = allCoords.length === 1 ? 10 : 6;
  
  const orsApiKey = process.env.REACT_APP_ORS_API_KEY || '';

  return (
    <div className="itinerary-map-container" style={{ height }}>
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {allCoords.length > 1 && <MapBounds coordinates={allCoords} />}
        
        {/* Route line - show when we have 2+ locations */}
        {allCoords.length >= 2 && (
          <RouteLine coordinates={allCoords} apiKey={orsApiKey} />
        )}
        
        {/* Markers - show all available locations */}
        {coordinates.map((item, index) => (
          <Marker
            key={index}
            position={item.coord}
            icon={createCustomIcon(item.color, item.number, item.label)}
          >
            <Popup>
              <strong>{item.label}:</strong><br />
              {item.label === 'Current' && locations.current_location}
              {item.label === 'Pickup' && locations.pickup_location}
              {item.label === 'Dropoff' && locations.dropoff_location}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ItineraryMap;

