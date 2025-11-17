import React from 'react';
import { Link } from 'react-router-dom';
import { FaTruck, FaRoute, FaClock, FaClipboardList, FaChartBar, FaLock, FaBolt } from 'react-icons/fa';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo"><FaTruck /> Truck Trip Planner</div>
          <div className="nav-links">
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link nav-link-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Plan Your Truck Trips
            <span className="hero-title-accent"> with Confidence</span>
          </h1>
          <p className="hero-subtitle">
            Streamline your logistics with intelligent trip planning, HOS compliance tracking, 
            and automated log sheet generation. Save time and stay compliant.
          </p>
          <div className="hero-cta">
            <Link to="/register" className="btn btn-primary btn-large">
              Start Planning Free
            </Link>
            <Link to="/login" className="btn btn-secondary btn-large">
              Sign In
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-illustration">
            <div className="truck-icon"><FaTruck /></div>
            <div className="route-lines">
              <div className="route-line"></div>
              <div className="route-line"></div>
              <div className="route-line"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="section-title">Everything You Need</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><FaRoute /></div>
              <h3>Route Planning</h3>
              <p>Plan optimal routes with real-time distance calculations and route visualization on interactive maps.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaClock /></div>
              <h3>HOS Compliance</h3>
              <p>Automatic Hours of Service calculations ensure you stay compliant with DOT regulations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaClipboardList /></div>
              <h3>Log Sheets</h3>
              <p>Auto-generated daily log sheets for each trip day. Export to PDF for easy record keeping.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaChartBar /></div>
              <h3>Trip History</h3>
              <p>Track all your trips in one place. Review past routes and log sheets anytime.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaLock /></div>
              <h3>Secure & Private</h3>
              <p>Your data is encrypted and secure. We never share your trip information.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaBolt /></div>
              <h3>Fast & Reliable</h3>
              <p>Lightning-fast trip planning. Get your route and log sheets in seconds.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Enter Your Trip Details</h3>
              <p>Input your current location, pickup, and dropoff locations along with your current cycle hours.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Get Your Route Plan</h3>
              <p>Our system calculates the optimal route, distance, and estimated travel time with HOS compliance.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Review Log Sheets</h3>
              <p>Automatically generated daily log sheets for each day of your trip. Export to PDF when ready.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of drivers and fleet managers who trust Truck Trip Planner</p>
          <Link to="/register" className="btn btn-primary btn-large">
            Create Free Account
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2024 Truck Trip Planner. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

