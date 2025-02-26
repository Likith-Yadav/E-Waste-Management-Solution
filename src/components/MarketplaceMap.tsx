import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useUser } from "@clerk/clerk-react";
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

// Update all icon definitions at the top
const giveIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

const takeIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

const multipleIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

const meetingPointIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

const customIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
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
  userId?: string;
}

interface MeetingPoint {
  name: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
  distance: number;
}

interface PrivateMeetingPoint extends MeetingPoint {
  createdBy: string;
  forItem: string;
  isPrivate: true;
}

interface MeetingRequest {
  id: string;
  itemId: string;
  itemTitle: string;
  ownerId: string;
  requesterId: string;
  requesterEmail: string;
  meetingPoint: MeetingPoint;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface StoredMeetingPoint extends MeetingPoint {
  id: string;
  itemId: string;
  ownerId: string;
  createdBy: string;
  createdAt: string;
  userEmail: string;
}

interface MarketplaceMapProps {
  items: MarketplaceItem[];
  center?: { lat: number; lng: number };
}

const defaultCenter = { lat: 13.7563, lng: 100.5018 }; // Bangkok coordinates

// Group items by location
function groupItemsByLocation(items: MarketplaceItem[]) {
  const groups = new Map<string, MarketplaceItem[]>();
  
  items.forEach(item => {
    const key = `${item.location.lat},${item.location.lng}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)?.push(item);
  });
  
  return groups;
}

// Update the fetchNearbyMeetingPoints function to get more relevant places
async function fetchNearbyMeetingPoints(lat: number, lng: number): Promise<MeetingPoint[]> {
  try {
    // Fetch different types of safe meeting places
    const placeTypes = [
      'mall', 'cafe', 'police', 'library', 'restaurant', 
      'coffee_shop', 'bank', 'post_office', 'supermarket'
    ];
    
    const radius = 2000; // 2km radius for more options
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `limit=10&` +
      `q=${placeTypes.join(' OR ')}&` +
      `lat=${lat}&` +
      `lon=${lng}&` +
      `radius=${radius}`
    );
    
    const data = await response.json();
    return data
      .map((place: any) => ({
        name: place.display_name.split(',')[0], // Get only the place name
        type: place.type,
        category: place.category || 'public place',
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        distance: Math.round(parseInt(place.distance))
      }))
      .filter((place: MeetingPoint) => place.distance <= radius); // Ensure within radius
  } catch (error) {
    console.error('Error fetching meeting points:', error);
    return [];
  }
}

// Add this helper function at the top of the file
function calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.lat * Math.PI/180;
  const φ2 = point2.lat * Math.PI/180;
  const Δφ = (point2.lat-point1.lat) * Math.PI/180;
  const Δλ = (point2.lng-point1.lng) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Add this component inside MarketplaceMap but before the return statement
function MapEventHandler({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

export function MarketplaceMap({ items, center = defaultCenter }: MarketplaceMapProps) {
  const [mapCenter] = useState<[number, number]>([center.lat, center.lng]);
  const mapRef = useRef<L.Map | null>(null);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showMeetingPoints, setShowMeetingPoints] = useState(false);
  const [isLoadingMeetingPoints, setIsLoadingMeetingPoints] = useState(false);
  const [isAddingMeetingPoint, setIsAddingMeetingPoint] = useState(false);
  const [storedMeetingPoints, setStoredMeetingPoints] = useState<StoredMeetingPoint[]>([]);
  const [meetingPointCounts, setMeetingPointCounts] = useState<Record<string, number>>({});
  const { user } = useUser();

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

  // Group items by location
  const groupedItems = groupItemsByLocation(validItems);

  // Add function to fetch stored meeting points
  const fetchStoredMeetingPoints = async (itemId: string) => {
    if (!user) return;
    
    try {
      const meetingPointsQuery = query(
        collection(db, 'meetingPoints'),
        where('itemId', '==', itemId)
      );
      
      const snapshot = await getDocs(meetingPointsQuery);
      const points = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StoredMeetingPoint[];
      
      setStoredMeetingPoints(points);
    } catch (error) {
      console.error('Error fetching stored meeting points:', error);
    }
  };

  // Update handleShowMeetingPoints
  const handleShowMeetingPoints = async (item: MarketplaceItem) => {
    setSelectedItem(item);
    setShowMeetingPoints(true);
    setIsLoadingMeetingPoints(true);
    
    try {
      await fetchStoredMeetingPoints(item.id);
      
      if (mapRef.current) {
        mapRef.current.setView([item.location.lat, item.location.lng], 14);
      }
    } catch (error) {
      console.error('Error loading meeting points:', error);
      alert('Failed to load meeting points. Please try again.');
    } finally {
      setIsLoadingMeetingPoints(false);
    }
  };

  // Update the handleMapClick function
  const handleMapClick = async (e: L.LeafletMouseEvent) => {
    if (!isAddingMeetingPoint || !selectedItem || !user) return;

    // Don't allow owner to add meeting points
    if (user.id === selectedItem.userId) {
      alert("Item owners cannot suggest meeting points. Wait for interested users to suggest locations.");
      setIsAddingMeetingPoint(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`
      );
      const data = await response.json();

      const newPoint: Omit<StoredMeetingPoint, 'id'> = {
        name: data.display_name.split(',')[0],
        type: 'custom',
        category: 'Custom Meeting Point',
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        distance: 0,
        itemId: selectedItem.id,
        ownerId: selectedItem.userId!,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        userEmail: user.emailAddresses[0].emailAddress
      };

      const docRef = await addDoc(collection(db, 'meetingPoints'), newPoint);
      setStoredMeetingPoints([...storedMeetingPoints, { ...newPoint, id: docRef.id }]);
      setIsAddingMeetingPoint(false);
    } catch (error) {
      console.error('Error creating custom meeting point:', error);
      alert('Failed to create custom meeting point. Please try again.');
    }
  };

  // Add this function to fetch meeting point counts for owners
  const fetchMeetingPointCounts = async (itemIds: string[]) => {
    if (!user) return;
    
    try {
      const counts: Record<string, number> = {};
      
      for (const itemId of itemIds) {
        const meetingPointsQuery = query(
          collection(db, 'meetingPoints'),
          where('itemId', '==', itemId),
          where('ownerId', '==', user.id)
        );
        
        const snapshot = await getDocs(meetingPointsQuery);
        counts[itemId] = snapshot.docs.length;
      }
      
      setMeetingPointCounts(counts);
    } catch (error) {
      console.error('Error fetching meeting point counts:', error);
    }
  };

  // Add this effect to fetch counts when items change
  useEffect(() => {
    const ownerItems = items.filter(item => item.userId === user?.id);
    if (ownerItems.length > 0) {
      fetchMeetingPointCounts(ownerItems.map(item => item.id));
    }
  }, [items, user]);

  return (
    <div className="h-[500px] rounded-lg overflow-hidden relative">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        ref={mapRef}
      >
        <MapEventHandler onMapClick={handleMapClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Existing markers */}
        {Array.from(groupedItems.entries()).map(([locationKey, locationItems]) => {
          const [lat, lng] = locationKey.split(',').map(Number);
          return (
            <Marker
              key={locationKey}
              position={[lat, lng]}
              icon={locationItems.length > 1 ? multipleIcon : (locationItems[0].type === 'give' ? giveIcon : takeIcon)}
            >
              <Popup>
                <div className="p-2 max-h-[300px] overflow-y-auto">
                  {locationItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={`min-w-[200px] ${index > 0 ? 'mt-4 pt-4 border-t' : ''}`}
                    >
                      <h3 className="font-medium text-lg">{item.title}</h3>
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        item.type === 'give' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.type === 'give' ? 'Giving Away' : 'Looking For'}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Price: {item.price === 'free' ? 'Free' : `₹${item.price}`}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Location: {item.location.address}
                      </p>
                      <div className="flex gap-2 mt-3">
                        {item.type === 'give' && (
                          <>
                            <button
                              onClick={() => handleShowMeetingPoints(item)}
                              className="w-full px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm relative"
                            >
                              Meeting Points
                              {user?.id === item.userId && meetingPointCounts[item.id] > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                  {meetingPointCounts[item.id]}
                                </span>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Show stored meeting points */}
        {showMeetingPoints && storedMeetingPoints.map((point, index) => {
          const isOwner = user?.id === selectedItem?.userId;
          const shouldShow = isOwner 
            ? user?.id !== point.createdBy  // If owner, show points created by others
            : user?.id === point.createdBy; // If not owner, show own points

          if (shouldShow) {
            return (
              <Marker
                key={`stored-meeting-${index}`}
                position={[point.lat, point.lng]}
                icon={meetingPointIcon}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-medium text-lg mb-2">{point.name}</h3>
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          {isOwner ? 'Suggested Meeting Point' : 'Your Suggested Meeting Point'}
                        </span>
                        {isOwner && (
                          <span className="text-xs text-gray-600">
                            Suggested by: {point.userEmail}
                          </span>
                        )}
                      </div>
                      {selectedItem && (
                        <p className="text-sm text-gray-600">
                          Distance from item: {
                            (() => {
                              const distance = calculateDistance(
                                { lat: point.lat, lng: point.lng },
                                selectedItem.location
                              );
                              return distance < 1000 
                                ? `${Math.round(distance)}m` 
                                : `${(distance/1000).toFixed(1)}km`;
                            })()
                          }
                        </p>
                      )}
                      <button
                        onClick={() => {
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`,
                            '_blank'
                          );
                        }}
                        className="w-full px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                      >
                        View on Google Maps
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          }
          return null;
        })}
      </MapContainer>

      {/* Add custom meeting point button */}
      {showMeetingPoints && selectedItem && user?.id !== selectedItem.userId && (
        <div className="absolute bottom-20 right-4 z-[1000] flex gap-2">
          <button
            onClick={() => setIsAddingMeetingPoint(!isAddingMeetingPoint)}
            className={`bg-white p-2 rounded-lg shadow-md hover:bg-gray-100 ${
              isAddingMeetingPoint ? 'bg-yellow-100' : ''
            }`}
          >
            {isAddingMeetingPoint ? 'Click on map to add meeting point' : 'Add Custom Meeting Point'}
          </button>
        </div>
      )}

      {/* Existing controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
        {showMeetingPoints && (
          <button
            onClick={() => {
              setShowMeetingPoints(false);
              setIsAddingMeetingPoint(false);
            }}
            className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-100"
          >
            Hide Meeting Points
          </button>
        )}
        
        {validItems.length > 0 && (
          <button
            onClick={() => {
              if (mapRef.current && validItems.length > 0) {
                if (validItems.length === 1) {
                  mapRef.current.setView(
                    [validItems[0].location.lat, validItems[0].location.lng] as [number, number],
                    13
                  );
                } else {
                  // Fix the bounds creation here too
                  const locations: [number, number][] = validItems.map(item => 
                    [item.location.lat, item.location.lng] as [number, number]
                  );
                  const bounds = L.latLngBounds(locations);
                  mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                }
              }
            }}
            className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-100"
          >
            Show All Markers
          </button>
        )}
      </div>

      {/* Add a legend to show what the different markers mean */}
      <div className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded-lg shadow-md">
        <div className="text-sm font-medium mb-2">Map Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-xs">Giving Away</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-xs">Looking For</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-xs">Multiple Items</span>
          </div>
          {showMeetingPoints && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              <span className="text-xs">Meeting Points</span>
            </div>
          )}
        </div>
      </div>

      {/* Add a loading state for meeting points */}
      {isLoadingMeetingPoints && (
        <div className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded-lg shadow-md">
          <div className="text-sm font-medium mb-2">Loading meeting points...</div>
        </div>
      )}
    </div>
  );
} 