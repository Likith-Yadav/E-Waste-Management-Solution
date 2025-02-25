import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Create custom marker icons
const giveIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const takeIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface MarketplaceItem {
  id: string;
  title: string;
  type: 'give' | 'take';
  price: number | 'free';
  location: Location;
  status: 'available' | 'pending' | 'completed';
}

interface MarketplaceMapProps {
  items: MarketplaceItem[];
  center?: { lat: number; lng: number };
}

const defaultCenter = { lat: 13.7563, lng: 100.5018 }; // Bangkok coordinates

// Component to handle map center updates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function MarketplaceMap({ items, center = defaultCenter }: MarketplaceMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([center.lat, center.lng]);
  const mapRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  console.log('Received items:', items); // Debug log

  // Filter valid items
  const validItems = items.filter(item => {
    const hasValidLocation = item.location 
      && typeof item.location.lat === 'number' 
      && typeof item.location.lng === 'number'
      && !isNaN(item.location.lat) 
      && !isNaN(item.location.lng)
      && item.location.lat !== 0 
      && item.location.lng !== 0;

    if (!hasValidLocation) {
      console.warn('Invalid location for item:', item);
    }
    return hasValidLocation;
  });

  console.log('Valid items:', validItems); // Debug log

  useEffect(() => {
    // Get user's location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          // If geolocation fails and we have valid items, center on first item
          if (validItems.length > 0) {
            setMapCenter([validItems[0].location.lat, validItems[0].location.lng]);
          }
        }
      );
    }
  }, [validItems]);

  return (
    <div className="h-[500px] rounded-lg overflow-hidden relative">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        ref={mapRef}
      >
        <MapUpdater center={mapCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validItems.length > 0 && validItems.map((item) => (
          <Marker
            key={item.id}
            position={[item.location.lat, item.location.lng]}
            icon={item.type === 'give' ? giveIcon : takeIcon}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-medium text-lg">{item.title}</h3>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  item.type === 'give' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {item.type === 'give' ? 'Giving Away' : 'Looking For'}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Price: {item.price === 'free' ? 'Free' : `$${item.price}`}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Location: {item.location.address}
                </p>
                <button
                  onClick={() => navigate(`/marketplace/item/${item.id}`)}
                  className="mt-3 w-full px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {validItems.length > 0 && (
        <button
          onClick={() => {
            if (mapRef.current && validItems.length > 0) {
              if (validItems.length === 1) {
                // For single item, center and zoom
                mapRef.current.setView(
                  [validItems[0].location.lat, validItems[0].location.lng],
                  13
                );
              } else {
                // For multiple items, use bounds
                const bounds = L.latLngBounds(
                  validItems.map(item => [item.location.lat, item.location.lng])
                );
                mapRef.current.fitBounds(bounds, { padding: [50, 50] });
              }
            }
          }}
          className="absolute bottom-4 right-4 z-[1000] bg-white p-2 rounded-lg shadow-md hover:bg-gray-100"
        >
          Show All Markers
        </button>
      )}
    </div>
  );
} 