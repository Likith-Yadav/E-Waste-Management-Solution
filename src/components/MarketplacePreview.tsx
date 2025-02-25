import { useEffect, useState } from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';

interface MarketplaceItem {
  id: string;
  title: string;
  type: 'give' | 'take';
  price: number | 'free';
  status: 'available' | 'pending' | 'completed';
}

export function MarketplacePreview() {
  const [recentItems, setRecentItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'marketplace'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MarketplaceItem[];
        setRecentItems(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching recent items:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-green-500" />
          Recent Marketplace Items
        </h2>
        <button
          onClick={() => navigate('/marketplace')}
          className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {recentItems.length > 0 ? (
          recentItems.map((item) => (
            <div
              key={item.id}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => navigate('/marketplace')}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{item.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.type === 'give' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {item.type === 'give' ? 'Giving Away' : 'Looking For'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Price: {item.price === 'free' ? 'Free' : `$${item.price}`}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No items available</p>
            <button
              onClick={() => navigate('/marketplace/create')}
              className="mt-2 text-blue-500 hover:text-blue-600"
            >
              Create a listing
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t">
        <button
          onClick={() => navigate('/marketplace/create')}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          Create New Listing
        </button>
      </div>
    </div>
  );
} 