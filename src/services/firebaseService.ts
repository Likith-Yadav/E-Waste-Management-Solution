import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp, serverTimestamp, orderBy, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getWasteCategory } from '../utils/wasteCategories'; // We'll create this utility

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface MarketplaceItem {
  id?: string;
  title: string;
  category: string;  // from waste categories
  condition: 'new' | 'good' | 'fair' | 'poor';
  type: 'give' | 'take';
  price: number | 'free';
  description: string;
  recyclingGuide: string;
  disposalInstructions: string;
  images: string[];
  location: Location;
  userId: string;
  contact: {
    email: string;
    phone?: string;
  };
  status: 'available' | 'pending' | 'completed';
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
}

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

interface WasteDataWithId extends WasteData {
  id: string;
}

interface MeetingRequest {
  itemId: string;
  itemTitle: string;
  ownerId: string;
  requesterId: string;
  requesterEmail: string;
  meetingPoint: {
    name: string;
    type: string;
    lat: number;
    lng: number;
    distance: number;
  };
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export const saveWasteData = async (items: DetectedItem[], userId: string) => {
  try {
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    const wasteData: WasteData = {
      userId,
      detectedItems: {
        recyclable: [],
        electronic: [],
        hazardous: [],
        organic: []
      },
      timestamp: serverTimestamp()
    };

    items.forEach(item => {
      const category = getWasteCategory(item.type);
      if (category !== 'other' && category in wasteData.detectedItems) {
        (wasteData.detectedItems[category as keyof typeof wasteData.detectedItems] as DetectedItem[]).push(item);
      }
    });

    const docRef = await addDoc(collection(db, 'waste-data'), wasteData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving waste data:', error);
    throw error;
  }
};

export const getUserWasteData = async (userId: string): Promise<WasteDataWithId[]> => {
  try {
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    const q = query(
      collection(db, 'waste-data'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(30)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as WasteData)
    }));
  } catch (error) {
    console.error('Error fetching user waste data:', error);
    if (error instanceof Error && error.message.includes('requires an index')) {
      console.log('Please create the required index in Firebase Console');
    }
    throw error;
  }
};

export const getLast30DaysData = async (userId: string) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const q = query(
      collection(db, 'waste-data'),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data() as WasteData;
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp
      };
    }) as WasteDataWithId[];
  } catch (error) {
    console.error('Error fetching waste data:', error);
    if (error instanceof Error && error.message.includes('requires an index')) {
      console.log('Please create the required index in Firebase Console');
    }
    return [];
  }
};

export const addMarketplaceItem = async (
  item: Omit<MarketplaceItem, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
) => {
  try {
    // Ensure location data is properly structured
    const itemData = {
      ...item,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'available',
      location: {
        lat: item.location?.lat || 0,
        lng: item.location?.lng || 0,
        address: item.location?.address || ''
      }
    };
    
    const docRef = await addDoc(collection(db, 'marketplace'), itemData);
    
    // Also add reference to user's listings
    await addDoc(collection(db, 'users', userId, 'listings'), {
      listingId: docRef.id,
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding marketplace item:', error);
    throw error;
  }
};

export const getMarketplaceItems = async (filters?: {
  category?: string;
  type?: 'give' | 'take';
  priceRange?: { min: number; max: number };
  location?: string;
}) => {
  try {
    let q = query(
      collection(db, 'marketplace'),
      orderBy('createdAt', 'desc')
    );
    
    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters?.location) {
      q = query(q, where('location', '==', filters.location));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MarketplaceItem[];
  } catch (error) {
    console.error('Error fetching marketplace items:', error);
    throw error;
  }
};

export const convertToMarketplaceItem = async (
  detectedItem: { type: string; confidence: number },
  additionalInfo: {
    title: string;
    condition: 'new' | 'good' | 'fair' | 'poor';
    type: 'give' | 'take';
    price: number | 'free';
    description: string;
    location: Location;
    contact: { email: string; phone?: string };
    userId: string;
  }
) => {
  const category = getWasteCategory(detectedItem.type);
  
  const marketplaceItem: Omit<MarketplaceItem, 'id' | 'createdAt' | 'updatedAt'> = {
    ...additionalInfo,
    category,
    recyclingGuide: `Recycling guide for ${detectedItem.type}`,
    disposalInstructions: `Disposal instructions for ${detectedItem.type}`,
    images: [],
    status: 'available',
    location: additionalInfo.location // Use the provided location object directly
  };

  return addMarketplaceItem(marketplaceItem, additionalInfo.userId);
};

export const updateMarketplaceItemStatus = async (
  itemId: string, 
  status: 'pending' | 'completed' | 'available'
) => {
  try {
    const docRef = doc(db, 'marketplace', itemId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating item status:', error);
    throw error;
  }
};

export const deleteMarketplaceItem = async (itemId: string) => {
  try {
    const docRef = doc(db, 'marketplace', itemId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting marketplace item:', error);
    throw error;
  }
};

export const getUserLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        
        try {
          // Use OpenStreetMap's Nominatim for reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await response.json();
          
          resolve({
            lat,
            lng,
            address: data.display_name || ''
          });
        } catch (error) {
          resolve({
            lat,
            lng,
            address: ''
          });
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
};

export async function createMeetingRequest(request: MeetingRequest) {
  return await addDoc(collection(db, 'meetingRequests'), request);
} 