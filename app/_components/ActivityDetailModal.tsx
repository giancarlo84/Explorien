// ActivityDetailModal.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { reverseGeocode } from '../utils/geoUtils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Define a consistent difficulty blocks component
const DifficultyBlocks = ({ value = 1 }) => {
  // Ensure value is a number
  const difficultyValue = Number(value) || 1;
  
  return (
    <View style={difficultyStyles.container}>
      <View style={difficultyStyles.tableContainer}>
        <View style={[difficultyStyles.tableRow, { borderRadius: 6, overflow: 'hidden' }]}>
          <View 
            style={[
              difficultyStyles.cell,
              { 
                backgroundColor: difficultyValue >= 1 ? '#32CD32' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
          />
          <View 
            style={[
              difficultyStyles.cell,
              { 
                backgroundColor: difficultyValue >= 2 ? '#b3ff00' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
          />
          <View 
            style={[
              difficultyStyles.cell,
              { 
                backgroundColor: difficultyValue >= 3 ? '#ffcc00' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
          />
          <View 
            style={[
              difficultyStyles.cell,
              { 
                backgroundColor: difficultyValue >= 4 ? '#ff8000' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
          />
          <View 
            style={[
              difficultyStyles.cell,
              { backgroundColor: difficultyValue >= 5 ? '#ff0000' : '#e0e0e0' }
            ]}
          />
        </View>
      </View>
    </View>
  );
};

// Helper functions
const getCategoryColor = (category) => {
  switch (category) {
    case 'Land': return '#4CAF50'; // Green
    case 'Water': return '#2196F3';  // Blue
    case 'Urban': return '#9E9E9E';  // Gray
    case 'Air': return '#FFD700';    // Yellow
    case 'Ice_Snow': return '#BBDEFB'; // Frosty Blue
    case 'ATV': return '#F44336';    // Red
    default: return '#FF5722';       // Default to orange
  }
};

const getCategoryIcon = (category) => {
  switch (category) {
    case 'Land': return 'mountain';
    case 'Water': return 'water';
    case 'Urban': return 'city';
    case 'Air': return 'wind';
    case 'Ice_Snow': return 'snowflake';
    case 'ATV': return 'truck-monster';
    default: return 'map-marker-alt';
  }
};

const formatActivityName = (activityName) => {
  if (!activityName) return '-';
  
  // Replace underscores with spaces and properly capitalize
  const formattedName = activityName.replace(/_/g, ' ');
  
  // Split into words and capitalize first letter of each word
  return formattedName.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getCategoryDisplayName = (categoryId) => {
  if (!categoryId) return '-';
  
  // Fix Ice_Snow to display as Ice/Snow
  if (categoryId === 'Ice_Snow') return 'Ice/Snow';
  
  // Fix ATV to display as All Terrain Vehicles
  if (categoryId === 'ATV') return 'All Terrain Vehicles';
  
  return categoryId;
};

const ActivityDetailModal = ({ visible, activity, onClose, onStart }) => {
  // Define all state variables at the top level
  const [locationNames, setLocationNames] = useState({});
  const [mapReady, setMapReady] = useState(false);
  const [fullActivity, setFullActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);
  
  // Fetch the complete activity data from Firestore when opened
  useEffect(() => {
    const fetchFullActivityData = async () => {
      if (!activity || !visible) return;
      
      try {
        setLoading(true);
        
        // Check if we have the necessary fields to locate the document
        if (activity.categoryId && activity.activityTypeId && activity.id) {
          console.log('Fetching full activity data from Firestore...');
          
          // Construct the path to the activity document
          const categoryId = activity.categoryId || activity.category;
          const activityTypeId = activity.activityTypeId || activity.activityType;
          const activityId = activity.id || activity.itemId;
          
          // Build the document reference path
          const activityPath = `categories/${categoryId}/activities/${activityTypeId}/items/${activityId}`;
          console.log('Activity document path:', activityPath);
          
          // Fetch the complete document
          const activityRef = doc(db, 'categories', categoryId, 'activities', activityTypeId, 'items', activityId);
          const activityDoc = await getDoc(activityRef);
          
          if (activityDoc.exists()) {
            const activityData = activityDoc.data();
            console.log('Found complete activity data:', activityData);
            
            // Merge with existing activity data to ensure we have everything
            setFullActivity({
              ...activity,
              ...activityData,
              id: activityId,
              categoryId: categoryId,
              activityTypeId: activityTypeId
            });
          } else {
            console.log('Activity document not found');
            // Use the basic activity data we already have
            setFullActivity(activity);
          }
        } else {
          console.log('Missing required fields to fetch full activity');
          setFullActivity(activity);
        }
      } catch (error) {
        console.error('Error fetching full activity data:', error);
        setFullActivity(activity);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFullActivityData();
  }, [activity?.id, visible]);
  
  // Create a normalized version of the activity data
  const processedActivity = useMemo(() => {
    if (!fullActivity) return null;
    
    // Handle images with file:// paths that might be from cache
    let galleryItems = [];
    if (fullActivity.gallery) {
      // If gallery is an array, process each item
      if (Array.isArray(fullActivity.gallery)) {
        galleryItems = fullActivity.gallery.filter(item => item); // Filter out null/undefined
      } 
      // If gallery is a single item
      else if (typeof fullActivity.gallery === 'string') {
        galleryItems = [fullActivity.gallery];
      }
    }
    
    // Get the creator name - simplified to just use what's available
    let creatorName = fullActivity.createdBy || "Explorien";
    
    // Create a normalized version of activity data that works with both old and new formats
    return {
      ...fullActivity,
      // Handle mode from either mode or locationType
      mode: fullActivity.mode || fullActivity.locationType || 'spot',
      
      // Handle location from multiple possible fields
      location: fullActivity.location || fullActivity.coordinate || fullActivity.startPoint,
      
      // Set difficulty with fallback
      difficulty: Number(fullActivity.difficulty) || 3,
      
      // Ensure spotRadius exists for spot mode
      spotRadius: fullActivity.spotRadius || 100,
      
      // Format creator info - simplified
      createdBy: creatorName,
      
      // Include tips if available and valid
      tips: (fullActivity.tips && fullActivity.tips !== "$") ? fullActivity.tips : null,
      
      // Ensure categoryId and activityTypeId
      categoryId: fullActivity.categoryId || fullActivity.category,
      activityTypeId: fullActivity.activityTypeId || fullActivity.activityType,
      
      // Make sure gallery is always processed properly
      gallery: galleryItems
    };
  }, [fullActivity]);
  
  // Effect to get location names for all points
useEffect(() => {
  const geocodeAllPoints = async () => {
    if (!processedActivity) return;
    
    const names = {};
    
    try {
      if (processedActivity.mode === 'checkpoints' && processedActivity.checkpoints?.length > 0) {
        // Geocode all checkpoints
        for (let i = 0; i < processedActivity.checkpoints.length; i++) {
          const checkpoint = processedActivity.checkpoints[i];
          try {
            const placeName = await reverseGeocode(checkpoint.latitude, checkpoint.longitude);
            names[`checkpoint_${i}`] = placeName;
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Error geocoding checkpoint ${i}:`, error);
            names[`checkpoint_${i}`] = null;
          }
        }
      } else if (processedActivity.mode === 'path' && processedActivity.route?.length > 0) {
        // Geocode start and end points
        const startPoint = processedActivity.route[0];
        const endPoint = processedActivity.route[processedActivity.route.length - 1];
        
        try {
          const startName = await reverseGeocode(startPoint.latitude, startPoint.longitude);
          names['start'] = startName;
        } catch (error) {
          names['start'] = null;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          const endName = await reverseGeocode(endPoint.latitude, endPoint.longitude);
          names['end'] = endName;
        } catch (error) {
          names['end'] = null;
        }
      } else if (processedActivity.location) {
        // Geocode single location for spot mode
        try {
          const placeName = await reverseGeocode(
            processedActivity.location.latitude,
            processedActivity.location.longitude
          );
          names['single'] = placeName;
        } catch (error) {
          names['single'] = null;
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    
    setLocationNames(names);
  };
  
  geocodeAllPoints();
}, [processedActivity?.id]);
  
  // Function to fit map to coordinates
  const fitMapToCoordinates = () => {
    if (!mapRef.current || !processedActivity || !processedActivity.location) return;
    
    const { location, mode, spotRadius } = processedActivity;
    
    // Different handling based on activity mode
    if (mode === 'spot') {
      // For spot mode, create points that encompass the radius
      const radiusInDegrees = (spotRadius || 100) / 111000; // Convert meters to rough degrees
      
      const edgePoints = [
        location,
        // North point
        {
          latitude: location.latitude + radiusInDegrees,
          longitude: location.longitude
        },
        // East point
        {
          latitude: location.latitude,
          longitude: location.longitude + radiusInDegrees
        },
        // South point
        {
          latitude: location.latitude - radiusInDegrees,
          longitude: location.longitude
        },
        // West point
        {
          latitude: location.latitude,
          longitude: location.longitude - radiusInDegrees
        }
      ];
      
      mapRef.current.fitToCoordinates(edgePoints, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: false
      });
    } 
    else if (mode === 'path' && processedActivity.route?.length > 0) {
      // For path mode, use all route coordinates
      mapRef.current.fitToCoordinates(processedActivity.route, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: false
      });
    }
    else if (mode === 'checkpoints' && processedActivity.checkpoints?.length > 0) {
      // For checkpoints mode, use all checkpoint coordinates
      mapRef.current.fitToCoordinates(processedActivity.checkpoints, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: false
      });
    }
  };
  
  // Helper function to render map elements
  const renderMapElements = () => {
    return (
      <>
        {/* Spot circle */}
        {processedActivity.mode === 'spot' && 
          processedActivity.location && 
          processedActivity.spotRadius && (
          <Circle
            center={{
              latitude: processedActivity.location.latitude,
              longitude: processedActivity.location.longitude
            }}
            radius={processedActivity.spotRadius}
            fillColor="rgba(0, 122, 255, 0.15)"
            strokeColor="rgba(0, 122, 255, 0.8)"
            strokeWidth={3}
          />
        )}
        
        {/* Draw a polyline for route if it exists and is in path mode */}
        {processedActivity.mode === 'path' && processedActivity.route?.length > 0 && (
          <Polyline
            coordinates={processedActivity.route}
            strokeWidth={4}
            strokeColor="#2a9d8f"
          />
        )}
        
        {/* Display route start and end markers for path mode */}
        {processedActivity.mode === 'path' && processedActivity.route?.length > 0 && (
          <>
            <Marker
              coordinate={processedActivity.route[0]}
              title="Start"
              pinColor="green"
            />
            {processedActivity.route.length > 1 && (
              <Marker
                coordinate={processedActivity.route[processedActivity.route.length-1]}
                title="Finish"
                pinColor="red"
              />
            )}
          </>
        )}
        
        {/* Display checkpoint markers with numbers and connect them with a line */}
        {processedActivity.mode === 'checkpoints' && processedActivity.checkpoints?.length > 0 && (
          <>
            {/* Connect checkpoints with a line */}
            <Polyline
              coordinates={processedActivity.checkpoints}
              strokeWidth={3}
              strokeColor="purple"
              lineDashPattern={[5, 5]}
            />
            
            {/* Display individual checkpoint markers with colors based on position */}
            {processedActivity.checkpoints.map((cp, idx) => (
              <Marker
                key={`checkpoint-${idx}`}
                coordinate={cp}
                title={idx === 0 ? "Start" : idx === processedActivity.checkpoints.length - 1 ? "Finish" : `Checkpoint ${idx}`}
                pinColor={idx === 0 ? "green" : idx === processedActivity.checkpoints.length - 1 ? "red" : "yellow"}
              />
            ))}
          </>
        )}
      </>
    );
  };
  
  // Handle map ready event
  const handleMapReady = () => {
    setMapReady(true);
    setTimeout(fitMapToCoordinates, 300);
  };
  
  // Early return if no activity
  if (!processedActivity) return null;
  
  // Get location text with geocoded names
const getLocationText = () => {
  // For path mode, show start and end names
  if (processedActivity.mode === 'path' && processedActivity.route?.length > 0) {
    const startPoint = processedActivity.route[0];
    const endPoint = processedActivity.route[processedActivity.route.length - 1];
    
    const startText = locationNames['start'] || `${startPoint.latitude.toFixed(6)}, ${startPoint.longitude.toFixed(6)}`;
    const endText = locationNames['end'] || `${endPoint.latitude.toFixed(6)}, ${endPoint.longitude.toFixed(6)}`;
    
    return `${startText} (Start) → ${endText} (Finish)`;
  }
  
  // For checkpoints mode, show ALL checkpoint names
  if (processedActivity.mode === 'checkpoints' && processedActivity.checkpoints?.length > 0) {
    const checkpoints = processedActivity.checkpoints;
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
  return locationNames['single'] || (processedActivity.location 
    ? `${processedActivity.location.latitude.toFixed(6)}, ${processedActivity.location.longitude.toFixed(6)}`
    : 'Unknown location');
};
  
  // Get mode text
  const getModeText = () => {
    const mode = processedActivity.mode;
    if (!mode) return 'Not Specified';
    
    switch (mode.toLowerCase()) {
      case 'path': return 'Path';
      case 'spot': return 'Spot';
      case 'checkpoints': return 'Checkpoints';
      default: return mode.charAt(0).toUpperCase() + mode.slice(1);
    }
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header bar with category color */}
        <View style={[
          styles.header, 
          { backgroundColor: getCategoryColor(processedActivity.category) }
        ]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesome5 name="times" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {formatActivityName(processedActivity.activityType) === 'Sxs' 
              ? 'SxS' 
              : formatActivityName(processedActivity.activityType)}
          </Text>
          
          <View style={styles.headerIcon}>
            <FontAwesome5 
              name={getCategoryIcon(processedActivity.category)} 
              size={24} 
              color="white" 
            />
          </View>
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Title and Creator */}
          <Text style={styles.title}>{processedActivity.title}</Text>
          
          {/* Creator info - just username */}
          <Text style={styles.creatorText}>
            Created by: {processedActivity.createdBy}
          </Text>
          
          {/* Determine if we have an image */}
          {processedActivity.gallery && processedActivity.gallery.length > 0 ? (
            <>
              {/* Featured Image */}
              <View style={styles.imageContainer}>
                <Image 
                  source={{ 
                    uri: processedActivity.gallery[0],
                    cache: 'reload'
                  }} 
                  style={styles.featuredImage}
                  resizeMode="cover"
                />
              </View>
              
              {/* Description section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>
                  {processedActivity.description || 'No description provided.'}
                </Text>
              </View>
              
              {/* Tips section - only display if tips exist */}
              {processedActivity.tips && processedActivity.tips !== "$" && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tips</Text>
                  <Text style={styles.description}>{processedActivity.tips}</Text>
                </View>
              )}
              
              {/* Activity Details Container */}
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mode</Text>
                  <Text style={styles.detailValue}>{getModeText()}</Text>
                </View>
                
                {/* Radius or Distance - now before Location */}
                {processedActivity.mode === 'spot' && processedActivity.spotRadius && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Radius</Text>
                    <Text style={styles.detailValue}>{processedActivity.spotRadius} m</Text>
                  </View>
                )}
                
                {processedActivity.mode !== 'spot' && processedActivity.distanceKm && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{processedActivity.distanceKm} km</Text>
                  </View>
                )}
                
                {/* Location section - now after Radius/Distance */}
<View style={styles.detailRow}>
  <Text style={styles.detailLabel}>Location</Text>
  <Text style={[styles.detailValue, {flex: 1, textAlign: 'right', maxWidth: '75%'}]} numberOfLines={5}>
    {getLocationText()}
  </Text>
</View>
                
                {/* Difficulty section */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Difficulty</Text>
                  <View style={styles.inlineBlocksContainer}>
                    <DifficultyBlocks value={processedActivity.difficulty} />
                  </View>
                </View>
              </View>
              
              {/* Map at bottom when image exists */}
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: processedActivity.location?.latitude || 0,
                    longitude: processedActivity.location?.longitude || 0,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  onMapReady={handleMapReady}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                  mapType="terrain"
                  customMapStyle={[
                    {
                      "featureType": "poi",
                      "elementType": "labels",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "featureType": "poi",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "featureType": "transit",
                      "stylers": [{ "visibility": "off" }]
                    }
                  ]}
                >
                  {/* Map elements here */}
                  {renderMapElements()}
                </MapView>
              </View>
            </>
          ) : (
            <>
              {/* Map at top when no image */}
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: processedActivity.location?.latitude || 0,
                    longitude: processedActivity.location?.longitude || 0,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  onMapReady={handleMapReady}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                  mapType="terrain"
                  customMapStyle={[
                    {
                      "featureType": "poi",
                      "elementType": "labels",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "featureType": "poi",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "featureType": "transit",
                      "stylers": [{ "visibility": "off" }]
                    }
                  ]}
                >
                  {/* Map elements here */}
                  {renderMapElements()}
                </MapView>
              </View>
              
              {/* Description section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>
                  {processedActivity.description || 'No description provided.'}
                </Text>
              </View>
              
              {/* Tips section - only display if tips exist */}
              {processedActivity.tips && processedActivity.tips !== "$" && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tips</Text>
                  <Text style={styles.description}>{processedActivity.tips}</Text>
                </View>
              )}
              
              {/* Activity Details Container */}
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mode</Text>
                  <Text style={styles.detailValue}>{getModeText()}</Text>
                </View>
                
                {/* Radius or Distance - now before Location */}
                {processedActivity.mode === 'spot' && processedActivity.spotRadius && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Radius</Text>
                    <Text style={styles.detailValue}>{processedActivity.spotRadius} m</Text>
                  </View>
                )}
                
                {processedActivity.mode !== 'spot' && processedActivity.distanceKm && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{processedActivity.distanceKm} km</Text>
                  </View>
                )}
                
                {/* Location section - now after Radius/Distance */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={[styles.detailValue, {flex: 1, textAlign: 'right'}]}>
                    {getLocationText()}
                  </Text>
                </View>
                
                {/* Difficulty section */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Difficulty</Text>
                  <View style={styles.inlineBlocksContainer}>
                    <DifficultyBlocks value={processedActivity.difficulty} />
                  </View>
                </View>
              </View>
            </>
          )}
          
          {/* Start button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              if (onStart) {
                onStart(processedActivity);
              } else {
                router.push({
                  pathname: '/screens/ActivityTracker',
                  params: { 
                    activityId: processedActivity.id,
                    categoryId: processedActivity.categoryId || processedActivity.category,
                    activityTypeId: processedActivity.activityTypeId || processedActivity.activityType
                  }
                });
              }
            }}
          >
            <FontAwesome5 name="play" size={18} color="white" style={styles.startIcon} />
            <Text style={styles.startButtonText}>Start Activity</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#FF5722', // Default to orange
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    // Add text shadow
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  closeButton: {
    padding: 5,
  },
  headerIcon: {
    padding: 5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  creatorText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic'
  },
  imageContainer: {
    height: 200,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  mapContainer: {
    height: 240,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  detailText: {
    fontSize: 16,
    color: '#555',
  },
  startButton: {
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startIcon: {
    marginRight: 8,
  },
  // New styles for improved details display
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
    alignItems: 'flex-start',
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
});

const difficultyStyles = StyleSheet.create({
  container: {
    height: 30,
  },
  tableContainer: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  tableRow: {
    flexDirection: 'row',
    height: 30,
    padding: 0,
    margin: 0,
    gap: 0,
  },
  cell: {
    flex: 1,
    height: 30,
    margin: 0,
    padding: 0,
    borderWidth: 0.5,
    borderColor: '#f5f5f5',
  },
});

export default ActivityDetailModal;


