import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import API from '../services/api';
import './LogSheets.css';

const LogSheets = ({ tripId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tripId) {
      loadLogs();
    }
  }, [tripId]);

  const loadLogs = async () => {
    try {
      const response = await API.get(`trips/${tripId}/logs/`);
      setLogs(response.data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (logs.length === 0) return;

    const doc = new jsPDF();
    logs.forEach((log, i) => {
      if (i > 0) doc.addPage();
      
      // Add log image
      try {
        const img = new Image();
        img.src = `data:image/png;base64,${log.image}`;
        doc.addImage(img, 'PNG', 10, 10, 190, 100);
      } catch (err) {
        console.error('Error adding image:', err);
        doc.text(`Log for ${log.date}`, 10, 20);
        doc.text(`Miles: ${log.miles}`, 10, 30);
      }
    });
    doc.save('truck-logs.pdf');
  };

  if (loading) {
    return <div className="log-sheets-container">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return <div className="log-sheets-container">No logs available</div>;
  }

  return (
    <div className="log-sheets-container">
      <div className="log-sheets-header">
        <h3>Daily Log Sheets</h3>
        <button onClick={exportToPDF} className="export-btn">
          Export to PDF
        </button>
      </div>
      <div className="logs-grid">
        {logs.map((log) => (
          <div key={log.id} className="log-item">
            <div className="log-date">{log.date}</div>
            <div className="log-miles">{log.miles.toFixed(1)} miles</div>
            <img
              src={`data:image/png;base64,${log.image}`}
              alt={`Log for ${log.date}`}
              className="log-image"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogSheets;

