import { MarketplaceListing } from './MarketplaceListing';
import { MarketplaceItems } from './MarketplaceItems';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MarketplacePage() {
  const [view, setView] = useState<'browse' | 'create'>('browse');
  const navigate = useNavigate();

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
          <div className="flex gap-4">
            <button
              onClick={() => setView('browse')}
              className={`px-4 py-2 rounded-lg ${
                view === 'browse' ? 'bg-blue-500 text-white' : 'bg-white'
              }`}
            >
              Browse Items
            </button>
            <button
              onClick={() => setView('create')}
              className={`px-4 py-2 rounded-lg ${
                view === 'create' ? 'bg-blue-500 text-white' : 'bg-white'
              }`}
            >
              Create Listing
            </button>
          </div>
        </div>

        {/* Content */}
        {view === 'browse' ? <MarketplaceItems /> : <MarketplaceListing />}
      </div>
    </div>
  );
} 