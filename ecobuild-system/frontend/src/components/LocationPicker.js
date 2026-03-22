import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function LocationPicker({ onLocationSelect, initialPosition }) {
  const [position, setPosition] = useState(initialPosition || [10.5167, 76.2167]);
  const [address, setAddress] = useState('');

  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        onLocationSelect(e.latlng.lat, e.latlng.lng);
        fetchAddress(e.latlng.lat, e.latlng.lng);
      },
    });

    return position === null ? null : (
      <Marker 
        position={position}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const newPos = marker.getLatLng();
            setPosition([newPos.lat, newPos.lng]);
            onLocationSelect(newPos.lat, newPos.lng);
            fetchAddress(newPos.lat, newPos.lng);
          },
        }}
      />
    );
  }

  const fetchAddress = async (lat, lon) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      setAddress(data.display_name || '');
    } catch (error) {
      console.error('Failed to fetch address:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="h-80 rounded-xl overflow-hidden border border-border">
        <MapContainer 
          center={position} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker />
        </MapContainer>
      </div>
      
      {address && (
        <div className="p-3 bg-background-tertiary rounded-lg">
          <p className="text-sm text-foreground-secondary">Selected Location:</p>
          <p className="text-sm text-foreground font-medium">{address}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-foreground-secondary mb-1">Latitude</label>
          <input 
            type="text" 
            value={position[0].toFixed(6)} 
            readOnly 
            className="input text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-foreground-secondary mb-1">Longitude</label>
          <input 
            type="text" 
            value={position[1].toFixed(6)} 
            readOnly 
            className="input text-sm"
          />
        </div>
      </div>
      
      <p className="text-xs text-foreground-muted text-center">
        Click on the map or drag the marker to select your project location
      </p>
    </div>
  );
}

export default LocationPicker;