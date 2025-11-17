import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { FaTruck, FaPlus, FaChartBar, FaHistory, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import Swal from 'sweetalert2';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import LogSheets from './components/LogSheets';
import TripHistory from './components/TripHistory';
import TripDetail from './components/TripDetail';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import LandingPage from './components/LandingPage';
import './App.css';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [refreshTrips, setRefreshTrips] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLandingPage = !localStorage.getItem('token') && location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleTripCreated = (tripData) => {
    setRefreshTrips(prev => prev + 1);
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout?',
      text: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      localStorage.removeItem('token');
      await Swal.fire({
        title: 'Logged out!',
        text: 'You have been successfully logged out.',
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        timer: 1500
      });
      window.location.href = '/login';
    }
  };

  return (
    <div className="app">
      {!isLandingPage && (
        <nav className="navbar">
            <div className="nav-container">
              <Link to="/dashboard" className="nav-logo" onClick={() => setMobileMenuOpen(false)}>
                <FaTruck className="nav-logo-icon" /> 
                <span className="nav-logo-text">Truck Trip Planner</span>
              </Link>
              <button 
                className="mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <FaTimes /> : <FaBars />}
              </button>
              <div className={`nav-links ${mobileMenuOpen ? 'nav-links-open' : ''}`}>
                {localStorage.getItem('token') ? (
                  <>
                    <Link 
                      to="/dashboard" 
                      className={`nav-link ${location.pathname === '/dashboard' || location.pathname.startsWith('/plan-trip') || location.pathname.startsWith('/trips/') ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FaChartBar className="nav-link-icon" />
                      <span>Dashboard</span>
                    </Link>
                    <Link 
                      to="/history" 
                      className={`nav-link ${location.pathname === '/history' ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FaHistory className="nav-link-icon" />
                      <span>History</span>
                    </Link>
                    <button onClick={handleLogout} className="logout-btn">
                      <FaSignOutAlt className="logout-icon" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/login" 
                      className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link 
                      to="/register" 
                      className={`nav-link nav-link-primary ${location.pathname === '/register' ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        )}

        <main className={isLandingPage || isAuthPage ? '' : 'main-content'}>
          <Routes>
            <Route
              path="/"
              element={
                localStorage.getItem('token') ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <LandingPage />
                )
              }
            />
            <Route
              path="/login"
              element={
                localStorage.getItem('token') ? <Navigate to="/dashboard" /> : <Login />
              }
            />
            <Route
              path="/register"
              element={
                localStorage.getItem('token') ? <Navigate to="/dashboard" /> : <Register />
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <div className="dashboard-page">
                    <div className="dashboard-header">
                      <div className="header-content">
                        <h1><FaChartBar /> Dashboard</h1>
                        <p className="dashboard-subtitle">Manage your trips and plan new routes</p>
                      </div>
                      <button 
                        onClick={() => navigate('/plan-trip')}
                        className="btn-add-trip"
                      >
                        <FaPlus /> Plan New Trip
                      </button>
                    </div>
                    
                    <TripHistory refreshTrigger={refreshTrips} />
                  </div>
                </PrivateRoute>
              }
            />
            <Route
              path="/plan-trip"
              element={
                <PrivateRoute>
                  <div className="plan-trip-page">
                    <TripForm onTripCreated={handleTripCreated} />
                  </div>
                </PrivateRoute>
              }
            />
            <Route
              path="/trips/:id"
              element={
                <PrivateRoute>
                  <TripDetail />
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
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;

