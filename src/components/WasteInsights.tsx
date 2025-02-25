import { useMemo, useState, useEffect } from 'react';
import { useWasteStore } from '../store/wasteStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Recycle, Monitor, AlertTriangle, Leaf, TrendingUp, Lightbulb, Save } from 'lucide-react';
import { saveWasteData, getLast30DaysData, getUserWasteData } from '../services/firebaseService';
import { useUser } from '@clerk/clerk-react';

// Add interface for Firebase timestamp
interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
}

// Update SavedWasteData to match Firebase structure
interface DetectedItem {
  type: string;
  confidence: number;
}

interface WasteData {
  userId: string;
  detectedItems: {
    recyclable: DetectedItem[];
    electronic: DetectedItem[];
    hazardous: DetectedItem[];
    organic: DetectedItem[];
  };
  timestamp: any; // Firestore Timestamp
}

interface SavedWasteData extends WasteData {
  id: string;
}

interface GroupedData {
  total: number;
  items: Record<string, number>;
}

export function WasteInsights() {
  const { user, isSignedIn } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [savedData, setSavedData] = useState<SavedWasteData[]>([]);
  const detectedItems = useWasteStore((state) => state.detectedItems);

  const handleSave = async () => {
    if (!isSignedIn || !user || detectedItems.length === 0) {
      console.error('User must be signed in to save data');
      return;
    }
    
    setIsSaving(true);
    try {
      await saveWasteData(detectedItems, user.id);
      await loadSavedData(); // Refresh data
    } catch (error) {
      console.error('Error saving data:', error);
      // Add error notification here if you want
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedData = async () => {
    if (!user) return;
    
    try {
      const data = await getUserWasteData(user.id);
      setSavedData(data);
    } catch (error) {
      console.error('Error loading saved data:', error);
      // Optionally show error to user
    }
  };

  useEffect(() => {
    if (user) {
      loadSavedData();
    }
  }, [user]);

  // Update the waste categories to better match COCO-SSD labels
  const wasteCategories = {
    recyclable: {
      items: [
        'bottle', 'cup', 'wine glass', 'fork', 'knife', 'spoon', 'bowl',
        'vase', 'scissors', 'book', 'clock', 'suitcase', 'umbrella',
        'handbag', 'backpack', 'sports ball', 'kite', 'baseball glove',
        'skateboard', 'surfboard', 'tennis racket', 'bottle', 'plate',
        'tin can', 'aluminum can', 'cardboard box', 'paper', 'magazine',
        'newspaper'
      ],
      color: '#10B981',
      icon: <Recycle className="w-5 h-5" />,
      tip: 'Clean and separate before recycling'
    },
    electronic: {
      items: [
        'laptop', 'tv', 'tvmonitor', 'cell phone', 'remote', 'keyboard', 'mouse',
        'computer', 'monitor', 'microwave', 'oven', 'toaster', 'refrigerator',
        'hair drier', 'clock'
      ],
      color: '#3B82F6',
      icon: <Monitor className="w-5 h-5" />,
      tip: 'Take to e-waste collection center'
    },
    hazardous: {
      items: [
        'scissors', 'knife', 'hair drier', 'battery', 'fire hydrant',
        'stop sign', 'traffic light', 'parking meter'
      ],
      color: '#EF4444',
      icon: <AlertTriangle className="w-5 h-5" />,
      tip: 'Requires special disposal'
    },
    organic: {
      items: [
        'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
        'hot dog', 'pizza', 'donut', 'cake', 'potted plant', 'food',
        'fruit', 'vegetable', 'plant', 'dining table'
      ],
      color: '#F59E0B',
      icon: <Leaf className="w-5 h-5" />,
      tip: 'Suitable for composting'
    }
  };

  // Improved categorization function
  const getWasteCategory = (itemType: string): string => {
    const lowerType = itemType.toLowerCase().trim();
    
    // Debug log
    console.log('Categorizing item:', lowerType);
    
    // Common COCO-SSD labels and their mappings
    const categoryMappings: Record<string, string> = {
      cup: 'recyclable',
      bottle: 'recyclable',
      'wine glass': 'recyclable',
      bowl: 'recyclable',
      'dining table': 'recyclable',
      chair: 'recyclable',
      couch: 'recyclable',
      'potted plant': 'organic',
      laptop: 'electronic',
      keyboard: 'electronic',
      mouse: 'electronic',
      tvmonitor: 'electronic',
      tv: 'electronic',
      cell: 'electronic',
      phone: 'electronic',
      microwave: 'electronic',
      oven: 'electronic',
      toaster: 'electronic',
      refrigerator: 'electronic',
      book: 'recyclable',
      clock: 'recyclable',
      vase: 'recyclable',
      scissors: 'hazardous',
      knife: 'hazardous',
      'hair drier': 'hazardous',
      banana: 'organic',
      apple: 'organic',
      sandwich: 'organic',
      orange: 'organic',
      broccoli: 'organic',
      carrot: 'organic',
      'hot dog': 'organic',
      pizza: 'organic',
      donut: 'organic',
      cake: 'organic'
    };

    // First check direct mappings
    if (categoryMappings[lowerType]) {
      console.log('Found direct mapping:', lowerType, '->', categoryMappings[lowerType]);
      return categoryMappings[lowerType];
    }

    // Then check category lists
    for (const [category, data] of Object.entries(wasteCategories)) {
      if (data.items.some(item => 
        lowerType.includes(item) || 
        item.includes(lowerType)
      )) {
        console.log('Found category match:', lowerType, '->', category);
        return category;
      }
    }
    
    console.log('No category found for:', lowerType);
    return 'other';
  };

  const analysisData = useMemo(() => {
    // Initialize all categories with 0 count
    const categoryGroups = Object.keys(wasteCategories).reduce((acc, category) => {
      acc[category] = {
        count: 0,
        items: new Set<string>(),
        lastDetected: 0
      };
      return acc;
    }, {} as Record<string, { count: number; items: Set<string>; lastDetected: number }>);

    // Process detected items
    detectedItems.forEach(item => {
      const category = getWasteCategory(item.type);
      if (category !== 'other') {
        categoryGroups[category].count++;
        categoryGroups[category].items.add(item.type);
        categoryGroups[category].lastDetected = Math.max(categoryGroups[category].lastDetected, item.timestamp);
      }
    });

    // Convert to array format for chart
    return Object.entries(wasteCategories).map(([category, data]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      count: categoryGroups[category].count,
      items: Array.from(categoryGroups[category].items),
      color: data.color,
      icon: data.icon,
      tip: data.tip
    }));
  }, [detectedItems]);

  // Enhanced recommendations system
  const getRecommendations = (items: Array<{ type: string; timestamp: number }>) => {
    const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentItems = items.filter(item => item.timestamp > last7Days);
    
    const itemCounts = recentItems.reduce((acc, item) => {
      const category = getWasteCategory(item.type);
      if (!acc[category]) {
        acc[category] = { count: 0, items: new Set<string>() };
      }
      acc[category].count++;
      acc[category].items.add(item.type);
      return acc;
    }, {} as Record<string, { count: number; items: Set<string> }>);

    const recommendations = [];

    // Category-specific recommendations
    if (itemCounts.electronic?.count > 0) {
      recommendations.push({
        title: 'E-Waste Alert',
        message: `Detected ${Array.from(itemCounts.electronic.items).join(', ')}. Please take these to an e-waste recycling center.`,
        icon: <Monitor className="w-5 h-5 text-blue-500" />
      });
    }

    if (itemCounts.recyclable?.count > 0) {
      recommendations.push({
        title: 'Recyclable Items',
        message: `Found ${itemCounts.recyclable.count} recyclable items. Remember to clean and separate them properly.`,
        icon: <Recycle className="w-5 h-5 text-green-500" />
      });
    }

    if (itemCounts.hazardous?.count > 0) {
      recommendations.push({
        title: 'Hazardous Waste Warning',
        message: 'Detected hazardous items. These require special disposal methods. Do not mix with regular waste!',
        icon: <AlertTriangle className="w-5 h-5 text-red-500" />
      });
    }

    if (itemCounts.organic?.count > 0) {
      recommendations.push({
        title: 'Organic Waste Tips',
        message: 'Consider composting your organic waste to reduce landfill impact and create nutrient-rich soil.',
        icon: <Leaf className="w-5 h-5 text-amber-500" />
      });
    }

    return recommendations;
  };

  // Enhanced recycling tips based on detected items
  const getRecyclingTips = (items: Array<{ type: string; timestamp: number }>) => {
    const recentItems = items.slice(-5); // Get last 5 detected items
    const tips = new Set<string>();

    recentItems.forEach(item => {
      const category = getWasteCategory(item.type);
      const itemType = item.type.toLowerCase();

      // Item-specific tips
      if (itemType.includes('laptop') || itemType.includes('phone')) {
        tips.add('Backup and erase personal data before recycling electronic devices');
      }
      if (itemType.includes('battery')) {
        tips.add('Never dispose of batteries in regular trash - they contain harmful chemicals');
      }
      if (itemType.includes('plastic') || itemType.includes('bottle')) {
        tips.add('Rinse plastic containers and remove caps before recycling');
      }
      if (itemType.includes('paper') || itemType.includes('cardboard')) {
        tips.add('Keep paper products dry and free from food contamination');
      }

      // Category-specific tips
      switch (category) {
        case 'electronic':
          tips.add('Check with local electronics stores for recycling programs');
          break;
        case 'hazardous':
          tips.add('Store hazardous materials in original containers until proper disposal');
          break;
        case 'organic':
          tips.add('Use a sealed container for composting to control odors');
          break;
        case 'recyclable':
          tips.add('Flatten boxes and containers to save space');
          break;
      }
    });

    return Array.from(tips);
  };

  const recommendations = useMemo(() => getRecommendations(detectedItems), [detectedItems]);
  const recyclingTips = useMemo(() => getRecyclingTips(detectedItems), [detectedItems]);

  // Modified trend analysis to use Firebase data
  const getTrendAnalysis = () => {
    const groupedByDate = savedData.reduce((acc, data) => {
      const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
      const date = timestamp.toLocaleDateString();

      if (!acc[date]) {
        acc[date] = { total: 0, items: {} };
      }

      // Count items from each category
      Object.entries(data.detectedItems).forEach(([category, items]) => {
        items.forEach(item => {
          acc[date].total++;
          acc[date].items[item.type] = (acc[date].items[item.type] || 0) + 1;
        });
      });

      return acc;
    }, {} as Record<string, { total: number; items: Record<string, number> }>);

    return Object.entries(groupedByDate).map(([date, data]) => ({
      date,
      count: data.total,
      ...data.items
    }));
  };

  const trendData = getTrendAnalysis();

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {analysisData.map((stat) => (
          <div key={stat.name} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ color: stat.color }}>{stat.icon}</div>
              <h3 className="font-medium capitalize">{stat.name}</h3>
            </div>
            <p className="text-3xl font-bold" style={{ color: stat.color }}>
              {stat.count}
            </p>
            <p className="text-sm text-gray-600">items detected</p>
            {stat.items.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Latest: {stat.items[stat.items.length - 1]}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="font-medium flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Waste Categories
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analysisData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
            return (
                      <div className="bg-white p-3 shadow-lg rounded border">
                        <p className="font-medium capitalize">{data.name}</p>
                        <p className="text-sm">Count: {data.count}</p>
                        {data.items.length > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            Items: {data.items.join(', ')}
                          </p>
                        )}
              </div>
            );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                fill="#4B5563"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-medium flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          30-Day Trend
        </h3>
        <button
          onClick={handleSave}
          disabled={isSaving || detectedItems.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg 
                     hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Data'}
        </button>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#3B82F6" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Smart Recommendations
        </h3>
      <div className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  {rec.icon}
                  <h4 className="font-medium text-blue-900">{rec.title}</h4>
                </div>
                <p className="text-sm text-gray-600">{rec.message}</p>
              </div>
            ))
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">
                Point the camera at waste items to get personalized recommendations!
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium flex items-center gap-2">
          <Recycle className="w-5 h-5 text-green-500" />
          Recycling Tips
        </h3>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          {recyclingTips.length > 0 ? (
            <ul className="space-y-2">
              {recyclingTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              Detect some items to get specific recycling tips!
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Hazardous Materials Alert
        </h2>

        <div className="space-y-4">
          {detectedItems.some(item => getWasteCategory(item.type) === 'hazardous') ? (
            <div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-700 font-medium mb-2">⚠️ Detected Hazardous Items:</h3>
                <ul className="space-y-2">
                  {detectedItems
                    .filter(item => getWasteCategory(item.type) === 'hazardous')
                    .map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-red-600">
                        <span className="w-2 h-2 mt-2 rounded-full bg-red-500" />
                        <div>
                          <span className="font-medium">{item.type}</span>
                          <p className="text-sm text-red-500">
                            Requires special handling and disposal
                          </p>
                        </div>
                      </li>
                    ))}
                </ul>
                <p className="mt-3 text-sm text-gray-600">
                  Please handle these items with care and dispose of them at appropriate facilities.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <h3 className="text-yellow-700 font-medium mb-2">Safety Guidelines:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 mt-2 rounded-full bg-yellow-500" />
                    <span>Wear protective gloves when handling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 mt-2 rounded-full bg-yellow-500" />
                    <span>Keep away from children and pets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 mt-2 rounded-full bg-yellow-500" />
                    <span>Store in original containers when possible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 mt-2 rounded-full bg-yellow-500" />
                    <span>Do not mix with other materials</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">
                No hazardous materials currently detected. Continue safe handling practices.
              </p>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}