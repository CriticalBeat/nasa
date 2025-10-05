"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function WeatherMap({ coords, setCoords }) {
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lon: lng });
      },
    });
    return null;
  }

  if (!coords) return <p className="text-center p-4">Loading map...</p>;

  return (
    <div className="h-96 mb-6 border rounded overflow-hidden">
      <MapContainer
        center={[coords.lat, coords.lon]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[coords.lat, coords.lon]} icon={markerIcon} />
        <MapClickHandler />
      </MapContainer>
    </div>
  );
}
