// map.tsx
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ActivityMarker from '../_components/ActivityMarker';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { useAuth } from '../_context/AuthContext';

// Updated with the complete map style from the first file
const outdoorMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#ebe3cd' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#523735' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#f5f1e6' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c9b2a6' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#dcd2be' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ae9e90' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#dfd2ae' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#dfd2ae' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#93817c' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#a5b076' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#447530' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#f5f1e6' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#fdfcf8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#f8c967' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e9bc62' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [{ color: '#e98d58' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#db8555' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#806b63' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#dfd2ae' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8f7d77' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ebe3cd' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#dfd2ae' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#b9d3c2' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#92998d' }],
  },
];

const defaultLocation = {
  latitude: 50.8503,
  longitude: 4.3517,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421
};

type LocationType = {
  latitude: number;
  longitude: number;
};

type ActivityType = {
  id: string;
  title: string;
  description: string;
  locationType: 'spot' | 'path' | 'checkpoints';
  startPoint: { latitude: number; longitude: number };
  category: string;
  activityType: string;
};

export default function MapScreen() {
  const [location, setLocation] = useState<LocationType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const mapRef = useRef<MapView>(null);
  const router = useRouter();
  // Add user role check
  const { userRole } = useAuth();
  const canUseBuilder = userRole === 'pathfinder' || userRole === 'expeditionary' || userRole === 'admin';

  const categoryDisplayNames: Record<string, string> = {
    Land: 'Land',
    Water: 'Water',
    Air: 'Air',
    Ice_Snow: 'Ice/Snow',
    ATV: 'All Terrain Vehicles',
    Urban: 'Urban'
  };

  // Get user location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const userLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation(userLocation.coords);
        } else {
          setLocationDenied(true);
          setErrorMsg('Location permission denied');
        }
      } catch (e: any) {
        setErrorMsg(e.message);
      }
    })();
  }, []);

  // Load activities
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const activities: ActivityType[] = [];
        
        // Get all categories
        const categoriesSnap = await getDocs(collection(db, 'categories'));
        
        // For each category
        for (const categoryDoc of categoriesSnap.docs) {
          const categoryId = categoryDoc.id;
          
          // Get all activities for this category
          const activitiesRef = collection(doc(db, 'categories', categoryId), 'activities');
          const activitiesSnap = await getDocs(activitiesRef);
          
          // For each activity type
          for (const activityTypeDoc of activitiesSnap.docs) {
            const activityTypeId = activityTypeDoc.id;
            
            // Get all items for this activity type
            const itemsRef = collection(doc(activitiesRef, activityTypeId), 'items');
            const itemsSnap = await getDocs(itemsRef);
            
            // Map the items to our ActivityType format
            const activityItems = itemsSnap.docs
              .map(d => {
                const data = d.data();
                // Determine start point based on mode
                let startPoint = null;
                
                if (data.startPoint) {
                  // Use the pre-calculated startPoint if available
                  startPoint = data.startPoint;
                } else if (data.mode === 'spot' && data.location) {
                  startPoint = data.location;
                } else if (data.mode === 'path' && data.route && data.route.length > 0) {
                  startPoint = data.route[0];
                } else if (data.mode === 'checkpoints' && data.checkpoints && data.checkpoints.length > 0) {
                  startPoint = data.checkpoints[0];
                }
                
                // Only add if we have a valid startPoint
                if (startPoint && typeof startPoint.latitude === 'number' && 
                    typeof startPoint.longitude === 'number' && data.title) {
                  return {
                    id: d.id,
                    title: data.title,
                    description: data.description || '',
                    locationType: data.mode,
                    startPoint,
                    category: categoryId,
                    activityType: activityTypeId
                  };
                }
                return null;
              })
              .filter(Boolean) as ActivityType[];
            
            activities.push(...activityItems);
          }
        }
        
        setActivities(activities);
        console.log(`Loaded ${activities.length} activities from new structure`);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Migration helper for existing data (run once if needed)
  const migrateActivities = async () => {
    try {
      // Get all existing activities
      const activitiesSnap = await getDocs(collection(db, 'activities'));
      
      for (const activityDoc of activitiesSnap.docs) {
        const activity = activityDoc.data();
        
        // Skip if missing required data
        if (!activity.category || !activity.activityType) continue;
        
        // Format the activity type path
        const activityTypeFormatted = activity.activityType.replace(/_/g, '_');
        
        // Create the path structure
        const categoryRef = collection(db, 'categories');
        const categoryDoc = doc(categoryRef, activity.category);
        const activitiesRef = collection(categoryDoc, 'activities');
        const activityTypeRef = doc(activitiesRef, activityTypeFormatted);
        
        // Ensure activity type document exists
        const activityTypeDoc = await getDoc(activityTypeRef);
        if (!activityTypeDoc.exists()) {
          await setDoc(activityTypeRef, {
            displayName: activity.activityType.replace(/_/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
          });
        }
        
        // Add the activity to the new structure
        const activityCollectionRef = collection(activityTypeRef, 'items');
        await addDoc(activityCollectionRef, activity);
      }
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration error:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading activities…</Text>
      </SafeAreaView>
    );
  }

  const mapRegion = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }
    : defaultLocation;

  return (
    <SafeAreaView style={styles.container}>
      {errorMsg && locationDenied && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg} – Using default location</Text>
        </View>
      )}

      {/* Map + header wrapper */}
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapHeaderText}>Explorien Map</Text>
        </View>

        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={mapRegion}
          customMapStyle={outdoorMapStyle}
          mapType="standard"
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          zoomControlEnabled={false}
        >
          {/* only valid MapView children */}
          {activities.map(act => (
            <ActivityMarker
              key={act.id}
              id={act.id}
              coordinate={act.startPoint}
              title={act.title}
              description={act.description}
              category={act.category}
              activity={act.activityType}
              size={45}
              displayName={categoryDisplayNames[act.category] || act.category}
            />
          ))}
        </MapView>

        {/* moved outside MapView */}
        {activities.length === 0 && (
          <View style={styles.centerOverlay}>
            <Text style={styles.noActivitiesText}>No activities found yet!</Text>
          </View>
        )}
      </View>

      {/* controls */}
      <View style={styles.customControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() =>
            mapRef.current?.animateToRegion(mapRegion)
          }
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            if (location) {
              mapRef.current?.animateToRegion(mapRegion);
            } else {
              setErrorMsg('Location access denied');
              setTimeout(() => setErrorMsg(null), 3000);
            }
          }}
        >
          <Ionicons name="locate" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Builder button - only shown to paid users */}
        {canUseBuilder && (
  <TouchableOpacity
    style={styles.controlButton}
    onPress={() => router.push('/screens/ActivityBuilderStep1')}
  >
    <FontAwesome5 name="drafting-compass" size={22} color="#fff" />
  </TouchableOpacity>
)}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  mapHeader: { backgroundColor: '#2196F3', padding: 10, alignItems: 'center' },
  mapHeaderText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  map: { flex: 1 },
  centerOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  noActivitiesText: { fontSize: 16, color: '#777' },
  errorBanner: { backgroundColor: '#ffcccc', padding: 8, alignItems: 'center' },
  errorText: { color: '#cc0000', fontSize: 14 },
  customControls: {
    position: 'absolute',
    right: 15,
    bottom: 100,
    flexDirection: 'column',
    gap: 10
  },
  controlButton: {
    backgroundColor: '#2196F3',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3
  },
  migrateButton: {
    backgroundColor: '#FF6B00',
    padding: 12,
    alignItems: 'center',
    margin: 10,
    borderRadius: 8,
  },
  migrateButtonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
