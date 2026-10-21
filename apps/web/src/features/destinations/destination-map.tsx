import 'leaflet/dist/leaflet.css';
import type { DestinationSummary } from '@smart-tourism/contracts';
import { useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router';

const INDIA_CENTER: [number, number] = [22.5, 82.5];

interface Props {
  destinations: Pick<DestinationSummary, 'slug' | 'name' | 'state' | 'latitude' | 'longitude'>[];
  /** Zoom on a single destination instead of fitting all of India. */
  focus?: { latitude: number; longitude: number };
  className?: string;
}

/**
 * OpenStreetMap map with circle markers (no image icons to break).
 * Loaded lazily so Leaflet is not part of the main bundle.
 */
export default function DestinationMap({ destinations, focus, className }: Props) {
  const center = useMemo<[number, number]>(
    () => (focus ? [focus.latitude, focus.longitude] : INDIA_CENTER),
    [focus],
  );

  return (
    <MapContainer
      center={center}
      zoom={focus ? 9 : 4}
      scrollWheelZoom={false}
      className={className}
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {destinations.map((d) => (
        <CircleMarker
          key={d.slug}
          center={[d.latitude, d.longitude]}
          radius={8}
          pathOptions={{ color: '#1f4d3a', fillColor: '#c0694a', fillOpacity: 0.9, weight: 2 }}
        >
          <Popup>
            <Link to={`/destinations/${d.slug}`} className="font-medium text-forest-800">
              {d.name}
            </Link>
            <br />
            {d.state}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
