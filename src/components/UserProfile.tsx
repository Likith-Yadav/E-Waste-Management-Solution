import { useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { getUserWasteData } from '../services/firebaseService';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UserProfile() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [userWasteData, setUserWasteData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          const data = await getUserWasteData(user.id);
          setUserWasteData(data);
        } catch (error) {
          console.error('Error loading user data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserData();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4">
            <img 
              src={user?.imageUrl} 
              alt="Profile" 
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h2 className="text-xl font-semibold">{user?.fullName}</h2>
              <p className="text-gray-600">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {userWasteData.map((data) => (
                <div key={data.id} className="border-b pb-4">
                  <p className="text-sm text-gray-500">
                    {new Date(data.timestamp?.seconds * 1000).toLocaleDateString()}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Recyclable Items</p>
                      <p className="text-gray-600">{data.detectedItems.recyclable.length} items</p>
                    </div>
                    <div>
                      <p className="font-medium">Electronic Items</p>
                      <p className="text-gray-600">{data.detectedItems.electronic.length} items</p>
                    </div>
                    <div>
                      <p className="font-medium">Hazardous Items</p>
                      <p className="text-gray-600">{data.detectedItems.hazardous.length} items</p>
                    </div>
                    <div>
                      <p className="font-medium">Organic Items</p>
                      <p className="text-gray-600">{data.detectedItems.organic.length} items</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 