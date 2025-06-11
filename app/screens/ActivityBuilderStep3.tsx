// app/screens/ActivityBuilderStep3.tsx
import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { ActivityBuilderContext } from '../_context/ActivityBuilderContext';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { reverseGeocode } from '../utils/geoUtils';
import { useAuth } from '../_context/AuthContext';

// Create read-only difficulty blocks component
const ReadOnlyDifficultyBlocks = ({ value }) => {
  return (
    <View style={readOnlyStyles.container}>
      <View style={readOnlyStyles.tableContainer}>
        <View style={[readOnlyStyles.tableRow, { overflow: 'hidden', borderRadius: 6 }]}>
          <View 
            style={[
              readOnlyStyles.cell,
              { 
                backgroundColor: value >= 1 ? '#32CD32' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
          />
          <View 
            style={[
              readOnlyStyles.cell,
              { 
                backgroundColor: value >= 2 ? '#b3ff00' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
          />
          <View 
            style={[
              readOnlyStyles.cell,
              { 
                backgroundColor: value >= 3 ? '#ffcc00' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
          />
          <View 
            style={[
              readOnlyStyles.cell,
              { 
                backgroundColor: value >= 4 ? '#ff8000' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
          />
          <View 
            style={[
              readOnlyStyles.cell,
              { backgroundColor: value >= 5 ? '#ff0000' : '#e0e0e0' }
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const ActivityBuilderStep3 = () => {
  const activityBuilderContext = useContext(ActivityBuilderContext);
  const router = useRouter();
  const { user } = useAuth();
  const [publishing, setPublishing] = useState(false);
  
  // State for storing location name and loading status
  const [locationNames, setLocationNames] = useState({});
const [locationLoading, setLocationLoading] = useState(false);
  
  // Map refs for auto-zoom functionality
  const mapRef1 = useRef(null); // Map when no image
  const mapRef2 = useRef(null); // Map when image exists
  
  // Create a safer reference to context data
  const builderState = activityBuilderContext?.builderState;
  
  // Function to fit map to coordinates with proper padding
  const fitMapToCoordinates = (mapRef) => {
    if (!mapRef || !mapRef.current || !builderState) return;
    
    // Collect all coordinates to fit based on mode
    let coordinates = [];
    
    if (builderState.mode === 'spot' && builderState.location) {
      // For spot mode, we need to create coordinates that properly encompass the radius
      const spotRadius = builderState.spotRadius || 100;
      
      // Calculate additional points around the circle to ensure the entire radius is visible
      const radiusInDegrees = spotRadius / 111000; // Rough conversion from meters to degrees
      
      // Create points around the circle to ensure the whole radius is visible
      coordinates = [
        builderState.location,
        // North point
        {
          latitude: builderState.location.latitude + radiusInDegrees,
          longitude: builderState.location.longitude
        },
        // East point
        {
          latitude: builderState.location.latitude,
          longitude: builderState.location.longitude + radiusInDegrees
        },
        // South point
        {
          latitude: builderState.location.latitude - radiusInDegrees,
          longitude: builderState.location.longitude
        },
        // West point
        {
          latitude: builderState.location.latitude,
          longitude: builderState.location.longitude - radiusInDegrees
        }
      ];
      
      // Fit the map to include all the radius boundary points
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: false
      });
    } 
    else if (builderState.mode === 'path' && builderState.route?.length > 0) {
      // For path mode, use all route coordinates
      coordinates = builderState.route;
      
      // Fit the map to coordinates with edge padding
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: false
      });
    }
    else if (builderState.mode === 'checkpoints' && builderState.checkpoints?.length > 0) {
      // For checkpoints mode, use all checkpoint coordinates
      coordinates = builderState.checkpoints;
      
      // Fit the map to coordinates with edge padding
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: false
      });
    }
  };

  // Effect to fit maps to coordinates when component mounts or builderState changes
  useEffect(() => {
    // Short delay to ensure maps are ready
    setTimeout(() => {
      if (mapRef1.current) {
        fitMapToCoordinates(mapRef1);
      }
      if (mapRef2.current) {
        fitMapToCoordinates(mapRef2);
      }
    }, 500);
  }, [builderState]);
  
  // Effect to get location name when location changes
useEffect(() => {
  const getLocationName = async () => {
    if (!builderState) return;
    
    // For spot mode
    if (builderState.mode === 'spot' && builderState.location) {
      try {
        setLocationLoading(true);
        console.log('Attempting to geocode spot location...', builderState.location);
        
        const placeName = await reverseGeocode(
          builderState.location.latitude, 
          builderState.location.longitude
        );
        
        console.log('Geocoding result for spot:', placeName);
        setLocationNames(prev => ({ ...prev, single: placeName }));
        setLocationLoading(false);
      } catch (error) {
        console.error('Failed to geocode spot location:', error);
        setLocationNames(prev => ({ ...prev, single: null }));
        setLocationLoading(false);
      }
    }
    // For path mode
    else if (builderState.mode === 'path' && builderState.route?.length > 0) {
      try {
        setLocationLoading(true);
        const startPoint = builderState.route[0];
        const endPoint = builderState.route[builderState.route.length - 1];
        
        console.log('Geocoding start point...', startPoint);
        const startName = await reverseGeocode(startPoint.latitude, startPoint.longitude);
        
        if (builderState.route.length > 1) {
          console.log('Geocoding end point...', endPoint);
          const endName = await reverseGeocode(endPoint.latitude, endPoint.longitude);
          setLocationNames(prev => ({ 
            ...prev, 
            start: startName, 
            end: endName 
          }));
        } else {
          setLocationNames(prev => ({ 
            ...prev, 
            start: startName 
          }));
        }
        setLocationLoading(false);
      } catch (error) {
        console.error('Failed to geocode path locations:', error);
        setLocationNames(prev => ({ ...prev, start: null, end: null }));
        setLocationLoading(false);
      }
    }
    // For checkpoints mode
    else if (builderState.mode === 'checkpoints' && builderState.checkpoints?.length > 0) {
      try {
        setLocationLoading(true);
        const checkpoints = builderState.checkpoints;
        const newLocationNames = {};
        
        // Geocode each checkpoint
        for (let i = 0; i < checkpoints.length; i++) {
          try {
            const placeName = await reverseGeocode(
              checkpoints[i].latitude, 
              checkpoints[i].longitude
            );
            newLocationNames[`checkpoint_${i}`] = placeName;
          } catch (error) {
            console.error(`Failed to geocode checkpoint ${i}:`, error);
            newLocationNames[`checkpoint_${i}`] = null;
          }
        }
        
        setLocationNames(prev => ({ ...prev, ...newLocationNames }));
        setLocationLoading(false);
      } catch (error) {
        console.error('Failed to geocode checkpoint locations:', error);
        setLocationLoading(false);
      }
    }
  };
  
  getLocationName();
}, [builderState?.mode, builderState?.location, builderState?.route, builderState?.checkpoints]);
  
  // Format activity name to remove underscores and capitalize
  const formatActivityName = (activityName) => {
    if (!activityName) return '-';
    
    // Replace underscores with spaces and properly capitalize
    const formattedName = activityName.replace(/_/g, ' ');
    
    // Split into words and capitalize first letter of each word
    return formattedName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Get category display name
  const getCategoryDisplayName = (categoryId) => {
    if (!categoryId) return '-';
    
    // Fix Ice_Snow to display as Ice/Snow
    if (categoryId === 'Ice_Snow') return 'Ice/Snow';
    
    // Fix ATV to display as All Terrain Vehicles
    if (categoryId === 'ATV') return 'All Terrain Vehicles';
    
    return categoryId;
  };
  
  // Get mode text
  const getModeText = () => {
    if (!builderState) return '-';
    
    switch (builderState.mode) {
      case 'path': return 'Path';
      case 'spot': return 'Spot';
      case 'checkpoints': return 'Checkpoints';
      default: return '-';
    }
  };
  
  // Get distance/radius text
  const getDistanceText = () => {
    if (!builderState) return '-';
    
    if (builderState.mode === 'spot' && builderState.spotRadius) {
      return `${builderState.spotRadius} m`;
    } else if ((builderState.mode === 'path' || builderState.mode === 'checkpoints') && builderState.distanceKm) {
      return `${builderState.distanceKm} km`;
    } else {
      return '-';
    }
  };
  
  // Define marker colors for specific types
  const getMarkerColor = (index, total, type) => {
    // For checkpoints
    if (type === 'checkpoint') {
      if (index === 0) return 'green'; // Start
      if (index === total - 1) return 'red'; // End
      return 'yellow'; // Middle checkpoints
    }
    
    // For route points
    if (index === 0) return 'green'; // Start
    if (index === total - 1) return 'red'; // End
    return 'blue'; // Middle points
  };
  
  // Get location display text with geocoded names
const getLocationDisplayText = () => {
  if (locationLoading) {
    return 'Loading location...';
  }
  
  if (!builderState) return 'No location';
  
  // For path mode, show start and end names
  if (builderState.mode === 'path' && builderState.route?.length > 0) {
    const startPoint = builderState.route[0];
    const endPoint = builderState.route[builderState.route.length - 1];
    
    const startText = locationNames['start'] || `${startPoint.latitude.toFixed(6)}, ${startPoint.longitude.toFixed(6)}`;
    const endText = locationNames['end'] || `${endPoint.latitude.toFixed(6)}, ${endPoint.longitude.toFixed(6)}`;
    
    return `${startText} (Start) → ${endText} (Finish)`;
  }
  
  // For checkpoints mode, show ALL checkpoint names
  if (builderState.mode === 'checkpoints' && builderState.checkpoints?.length > 0) {
    const checkpoints = builderState.checkpoints;
    let locationText = '';
    
    for (let i = 0; i < checkpoints.length; i++) {
      const checkpoint = checkpoints[i];
      const placeName = locationNames[`checkpoint_${i}`];
      
      let pointText;
      if (placeName) {
        pointText = placeName;
      } else {
        pointText = `${checkpoint.latitude.toFixed(6)}, ${checkpoint.longitude.toFixed(6)}`;
      }
      
      // Add appropriate label
      if (i === 0) {
        pointText += ' (Start)';
      } else if (i === checkpoints.length - 1) {
        pointText += ' (Finish)';
      } else {
        pointText += ` (CP${i})`;
      }
      
      if (i === 0) {
        locationText = pointText;
      } else {
        locationText += ` → ${pointText}`;
      }
    }
    
    return locationText;
  }
  
  // For spot mode, show single location name
  if (builderState.mode === 'spot' && builderState.location) {
    return locationNames['single'] || `${builderState.location.latitude.toFixed(6)}, ${builderState.location.longitude.toFixed(6)}`;
  }
  
  return 'No location';
};
  
  const confirmPublish = () => {
    Alert.alert(
      'Publish Activity', 
      'Are you sure you want to publish this activity?', 
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: handlePublish },
      ]
    );
  };

  const handlePublish = async () => {
  if (!builderState) {
    Alert.alert('Error', 'Activity data is not available');
    return;
  }
  
  try {
    setPublishing(true);
    
    // Get the current authenticated user
    const currentUser = auth.currentUser;
    
    // Log user object for debugging
    console.log("Current user object:", currentUser ? JSON.stringify({
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      email: currentUser.email,
      providerId: currentUser.providerId
    }) : "No user");
    
    // First check if we have a valid user
    if (!currentUser || !currentUser.uid) {
      console.error("No authenticated user found or missing UID");
      Alert.alert('Authentication Error', 'Please sign in again before publishing an activity');
      setPublishing(false);
      return;
    }
    
    // Try to get the user's profile from Firestore
    let userDisplayName = "Unnamed Explorer";
    let userPhotoURL = null;
    
    try {
      // Get the user document from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
  const userData = userDoc.data();
  
  // Get the display name from the user document if available
  if (userData.displayName) {
    userDisplayName = userData.displayName;
  } else if (userData.username) {
    // Use username as fallback if no displayName
    userDisplayName = userData.username;
  }
  
  // Use profile photo if available
  if (userData.photoURL) {
    userPhotoURL = userData.photoURL;
  }
  console.log(`Found user profile in Firestore: ${userDisplayName}`);
      } else {
        console.log(`No user document found for uid: ${currentUser.uid}`);
      }
    } catch (userError) {
      console.error("Error fetching user data:", userError);
      // Continue with default values since this isn't critical
    }
    
    // If Firestore doesn't have a name but Auth does, use that
    if (userDisplayName === "Unnamed Explorer" && currentUser.displayName) {
      userDisplayName = currentUser.displayName;
    }
    
    // If no photo URL from Firestore but Auth has one, use that
    if (!userPhotoURL && currentUser.photoURL) {
      userPhotoURL = currentUser.photoURL;
    }
    
    // Format activity data with improved user attribution
    const activity = {
      title: builderState.title,
      description: builderState.description,
      tips: builderState.tips,
      category: builderState.category,
      activityType: builderState.activityType,
      mode: builderState.mode,
      difficulty: builderState.difficulty,
      distanceKm: builderState.distanceKm,
      spotRadius: builderState.spotRadius,
      location: builderState.location,
      route: builderState.route || null,
      checkpoints: builderState.checkpoints || [],
      gallery: builderState.gallery || [],
      createdAt: serverTimestamp(),
      
      // Set all user properties reliably
      createdBy: userDisplayName,
      createdByUid: currentUser.uid,
      createdByEmail: currentUser.email || null,
      createdByPhotoURL: userPhotoURL
    };
    
    console.log("Activity data being published:", {
      title: activity.title,
      createdBy: activity.createdBy,
      createdByUid: activity.createdByUid,
      createdByEmail: activity.createdByEmail
    });
    
    // Calculate start point
    if (builderState.mode === 'spot' && builderState.location) {
      activity.startPoint = builderState.location;
    } else if (builderState.mode === 'path' && builderState.route && builderState.route.length > 0) {
      activity.startPoint = builderState.route[0];
    } else if (builderState.mode === 'checkpoints' && builderState.checkpoints && builderState.checkpoints.length > 0) {
      activity.startPoint = builderState.checkpoints[0];
    }
    
    // Build the path
    const categoryRef = doc(db, 'categories', builderState.category);
    const activityTypeRef = doc(collection(categoryRef, 'activities'), builderState.activityType);
    const itemsCollectionRef = collection(activityTypeRef, 'items');
    
    console.log(`Publishing to path: categories/${builderState.category}/activities/${builderState.activityType}/items/[auto-id]`);
    
    // Add the document to the items collection
    const docRef = await addDoc(itemsCollectionRef, activity);
    
    console.log(`Activity published with ID: ${docRef.id}`);
    
    router.replace('/screens/ActivityCreatedScreen');
  } catch (err) {
    console.error('Error publishing activity:', err);
    Alert.alert('Error', err.message || 'Failed to publish activity');
  } finally {
    setPublishing(false);
  }
};

  // Determine if we should show the map at the top (no image) or bottom (has image)
  const hasImage = builderState && !!builderState.gallery?.[0];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!builderState ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading activity data...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.pageTitle}>Preview Your Activity</Text>
          
          {/* Title always at the top */}
          <Text style={styles.activityTitle}>{builderState.title || 'Untitled Activity'}</Text>

          {/* Show map at top if no image */}
          {!hasImage && (
            <View style={styles.mapContainer}>
              <MapView 
                ref={mapRef1}
                style={styles.map} 
                initialRegion={null}
                provider={PROVIDER_GOOGLE}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                mapType="terrain"
                onMapReady={() => fitMapToCoordinates(mapRef1)}
              >
                {/* Display spot radius circle */}
                {builderState.mode === 'spot' && builderState.location && (
                  <Circle
                    center={builderState.location}
                    radius={builderState.spotRadius || 100}
                    fillColor="rgba(0, 122, 255, 0.15)"
                    strokeColor="rgba(0, 122, 255, 0.8)"
                    strokeWidth={3}
                  />
                )}
                
                {/* Draw a polyline for route if it exists and is in path mode */}
                {builderState.mode === 'path' && builderState.route?.length > 0 && (
                  <Polyline
                    coordinates={builderState.route}
                    strokeWidth={4}
                    strokeColor="#2a9d8f"
                  />
                )}
                
                {/* Display route start and end markers for path mode */}
                {builderState.mode === 'path' && builderState.route?.length > 0 && (
                  <>
                    <Marker
                      coordinate={builderState.route[0]}
                      title="Start"
                      pinColor="green"
                    />
                    {builderState.route.length > 1 && (
                      <Marker
                        coordinate={builderState.route[builderState.route.length-1]}
                        title="Finish"
                        pinColor="red"
                      />
                    )}
                  </>
                )}
                
                {/* Display checkpoint markers with numbers and connect them with a line */}
                {builderState.mode === 'checkpoints' && builderState.checkpoints?.length > 0 && (
                  <>
                    {/* Connect checkpoints with a line */}
                    <Polyline
                      coordinates={builderState.checkpoints}
                      strokeWidth={3}
                      strokeColor="purple"
                      lineDashPattern={[5, 5]}
                    />
                    
                    {/* Display individual checkpoint markers with colors based on position */}
                    {builderState.checkpoints.map((cp, idx) => (
                      <Marker
                        key={`checkpoint-${idx}`}
                        coordinate={cp}
                        title={idx === 0 ? "Start" : idx === builderState.checkpoints.length - 1 ? "Finish" : `Checkpoint ${idx}`}
                        pinColor={getMarkerColor(idx, builderState.checkpoints.length, 'checkpoint')}
                      />
                    ))}
                  </>
                )}
              </MapView>
            </View>
          )}

          {/* Show image if available */}
          {hasImage && (
            <Image
              style={styles.image}
              source={{ uri: builderState.gallery[0] }}
              resizeMode="cover"
            />
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{builderState.description || 'No description provided'}</Text>
            
            {/* Tips section - only show if tips exist */}
            {builderState.tips && (
              <View style={styles.tipsContainer}>
                <Text style={styles.sectionLabel}>Tips</Text>
                <Text style={styles.descriptionText}>{builderState.tips}</Text>
              </View>
            )}
          </View>
          
          {/* Activity Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{getCategoryDisplayName(builderState.category) || '-'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Activity</Text>
              <Text style={styles.detailValue}>{formatActivityName(builderState.activityType) || '-'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mode</Text>
              <Text style={styles.detailValue}>{getModeText()}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {builderState.mode === 'spot' ? 'Radius' : 'Distance'}
              </Text>
              <Text style={styles.detailValue}>{getDistanceText()}</Text>
            </View>
            
            {/* Location information with simplified display */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={[styles.detailValue, {flex: 1, textAlign: 'right'}]}>
                {getLocationDisplayText()}
              </Text>
            </View>
            
            {/* Difficulty inside the details container */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Difficulty</Text>
              <View style={styles.inlineBlocksContainer}>
                <ReadOnlyDifficultyBlocks 
                  value={builderState.difficulty || 1}
                />
              </View>
            </View>
          </View>

          {/* Show map at bottom if image is displayed at top */}
          {hasImage && (
            <View style={styles.mapContainer}>
              <MapView 
                ref={mapRef2}
                style={styles.map} 
                initialRegion={null}
                provider={PROVIDER_GOOGLE}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                mapType="terrain"
                onMapReady={() => fitMapToCoordinates(mapRef2)}
              >
                {/* Display spot radius circle */}
                {builderState.mode === 'spot' && builderState.location && (
                  <Circle
                    center={builderState.location}
                    radius={builderState.spotRadius || 100}
                    fillColor="rgba(0, 122, 255, 0.15)"
                    strokeColor="rgba(0, 122, 255, 0.8)"
                    strokeWidth={3}
                  />
                )}
                
                {/* Draw a polyline for route if it exists and is in path mode */}
                {builderState.mode === 'path' && builderState.route?.length > 0 && (
                  <Polyline
                    coordinates={builderState.route}
                    strokeWidth={4}
                    strokeColor="#2a9d8f"
                  />
                )}
                
                {/* Display route start and end markers for path mode */}
                {builderState.mode === 'path' && builderState.route?.length > 0 && (
                  <>
                    <Marker
                      coordinate={builderState.route[0]}
                      title="Start"
                      pinColor="green"
                    />
                    {builderState.route.length > 1 && (
                      <Marker
                        coordinate={builderState.route[builderState.route.length-1]}
                        title="Finish"
                        pinColor="red"
                      />
                    )}
                  </>
                )}
                
                {/* Display checkpoint markers with numbers and connect them with a line */}
                {builderState.mode === 'checkpoints' && builderState.checkpoints?.length > 0 && (
                  <>
                    {/* Connect checkpoints with a line */}
                    <Polyline
                      coordinates={builderState.checkpoints}
                      strokeWidth={3}
                      strokeColor="purple"
                      lineDashPattern={[5, 5]}
                    />
                    
                    {/* Display individual checkpoint markers with colors based on position */}
                    {builderState.checkpoints.map((cp, idx) => (
                      <Marker
                        key={`checkpoint-${idx}`}
                        coordinate={cp}
                        title={idx === 0 ? "Start" : idx === builderState.checkpoints.length - 1 ? "Finish" : `Checkpoint ${idx}`}
                        pinColor={getMarkerColor(idx, builderState.checkpoints.length, 'checkpoint')}
                      />
                    ))}
                  </>
                )}
              </MapView>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.publishButton, publishing && styles.disabledButton]} 
              onPress={confirmPublish}
              disabled={publishing}
            >
              <Text style={styles.publishButtonText}>
                {publishing ? 'PUBLISHING...' : 'PUBLISH ACTIVITY'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.backButton]} 
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>BACK TO EDIT</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    padding: 16, 
    backgroundColor: '#fff',
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  activityTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  mapContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  map: { 
    height: 240,
    width: '100%',
    borderRadius: 8,
  },
  image: { 
    width: '100%', 
    height: 240, 
    borderRadius: 8, 
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  descriptionText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
  },
  detailsContainer: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  inlineBlocksContainer: {
    width: '70%',
    height: 36,
    overflow: 'hidden',
  },
  tipsContainer: {
    marginTop: 20,
  },
  loadingContainer: {
    padding: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#555',
  },
  actionsContainer: {
    marginTop: 24,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  publishButton: {
    backgroundColor: '#2196F3',
  },
  publishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#9e9e9e',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  }
});

const readOnlyStyles = StyleSheet.create({
  container: {
    padding: 0,
    height: 26,
  },
  tableContainer: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  tableRow: {
    flexDirection: 'row',
    height: 26,
    padding: 0,
    margin: 0,
    gap: 0,
  },
  cell: {
    flex: 1,
    height: 26,
    margin: 0,
    padding: 0,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
  },
});

export default ActivityBuilderStep3;