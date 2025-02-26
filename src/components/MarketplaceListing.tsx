import { useState, useEffect } from 'react';
import { useWasteStore } from '../store/wasteStore';
import { convertToMarketplaceItem, getUserWasteData, getUserLocation } from '../services/firebaseService';
import { Loader2, Check, MapPin } from 'lucide-react';
import { useUser } from "@clerk/clerk-react";
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { updateDoc } from 'firebase/firestore';

type ListingType = 'give' | 'take';
type Condition = 'new' | 'good' | 'fair' | 'poor';
type Price = 'free' | number;

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface ListingInfo {
  title: string;
  condition: Condition;
  type: ListingType;
  price: Price;
  description: string;
  location: Location;
  contact: {
    email: string;
    phone: string;
  };
  category: string;
}

interface DetectedItem {
  type: string;
  confidence: number;
}

interface DetectedItemWithDate extends DetectedItem {
  category: string;
  detectedAt: Date;
}

export function MarketplaceListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [userDetectedItems, setUserDetectedItems] = useState<DetectedItemWithDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [listingInfo, setListingInfo] = useState<ListingInfo>({
    title: '',
    condition: 'good',
    type: 'give',
    price: 'free',
    description: '',
    location: {
      lat: 0,
      lng: 0,
      address: ''
    },
    contact: {
      email: '',
      phone: ''
    },
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const detectedItems = useWasteStore((state) => state.detectedItems);
  const [userLocation, setUserLocation] = useState<Location>({
    lat: 0,
    lng: 0,
    address: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(false);

  useEffect(() => {
    const loadUserItems = async () => {
      if (!user) return;
      
      try {
        const wasteData = await getUserWasteData(user.id);
        const items = wasteData.flatMap(data => {
          const timestamp = new Date((data.timestamp?.seconds || 0) * 1000);
          return Object.entries(data.detectedItems).flatMap(([category, items]) =>
            (items as DetectedItem[]).map(item => ({
              ...item,
              category,
              detectedAt: timestamp
            }))
          );
        });
        setUserDetectedItems(items);
      } catch (error) {
        console.error('Error loading user items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserItems();
  }, [user]);

  useEffect(() => {
    // Get user's location when component mounts
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          // Get address from coordinates using OpenStreetMap Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
          );
          const data = await response.json();
          
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: data.display_name || ''
          };
          
          setUserLocation(location);
          setListingInfo(prev => ({
            ...prev,
            location: location
          }));
        } catch (error) {
          console.error('Error getting location:', error);
        }
      });
    }
  }, []);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return; // Exit if no ID (create mode)
      if (!user) {
        navigate('/login'); // Redirect to login if no user
        return;
      }
      
      setIsLoadingListing(true);
      try {
        const listingRef = doc(db, 'marketplace', id);
        const listingDoc = await getDoc(listingRef);
        
        if (!listingDoc.exists()) {
          console.error('Listing not found');
          navigate('/marketplace');
          return;
        }

        const listingData = listingDoc.data();
        
        // Check if user owns this listing
        if (listingData.userId !== user.id) {
          console.error('Unauthorized access');
          navigate('/marketplace');
          return;
        }

        setIsEditing(true);
        setListingInfo({
          title: listingData.title || '',
          condition: listingData.condition || 'good',
          type: listingData.type || 'give',
          price: listingData.price || 'free',
          description: listingData.description || '',
          location: listingData.location || {
            lat: 0,
            lng: 0,
            address: ''
          },
          contact: listingData.contact || {
            email: '',
            phone: ''
          },
          category: listingData.category || ''
        });
      } catch (error) {
        console.error('Error fetching listing:', error);
        navigate('/marketplace');
      } finally {
        setIsLoadingListing(false);
      }
    };

    fetchListing();
  }, [id, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && id) {
        // Update existing listing
        const listingRef = doc(db, 'marketplace', id);
        await updateDoc(listingRef, {
          title: listingInfo.title,
          condition: listingInfo.condition,
          type: listingInfo.type,
          price: listingInfo.price,
          description: listingInfo.description,
          location: listingInfo.location,
          contact: listingInfo.contact,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new listing
        if (!selectedItem) {
          throw new Error('No item selected');
        }

        const item = userDetectedItems.find(i => i.type === selectedItem);
        if (!item) {
          throw new Error('Selected item not found');
        }

        await convertToMarketplaceItem(item, {
          ...listingInfo,
          userId: user.id,
          contact: {
            email: user.primaryEmailAddress?.emailAddress || listingInfo.contact.email,
            phone: listingInfo.contact.phone
          }
        });
      }

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/marketplace');
      }, 2000);
    } catch (error) {
      console.error('Error saving listing:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as ListingType;
    setListingInfo(prev => ({
      ...prev,
      type: newType
    }));
  };

  const handleConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCondition = e.target.value as Condition;
    setListingInfo(prev => ({
      ...prev,
      condition: newCondition
    }));
  };

  const handlePriceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const isPaid = e.target.value === 'paid';
    setListingInfo(prev => ({
      ...prev,
      price: isPaid ? 0 : 'free'
    }));
  };

  const handlePriceValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setListingInfo(prev => ({
      ...prev,
      price: value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? 'Edit Marketplace Listing' : 'Create Marketplace Listing'}
      </h2>
      
      {isLoadingListing ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : showSuccess ? (
        <div className="flex items-center justify-center p-8 bg-green-50 rounded-lg">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-green-600">Listing Created Successfully!</h3>
            <p className="mt-2 text-sm text-gray-500">
              Your item has been listed in the marketplace.
            </p>
            <div className="mt-4">
              <button
                onClick={() => navigate('/marketplace')}
                className="text-sm font-medium text-green-600 hover:text-green-500"
              >
                View Listings
              </button>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : userDetectedItems.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No detected items found.</p>
          <p className="text-sm text-gray-500 mt-2">
            Use the detection feature to identify items first.
          </p>
          <button
            onClick={() => navigate('/detection')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go to Detection
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Detected Item</label>
              <select
                required
                value={selectedItem || ''}
                onChange={(e) => {
                  setSelectedItem(e.target.value);
                  const item = userDetectedItems.find(i => i.type === e.target.value);
                  if (item) {
                    setListingInfo(prev => ({
                      ...prev,
                      title: `${item.type} for ${prev.type === 'give' ? 'giving away' : 'taking'}`,
                      category: item.category
                    }));
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select an item</option>
                {userDetectedItems.map((item, index) => (
                  <option key={index} value={item.type}>
                    {item.type} - Detected on {item.detectedAt.toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4">
            {Object.entries(
              userDetectedItems.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {} as Record<string, typeof userDetectedItems>)
            ).map(([category, items]) => (
              <div key={category} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium capitalize mb-2">{category}</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  {items.map((item, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{item.type}</span>
                      <span>{item.detectedAt.toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              required
              type="text"
              value={listingInfo.title}
              onChange={(e) => setListingInfo(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter listing title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              required
              value={listingInfo.description}
              onChange={(e) => setListingInfo(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              placeholder="Describe your item"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Condition</label>
              <select
                required
                value={listingInfo.condition}
                onChange={handleConditionChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                required
                value={listingInfo.type}
                onChange={handleTypeChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="give">Giving Away</option>
                <option value="take">Looking For</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Price</label>
            <select
              required
              value={listingInfo.price === 'free' ? 'free' : 'paid'}
              onChange={handlePriceTypeChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="free">Free</option>
              <option value="paid">Paid (₹)</option>
            </select>
            {listingInfo.price !== 'free' && (
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  min="0"
                  value={typeof listingInfo.price === 'number' ? listingInfo.price : ''}
                  onChange={handlePriceValueChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-8"
                  placeholder="Enter price in Rupees"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <div className="mt-1 relative">
              <input
                required
                type="text"
                value={listingInfo.location.address}
                onChange={(e) => setListingInfo(prev => ({
                  ...prev,
                  location: { ...prev.location, address: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your location"
              />
              <button
                type="button"
                onClick={() => {
                  getUserLocation().then(location => {
                    setUserLocation(prevState => ({ ...prevState, ...location }));
                    setListingInfo(prev => ({
                      ...prev,
                      location: location
                    }));
                  });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <MapPin className="w-5 h-5 text-gray-400 hover:text-blue-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                required
                type="email"
                value={listingInfo.contact.email}
                onChange={(e) => setListingInfo(prev => ({ 
                  ...prev, 
                  contact: { ...prev.contact, email: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone (Optional)</label>
              <input
                type="tel"
                value={listingInfo.contact.phone}
                onChange={(e) => setListingInfo(prev => ({ 
                  ...prev, 
                  contact: { ...prev.contact, phone: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 
                     disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditing ? 'Update Listing' : 'Create Listing'
            )}
          </button>
        </form>
      )}
    </div>
  );
} 