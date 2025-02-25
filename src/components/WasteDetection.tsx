import { Camera } from './Camera';
import { WasteInsights } from './WasteInsights';
import { AIChat } from './AIChat';
import { Camera as CameraIcon, BarChart, MessageSquare, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MarketplacePreview } from './MarketplacePreview';

export function WasteDetection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CameraIcon className="w-8 h-8 text-green-500 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">AI Waste Detective</h1>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <section>
              <div className="flex items-center mb-4">
                <CameraIcon className="w-6 h-6 text-gray-700 mr-2" />
                <h2 className="text-xl font-semibold">Live Detection</h2>
              </div>
              <Camera />
            </section>

            <section>
              <div className="flex items-center mb-4">
                <BarChart className="w-6 h-6 text-gray-700 mr-2" />
                <h2 className="text-xl font-semibold">Waste Analysis</h2>
              </div>
              <WasteInsights />
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <div className="flex items-center mb-4">
                <MessageSquare className="w-6 h-6 text-gray-700 mr-2" />
                <h2 className="text-xl font-semibold">AI Assistant</h2>
              </div>
              <div className="h-[calc(100vh-450px)] min-h-[500px]">
                <AIChat />
              </div>
            </section>

            <section>
              <MarketplacePreview />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
} 