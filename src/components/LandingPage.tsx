import { useNavigate } from 'react-router-dom';
import { Camera, ShoppingBag, Recycle, ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

export function LandingPage() {
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Recycle className="w-8 h-8 text-green-500" />
              <span className="text-xl font-bold text-gray-900">E-Waste Management</span>
            </div>
            <div className="flex items-center gap-4">
              {isSignedIn ? (
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">{user.fullName}</span>
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                  >
                    Profile
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/sign-in')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/sign-up')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            E-Waste Management Solution
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Detect, classify, and manage electronic waste responsibly. Join our marketplace 
            to give or take e-waste items.
          </p>
          {!isSignedIn && (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/sign-up')}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 
                         flex items-center gap-2 text-lg"
              >
                <UserPlus className="w-5 h-5" />
                Get Started
              </button>
              <button
                onClick={() => navigate('/sign-in')}
                className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 
                         flex items-center gap-2 text-lg border border-gray-200"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Main Options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Detection Option */}
          <div 
            onClick={() => isSignedIn ? navigate('/detection') : navigate('/sign-in')}
            className="bg-white rounded-xl shadow-lg p-8 cursor-pointer 
                     transform transition hover:scale-105 hover:shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <Camera className="w-12 h-12 text-blue-500" />
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              E-Waste Detection
            </h2>
            <p className="text-gray-600 mb-4">
              Use AI-powered detection to identify and classify electronic waste items.
              Get instant recycling recommendations.
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li className="flex items-center gap-2">
                <Recycle className="w-4 h-4" />
                Real-time waste classification
              </li>
              <li className="flex items-center gap-2">
                <Recycle className="w-4 h-4" />
                Recycling guidelines
              </li>
              <li className="flex items-center gap-2">
                <Recycle className="w-4 h-4" />
                Environmental impact analysis
              </li>
            </ul>
          </div>

          {/* Marketplace Option */}
          <div 
            onClick={() => isSignedIn ? navigate('/marketplace') : navigate('/sign-in')}
            className="bg-white rounded-xl shadow-lg p-8 cursor-pointer 
                     transform transition hover:scale-105 hover:shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <ShoppingBag className="w-12 h-12 text-green-500" />
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              E-Waste Marketplace
            </h2>
            <p className="text-gray-600 mb-4">
              Connect with others to give or take electronic items. Promote reuse
              and responsible disposal.
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Browse available items
              </li>
              <li className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                List your e-waste
              </li>
              <li className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Connect with recyclers
              </li>
            </ul>
          </div>
        </div>

        {/* Call to Action for non-signed-in users */}
        {!isSignedIn && (
          <div className="mt-16 text-center bg-blue-50 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Join Our E-Waste Management Community
            </h2>
            <p className="text-gray-600 mb-6">
              Create an account to start detecting waste, managing your items, and 
              participating in our marketplace.
            </p>
            <button
              onClick={() => navigate('/sign-up')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create Free Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 