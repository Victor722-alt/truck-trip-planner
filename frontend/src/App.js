import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import LogSheets from './components/LogSheets';
import TripHistory from './components/TripHistory';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import './App.css';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const App = () => {
  const [currentTrip, setCurrentTrip] = useState(null);

  const handleTripCreated = (tripData) => {
    setCurrentTrip(tripData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              Truck Trip Planner
            </Link>
            <div className="nav-links">
              {localStorage.getItem('token') ? (
                <>
                  <Link to="/">Home</Link>
                  <Link to="/history">History</Link>
                  <button onClick={handleLogout} className="logout-btn">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login">Login</Link>
                  <Link to="/register">Register</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route
              path="/login"
              element={
                localStorage.getItem('token') ? <Navigate to="/" /> : <Login />
              }
            />
            <Route
              path="/register"
              element={
                localStorage.getItem('token') ? <Navigate to="/" /> : <Register />
              }
            />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <div className="home-page">
                    <TripForm onTripCreated={handleTripCreated} />
                    {currentTrip && (
                      <>
                        <div className="trip-summary">
                          <h2>Trip Summary</h2>
                          <p>
                            <strong>Total Distance:</strong>{' '}
                            {currentTrip.total_distance?.toFixed(1) || 'N/A'} miles
                          </p>
                          <p>
                            <strong>Estimated Days:</strong> {currentTrip.estimated_days || 'N/A'}
                          </p>
                        </div>
                        <RouteMap trip={currentTrip} />
                        {currentTrip.id && <LogSheets tripId={currentTrip.id} />}
                      </>
                    )}
                  </div>
                </PrivateRoute>
              }
            />
            <Route
              path="/history"
              element={
                <PrivateRoute>
                  <TripHistory />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;

