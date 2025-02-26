import { useEffect, useState } from 'react';
import { ShoppingBag, Tag, Search, Filter, MapPin, Clock, Mail, Phone, Edit, Trash2 } from 'lucide-react';
import { useUser } from "@clerk/clerk-react";
import { updateMarketplaceItemStatus, deleteMarketplaceItem } from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebaseService';
import { MarketplaceMap } from './MarketplaceMap';

interface MarketplaceItem {
  id: string;
  title: string;
  category: string;
  condition: string;
  type: 'give' | 'take';
  price: number | 'free';
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  createdAt: any;
  contact: {
    email: string;
    phone?: string;
  };
  status: 'available' | 'pending' | 'completed';
  userId: string;
}

interface Filters {
  category: string;
  type: string;
  priceRange: string;
  condition: string;
  location: string;
}

interface ContactModalProps {
  item: MarketplaceItem;
  onClose: () => void;
  onStatusUpdate: (itemId: string, newStatus: 'pending' | 'completed' | 'available') => void;
}

interface OwnerActionsModalProps {
  item: MarketplaceItem;
  onClose: () => void;
  onDelete: (itemId: string) => void;
  onStatusUpdate: (itemId: string, newStatus: 'pending' | 'completed' | 'available') => void;
}

function ContactModal({ item, onClose, onStatusUpdate }: ContactModalProps) {
  const { user } = useUser();
  const [showContactInfo, setShowContactInfo] = useState(false);

  const handleStatusUpdate = async (newStatus: 'pending' | 'completed' | 'available') => {
    try {
      await updateMarketplaceItemStatus(item.id, newStatus);
      onStatusUpdate(item.id, newStatus);
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
        
        {!showContactInfo ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you interested in this item? Click below to see contact information.
            </p>
            <button
              onClick={() => setShowContactInfo(true)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Show Contact Info
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <a href={`mailto:${item.contact.email}`} className="text-blue-500 hover:underline">
                  {item.contact.email}
                </a>
              </div>
              {item.contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <a href={`tel:${item.contact.phone}`} className="text-blue-500 hover:underline">
                    {item.contact.phone}
                  </a>
                </div>
              )}
            </div>

            {user?.id === item.userId && (
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-gray-600 mb-2">Update item status:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate('available')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      item.status === 'available' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('pending')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      item.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('completed')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      item.status === 'completed' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Completed
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function OwnerActionsModal({ item, onClose, onDelete, onStatusUpdate }: OwnerActionsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteMarketplaceItem(item.id);
      onDelete(item.id);
      onClose();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">Manage Your Listing</h3>
        
        <div className="space-y-4">
          <div className="border-b pb-4">
            <p className="text-sm text-gray-600 mb-2">Update item status:</p>
            <div className="flex gap-2">
              <button
                onClick={() => onStatusUpdate(item.id, 'available')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                  item.status === 'available' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => onStatusUpdate(item.id, 'pending')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                  item.status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => onStatusUpdate(item.id, 'completed')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                  item.status === 'completed' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/marketplace/edit/${item.id}`)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Edit className="w-4 h-4" />
              Edit Listing
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function MarketplaceItems() {
  const { user } = useUser();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({
    category: '',
    type: '',
    priceRange: '',
    condition: '',
    location: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const q = query(
      collection(db, 'marketplace'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const newItems = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Ensure location data is properly formatted
          const location = {
            lat: Number(data.location?.lat || 0),
            lng: Number(data.location?.lng || 0),
            address: data.location?.address || ''
          };

          console.log('Processing item:', {
            id: doc.id,
            location: location,
            rawLocation: data.location
          });

          return {
            id: doc.id,
            ...data,
            location: location
          } as MarketplaceItem;
        });
        
        setItems(newItems);
        setFilteredItems(newItems);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to marketplace items:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let result = [...items];

    // Apply search
    if (searchTerm) {
      result = result.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.category) {
      result = result.filter(item => item.category === filters.category);
    }
    if (filters.type) {
      result = result.filter(item => item.type === filters.type);
    }
    if (filters.condition) {
      result = result.filter(item => item.condition === filters.condition);
    }
    if (filters.location) {
      result = result.filter(item => 
        item.location.address.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    if (filters.priceRange) {
      switch (filters.priceRange) {
        case 'free':
          result = result.filter(item => item.price === 'free');
          break;
        case 'under50':
          result = result.filter(item => item.price !== 'free' && item.price < 50);
          break;
        case '50to100':
          result = result.filter(item => 
            item.price !== 'free' && 
            item.price >= 50 && 
            item.price <= 100
          );
          break;
        case 'over100':
          result = result.filter(item => 
            item.price !== 'free' && 
            item.price > 100
          );
          break;
      }
    }

    setFilteredItems(result);
  }, [searchTerm, filters, items]);

  const handleStatusUpdate = (itemId: string, newStatus: 'pending' | 'completed' | 'available') => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    );
    setFilteredItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    );
  };

  const handleDelete = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    setFilteredItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t">
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="p-2 border rounded-lg"
            >
              <option value="">All Categories</option>
              <option value="electronic">Electronic</option>
              <option value="recyclable">Recyclable</option>
              <option value="hazardous">Hazardous</option>
              <option value="organic">Organic</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="p-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="give">Giving Away</option>
              <option value="take">Looking For</option>
            </select>

            <select
              value={filters.priceRange}
              onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
              className="p-2 border rounded-lg"
            >
              <option value="">All Prices</option>
              <option value="free">Free</option>
              <option value="under50">Under ₹50</option>
              <option value="50to100">₹50 - ₹100</option>
              <option value="over100">Over ₹100</option>
            </select>

            <select
              value={filters.condition}
              onChange={(e) => setFilters({...filters, condition: e.target.value})}
              className="p-2 border rounded-lg"
            >
              <option value="">All Conditions</option>
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>

            <input
              type="text"
              placeholder="Filter by location..."
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
              className="p-2 border rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-gray-600">
        Found {filteredItems.length} items
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    item.type === 'give' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {item.type === 'give' ? 'Giving Away' : 'Looking For'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    item.status === 'available' 
                      ? 'bg-green-100 text-green-800'
                      : item.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Tag className="w-4 h-4" />
                    <span>{item.price === 'free' ? 'Free' : `₹${item.price}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <span>{item.location.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Condition: {item.condition}</span>
                    {user?.id === item.userId ? (
                      <button 
                        onClick={() => setSelectedItem(item)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Manage
                      </button>
                    ) : (
                      <button 
                        onClick={() => setSelectedItem(item)}
                        className={`px-4 py-2 rounded-lg ${
                          item.status === 'completed'
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                        disabled={item.status === 'completed'}
                      >
                        {item.status === 'completed' ? 'Completed' : 'Contact'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No items found matching your criteria.</p>
            <p className="text-sm text-gray-400">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>

      {/* Map Section - Moved to bottom */}
      <div className="bg-white rounded-lg shadow-md p-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            Items Location Map
          </h2>
          <p className="text-sm text-gray-500">
            {filteredItems.length} items with location data
          </p>
        </div>
        <MarketplaceMap items={filteredItems} />
      </div>

      {/* Modals */}
      {selectedItem && (
        user?.id === selectedItem.userId ? (
          <OwnerActionsModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={handleDelete}
            onStatusUpdate={handleStatusUpdate}
          />
        ) : (
          <ContactModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onStatusUpdate={handleStatusUpdate}
          />
        )
      )}
    </div>
  );
} 