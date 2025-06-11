// map.tsx
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ActivityMarker from '../_components/ActivityMarker';
import ActivityDetailModal from '../_components/ActivityDetailModal';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { useAuth } from '../_context/AuthContext';

// Export the map style so it can be used in ActivityTracker
export const outdoorMapStyle = [
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
  // Hide all POIs
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.government',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.school',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.medical',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.attraction',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.place_of_worship',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.sports_complex',
    stylers: [{ visibility: 'off' }]
  }
];

// Fallback location if user location is not available
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
  createdAt?: any;
};

export default function MapScreen() {
  const [location, setLocation] = useState<LocationType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const mapRef = useRef<MapView>(null);
  const router = useRouter();
  
  // States for activity details modal
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
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

  // No placeholder activities as requested

  // Get user location
  useEffect(() => {
    (async () => {
      try {
        console.log("Requesting location permissions...");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          console.log("Permission granted, getting current position...");
          const userLocation = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced 
          });
          console.log("Location received:", userLocation.coords);
          setLocation(userLocation.coords);
          
          // Immediately center map on user location once we have it
          if (mapRef.current && userLocation.coords) {
            console.log("Centering map on user location");
            mapRef.current.animateToRegion({
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01
            });
          }
        } else {
          console.log("Location permission denied");
          setLocationDenied(true);
          setErrorMsg('Location permission denied');
        }
      } catch (e: any) {
        console.error("Error getting location:", e);
        setErrorMsg(e.message);
      }
    })();
  }, []);

  // Load activities
useEffect(() => {
  (async () => {
    try {
      setLoading(true);
      const fetchedActivities: ActivityType[] = [];
      console.log("Starting to fetch activities from Firebase...");
      
      // Get all categories
      const categoriesSnap = await getDocs(collection(db, 'categories'));
      console.log(`Found ${categoriesSnap.docs.length} categories`);
      
      // For each category
      for (const categoryDoc of categoriesSnap.docs) {
        const categoryId = categoryDoc.id;
        
        // Get all activity types in this category
        const activityTypesSnap = await getDocs(collection(doc(db, 'categories', categoryId), 'activities'));
        
        // For each activity type
        for (const activityTypeDoc of activityTypesSnap.docs) {
          const activityTypeId = activityTypeDoc.id;
          
          // Get all items under this activity type
          const itemsRef = collection(doc(collection(doc(db, 'categories', categoryId), 'activities'), activityTypeId), 'items');
          const itemsSnap = await getDocs(itemsRef);
          
          // Process each item
          itemsSnap.docs.forEach(itemDoc => {
            const data = itemDoc.data();
            
            // Determine start point based on mode
            let startPoint = null;
            
            if (data.startPoint) {
              startPoint = data.startPoint;
            } else if (data.mode === 'spot' && data.location) {
              startPoint = data.location;
            } else if (data.mode === 'path' && data.route && data.route.length > 0) {
              startPoint = data.route[0];
            } else if (data.mode === 'checkpoints' && data.checkpoints && data.checkpoints.length > 0) {
              startPoint = data.checkpoints[0];
            }
            
            // Add to fetched activities if valid
            if (startPoint && typeof startPoint.latitude === 'number' && 
                typeof startPoint.longitude === 'number' && data.title) {
              fetchedActivities.push({
                id: itemDoc.id,
                title: data.title,
                description: data.description || '',
                locationType: data.mode,
                startPoint,
                category: categoryId,
                activityType: data.activityType || activityTypeId,
                categoryId, // Add these for reference
                activityTypeId, // Add these for reference
                itemId: itemDoc.id, // Add these for reference
                createdAt: data.createdAt || null
              });
            }
          });
        }
      }
      
      console.log(`Loaded ${fetchedActivities.length} activities from Firebase`);
      setActivities(fetchedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  })();
}, []);

  // Handle activity marker selection
  const handleActivitySelect = (activityId: string) => {
    // Find the selected activity
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      // Update selected activity and show modal
      setSelectedActivity(activity);
      setModalVisible(true);
    }
  };

  // Close the activity detail modal
  const handleCloseModal = () => {
    setModalVisible(false);
    // Clear the selected activity after animation completes
    setTimeout(() => setSelectedActivity(null), 300);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading activities…</Text>
      </SafeAreaView>
    );
  }

  // Use user location if available, otherwise use default
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

      {/* Map container without header */}
      <View style={styles.mapContainer}>
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
            {/* Debug: Log number of activities rendered */}
  {console.log("🎯 Rendering markers count:", activities.length)}

  {/* Debug: Log each activity */}
  {activities.map(act => {
    console.log("📍 Marker props:", {
      id: act.id,
      coordinate: act.startPoint,
      title: act.title,
      category: act.category,
      activity: act.activityType
    });
    return (
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
        onPress={handleActivitySelect}
      />
    );
  })}

  {/* Static test marker (always appears if working) */}
  <ActivityMarker
    id="test-marker"
    coordinate={{ latitude: 41.8967, longitude: 12.4822 }}
    title="Test"
    description="Test marker"
    category="Urban"
    activity="urban_hiking"
  />
          {/* Map markers for activities */}
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
              onPress={handleActivitySelect}
            />
          ))}
        </MapView>

        {/* Empty state message */}
        {activities.length === 0 && (
          <View style={styles.centerOverlay}>
            <Text style={styles.noActivitiesText}>No activities found yet!</Text>
          </View>
        )}

        {/* Activity Detail Modal */}
        <ActivityDetailModal
          visible={modalVisible}
          onClose={handleCloseModal}
          activity={selectedActivity ? {
            ...selectedActivity,
            coordinate: selectedActivity.startPoint  // Map startPoint to coordinate for the modal
          } : null}
        />
      </View>

      {/* Map controls */}
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
              mapRef.current?.animateToRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              });
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
  container: { 
    flex: 1 
  },
  mapContainer: { 
    flex: 1 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#666' 
  },
  map: { 
    flex: 1 
  },
  centerOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  noActivitiesText: { 
    fontSize: 16, 
    color: '#777' 
  },
  errorBanner: { 
    backgroundColor: '#ffcccc', 
    padding: 8, 
    alignItems: 'center' 
  },
  errorText: { 
    color: '#cc0000', 
    fontSize: 14 
  },
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
  }
});