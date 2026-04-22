import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// For leaflet.heat to work in typical bundler setups:
window.L = L;
import 'leaflet.heat';

const mockFraudPoints = [
  // Lima coordinates: [lat, lng, intensity]
  [-12.0464, -77.0428, 0.9],
  [-12.0564, -77.0528, 0.6],
  [-12.0364, -77.0628, 0.7],
  [-12.0764, -77.0228, 0.8],
  [-12.0864, -77.0128, 0.5],
  [-12.0964, -77.0328, 0.9],
  [-12.1064, -77.0428, 0.4],
  [-12.0414, -77.0328, 0.8],
  [-12.0514, -77.0228, 0.7],
  [-12.0614, -77.0128, 0.6],
  [-12.0814, -77.0528, 1.0],
];

const HeatmapLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !L.heatLayer) return;

    const heat = L.heatLayer(points, {
      radius: 20,
      blur: 15,
      maxZoom: 15,
      gradient: {
        0.2: 'rgba(34, 211, 238, 0.5)',   // cyan
        0.5: 'rgba(245, 158, 11, 0.7)',   // amber/warning
        0.8: 'rgba(239, 68, 68, 0.9)',    // red/danger
        1.0: 'rgba(255, 0, 0, 1)'         // pure red
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
};

const FraudHeatmap = () => {
  return (
    <div className="map-wrapper" style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <MapContainer 
        center={[-12.0664, -77.0328]} 
        zoom={12} 
        style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />
        <HeatmapLayer points={mockFraudPoints} />
      </MapContainer>
    </div>
  );
};

export default FraudHeatmap;
