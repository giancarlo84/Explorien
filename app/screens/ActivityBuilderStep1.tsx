import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, ScrollView } from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { ActivityBuilderContext } from '../_context/ActivityBuilderContext';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useAuth } from '../_context/AuthContext';

// ─── Firebase imports ─────────────────────────────────────
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
// ─────────────────────────────────────────────────────────

export default function ActivityBuilderStep1() {
  // Permission check
  const { userRole } = useAuth();
  const canUseBuilder = userRole === 'pathfinder' || userRole === 'expeditionary' || userRole === 'admin';
  const router = useRouter();
  
  // Redirect if not authorized
  useEffect(() => {
    if (!canUseBuilder) {
      Alert.alert(
        'Feature Restricted',
        'The Activity Builder is only available to Pathfinders, Expeditionaries, and Admins.',
        [{ text: 'Upgrade Account', onPress: () => router.replace('/upgrade') }]
      );
    }
  }, [canUseBuilder, router]);
  
  // Return null if not authorized to prevent rendering the builder
  if (!canUseBuilder) {
    return null;
  }
  
  // Debug flag - turn on to see detailed logs
  const DEBUG = true;
  
  const log = (...args) => {
    if (DEBUG) {
      console.log('🔍 ActivityBuilderStep1:', ...args);
    }
  };

  const { builderState, setBuilderState } = useContext(ActivityBuilderContext);

  // Safe initial states with proper validation
  const getValidCoordinates = (coords) => {
    if (!coords || !Array.isArray(coords)) {
      return [];
    }
    return coords.filter(c => 
      c && typeof c.latitude === 'number' && typeof c.longitude === 'number'
    );
  };

  const getValidCoordinate = (coord) => {
    if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
      return null;
    }
    return coord;
  };

  // State setup with safe defaults
  const [recording, setRecording] = useState(false);
  const [path, setPath] = useState(
    getValidCoordinates(builderState.route)
  );
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [checkpointDistance, setCheckpointDistance] = useState(0);

  // Map configuration
  const [userLocation, setUserLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Spot mode additions
  const [spotRadius, setSpotRadius] = useState(100); // Default radius in meters
  const [spotRadiusText, setSpotRadiusText] = useState('100');

  // Checkpoints state with safe initialization
  const [checkpoints, setCheckpoints] = useState(
    getValidCoordinates(builderState.checkpoints)
  );

  // Determine initial mode based on existing data
  const determineInitialMode = () => {
    if (builderState.route && Array.isArray(builderState.route) && builderState.route.length > 0) {
      return 'path';
    }
    if (builderState.checkpoints && Array.isArray(builderState.checkpoints) && builderState.checkpoints.length > 0) {
      return 'checkpoints';
    }
    return 'spot';
  };

  const [locationMode, setLocationMode] = useState(
    determineInitialMode()
  );
  
  // Safe spot initialization
  const [spot, setSpot] = useState(
    getValidCoordinate(builderState.location)
  );
  
  const watchId = useRef(null);
  const timerRef = useRef(null);
  const mapRef = useRef(null);

  // Calculate distance between checkpoints
  useEffect(() => {
    if (locationMode === 'checkpoints' && checkpoints.length > 1) {
      let total = 0;
      
      for (let i = 0; i < checkpoints.length - 1; i++) {
        total += getDistance(checkpoints[i], checkpoints[i + 1]);
      }
      
      setCheckpointDistance(total);
      log('Updated checkpoint distance:', total);
    } else if (locationMode === 'checkpoints') {
      setCheckpointDistance(0);
    }
  }, [checkpoints, locationMode]);

  // Reset checkpoints when changing modes
  useEffect(() => {
    // Reset checkpoints when switching to checkpoint mode
    if (locationMode === 'checkpoints') {
      setCheckpoints([]);
      setCheckpointDistance(0);
    }
  }, [locationMode]);

  // Log initial state for debugging
  useEffect(() => {
    log('Initial state:', { 
      locationMode, 
      spot, 
      path: path.length,
      checkpoints: checkpoints.length
    });
    
    // Cleanup on unmount
    return () => {
      if (watchId.current) {
        watchId.current.remove();
        watchId.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Initialize and track user location
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          log('Location permission denied');
          Alert.alert('Permission Required', 'Location permission is needed for this feature.');
          return;
        }

        log('Getting current position');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation, // Highest possible accuracy
        });
        
        const currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        log('Current position:', currentLocation);
        setUserLocation(currentLocation);
        
        // Update map region with user's location - super close zoom level
        const newRegion = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.0008, // Super close zoom for street-level details
          longitudeDelta: 0.0008,
        };
        
        setMapRegion(newRegion);
        log('Set map region:', newRegion);
        
        // Use a slight delay to ensure map focuses on current location after initial render
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion(newRegion, 500);
          }
        }, 500);
        
        // Set up continuous location tracking
        const locationSubscription = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5, // Update every 5 meters
            timeInterval: 1000 // Or every second
          },
          (newLocation) => {
            const updatedLocation = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };
            
            setUserLocation(updatedLocation);
            // No auto-centering to allow user movement
          }
        );
        
        // Store reference for cleanup
        watchId.current = locationSubscription;
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Location Error', 'Failed to get your location. Please check your GPS settings.');
      }
    };

    initializeLocation();
  }, []);

  const getDistance = (
    a, b
  ) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const aVal =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
    return R * c;
  };

  // Functions for recording paths
  const startRecording = async () => {
    try {
      log('Starting recording');
      if (!userLocation) {
        Alert.alert('Location Required', 'Please wait for your location to be detected.');
        return;
      }

      setRecording(true);
      setPath([userLocation]); // Start with current location
      setStartTime(Date.now());
      setDistance(0);
      setDuration(0);

      log('Setting up location watcher');
      try {
        const subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Highest, distanceInterval: 5 },
          loc => {
            if (!loc || !loc.coords) {
              log('Invalid location update');
              return;
            }
            
            const newPoint = { 
              latitude: loc.coords.latitude, 
              longitude: loc.coords.longitude 
            };
            
            log('New position point:', newPoint);
            
            setPath(prev => {
              if (!prev || prev.length === 0) return [newPoint];
              
              const last = prev[prev.length - 1];
              if (!last) return [newPoint];
              
              const dist = getDistance(last, newPoint);
              setDistance(d => d + dist);
              
              return [...prev, newPoint];
            });
          }
        );
        
        // Don't overwrite the main location watcher
        const pathWatchId = subscription;
        
        timerRef.current = setInterval(() => {
          setDuration(d => {
            const newDuration = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
            return newDuration;
          });
        }, 1000);
        
        log('Recording started successfully');
      } catch (error) {
        console.error('Error watching position:', error);
        Alert.alert('Error', 'Failed to start tracking your location');
        setRecording(false);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    log('Stopping recording');
    setRecording(false);
    
    if (timerRef.current) {
      log('Clearing timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    log('Recording stopped, path length:', path.length);
  };

  // Handle spot placement at user's location
  const placeSpotAtCurrentLocation = () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please wait for your location to be detected.');
      return;
    }
    
    log('Setting spot at current location');
    setSpot(userLocation);
  };

  // Handle adding checkpoint at user's location
  const addCheckpointAtCurrentLocation = () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please wait for your location to be detected.');
      return;
    }
    
    log('Adding checkpoint at current location');
    setCheckpoints(prev => {
      const newCheckpoints = [...prev, userLocation];
      log('New checkpoints array:', newCheckpoints);
      return newCheckpoints;
    });
  };

  const handleNext = async () => {
    try {
      log('Handling next button press');
      
      // Filter out any invalid checkpoints
      const validCheckpoints = checkpoints.filter(
        cp => cp && typeof cp.latitude === 'number' && typeof cp.longitude === 'number'
      );
      
      log('Valid checkpoints:', validCheckpoints.length);
      
      // Determine what type of location info to save based on mode
      let locationData = {};
      
      if (locationMode === 'path') {
        locationData.route = path.length > 0 ? path : null;
        locationData.location = path.length > 0 ? path[0] : null;
        locationData.checkpoints = [];
        locationData.mode = 'path';
        log('Saving path data, points:', path.length);
      } else if (locationMode === 'spot') {
        locationData.route = null;
        locationData.location = spot;
        locationData.spotRadius = spotRadius;
        locationData.checkpoints = [];
        locationData.mode = 'spot';
        log('Saving spot data:', spot, 'with radius:', spotRadius);
      } else if (locationMode === 'checkpoints') {
        locationData.route = null;
        locationData.location = validCheckpoints.length > 0 ? validCheckpoints[0] : null;
        locationData.checkpoints = validCheckpoints;
        locationData.mode = 'checkpoints';
        locationData.distanceKm = parseFloat((checkpointDistance / 1000).toFixed(2));
        log('Saving checkpoints data, points:', validCheckpoints.length);
      }
      
      const newState = {
        ...builderState,
        ...locationData,
        durationMinutes: Math.round(duration / 60),
        distanceKm: locationMode === 'path' 
          ? parseFloat((distance / 1000).toFixed(2))
          : locationMode === 'checkpoints'
          ? parseFloat((checkpointDistance / 1000).toFixed(2))
          : null,
      };
      
      log('Updating builder state:', newState);
      setBuilderState(newState);

      // Navigate to next step
      log('Navigating to step 2');
      router.push('/screens/ActivityBuilderStep2');
    } catch (error) {
      console.error('Error in handleNext:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const removeLastCheckpoint = () => {
    if (checkpoints.length > 0) {
      log('Removing last checkpoint');
      setCheckpoints(prev => {
        const newCheckpoints = prev.slice(0, -1);
        log('New checkpoints array:', newCheckpoints);
        return newCheckpoints;
      });
    }
  };
  
  // Handle radius changes
  const handleRadiusChange = (value) => {
    setSpotRadius(value);
    setSpotRadiusText(value.toString());
  };

  const getCheckpointColor = (index, total) => {
    if (index === 0) return 'green'; // Start is green
    if (index === total - 1) return 'red'; // End is red
    return 'yellow'; // Middle checkpoints are yellow
  };
  
  const getCheckpointTitle = (index, total) => {
    if (index === 0) return 'Start';
    if (index === total - 1) return 'Finish';
    return `Checkpoint ${index}`; // Numbered checkpoints
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 1: Path · Spot · Checkpoints</Text>
      <View style={styles.toggleButtons}>
        <Button
          title="RECORD PATH"
          onPress={() => {
            log('Switching to path mode');
            setLocationMode('path');
          }}
          color={locationMode === 'path' ? 'green' : 'gray'}
        />
        <Button
          title="SET SPOT"
          onPress={() => {
            log('Switching to spot mode');
            setLocationMode('spot');
          }}
          color={locationMode === 'spot' ? 'green' : 'gray'}
        />
        <Button
          title="CHECKPOINTS"
          onPress={() => {
            log('Switching to checkpoints mode');
            setLocationMode('checkpoints');
          }}
          color={locationMode === 'checkpoints' ? 'green' : 'gray'}
        />
      </View>

      {/* Map with terrain and unlocked movement */}
      <MapView 
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType="terrain"
        showsUserLocation={true}
        followsUserLocation={false}
        scrollEnabled={true} // Allow moving the map
        rotateEnabled={true}
        zoomEnabled={true}
        showsScale={true} // Add the distance scale tool
        initialRegion={{
          latitude: userLocation?.latitude || 50.8476, // Brussels latitude as fallback
          longitude: userLocation?.longitude || 4.3572, // Brussels longitude as fallback
          latitudeDelta: 0.0008, // Much closer zoom level (street-level)
          longitudeDelta: 0.0008
        }}
        customMapStyle={mapCustomStyle}
        onMapReady={() => {
          // Force map to center on user location when map is ready
          if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.0008,
              longitudeDelta: 0.0008
            }, 500);
          }
        }}
      >
        {/* User's current position - using default Google Maps blue dot, no extra circle */}
        
        {/* Spot mode visualization - only show radius circle when spot is placed */}
        {locationMode === 'spot' && spot && typeof spot.latitude === 'number' && (
          <Circle
            center={spot}
            radius={spotRadius}
            strokeWidth={2}
            strokeColor="rgba(255, 0, 0, 0.8)"
            fillColor="rgba(255, 0, 0, 0.3)"
          />
        )}
        
        {/* Path with safety checks */}
        {locationMode === 'path' && path.length > 0 && (
          <>
            <Polyline 
              coordinates={path.filter(p => 
                p && typeof p.latitude === 'number' && typeof p.longitude === 'number'
              )} 
              strokeWidth={4} 
              strokeColor="blue" 
            />
            {path.length > 0 && path[0] && typeof path[0].latitude === 'number' && (
              <Marker coordinate={path[0]} title="Start" pinColor="green" />
            )}
            {path.length > 1 && path[path.length - 1] && typeof path[path.length - 1].latitude === 'number' && (
              <Marker coordinate={path[path.length - 1]} title="End" pinColor="red" />
            )}
          </>
        )}
        
        {/* Checkpoints with color coding and numbered labels */}
        {locationMode === 'checkpoints' && 
          checkpoints
            .filter(cp => 
              cp && typeof cp.latitude === 'number' && typeof cp.longitude === 'number'
            )
            .map((cp, idx) => (
              <Marker
                key={`cp-${idx}`}
                coordinate={cp}
                title={getCheckpointTitle(idx, checkpoints.length)}
                pinColor={getCheckpointColor(idx, checkpoints.length)}
              >
                {/* Add visible checkpoint number for middle checkpoints */}
                {idx !== 0 && idx !== checkpoints.length - 1 && (
                  <View style={styles.checkpointNumberContainer}>
                    <Text style={styles.checkpointNumber}>{idx}</Text>
                  </View>
                )}
              </Marker>
            ))
        }
        
        {/* Display lines connecting checkpoints */}
        {locationMode === 'checkpoints' && checkpoints.length > 1 && (
          <Polyline
            coordinates={checkpoints.filter(cp => 
              cp && typeof cp.latitude === 'number' && typeof cp.longitude === 'number'
            )}
            strokeWidth={3}
            strokeColor="purple"
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* Mode-specific controls */}
      <View style={styles.controls}>
        {locationMode === 'path' && (
          <View style={styles.recControls}>
            <Button
              title={recording ? 'STOP RECORDING' : 'START RECORDING'}
              onPress={recording ? stopRecording : startRecording}
            />
            <Text>Distance: {(distance / 1000).toFixed(2)} km</Text>
          </View>
        )}

        {locationMode === 'spot' && (
          <View style={styles.spotControls}>
            <Button
              title="PLACE SPOT HERE"
              onPress={placeSpotAtCurrentLocation}
            />
            {/* Only show radius controls after spot is placed */}
            {spot && (
              <View style={styles.radiusControl}>
                <Text>Radius: {spotRadius} meters</Text>
                <Slider
                  style={{width: 200, height: 40}}
                  minimumValue={10}
                  maximumValue={500}
                  step={10}
                  value={spotRadius}
                  onValueChange={handleRadiusChange}
                />
              </View>
            )}
          </View>
        )}

        {locationMode === 'checkpoints' && (
          <View style={styles.checkpointControls}>
            <Button
              title="ADD CHECKPOINT HERE"
              onPress={addCheckpointAtCurrentLocation}
            />
            <Text style={{ marginVertical: 8 }}>
              Checkpoints: {checkpoints.length} (Min: 2)
            </Text>
            {checkpoints.length > 1 && (
              <Text>Distance: {(checkpointDistance / 1000).toFixed(2)} km</Text>
            )}
            <View style={styles.buttonRow}>
              <Button
                title="REMOVE LAST"
                onPress={removeLastCheckpoint}
                disabled={checkpoints.length === 0}
              />
              <Button
                title="RESET"
                onPress={() => {
                  log('Resetting checkpoints');
                  setCheckpoints([]);
                }}
                disabled={checkpoints.length === 0}
              />
            </View>
          </View>
        )}
      </View>

      {/* Next button - disabled until requirements are met */}
      <Button
        title="NEXT"
        onPress={handleNext}
        disabled={
          locationMode === 'path'
            ? path.length === 0
            : locationMode === 'spot'
            ? !spot 
            : checkpoints.length < 2
        }
        color="#2196F3"
      />
    </View>
  );
}

// Custom Google Maps styling for adventure theme
const mapCustomStyle = [
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "poi",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "transit",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [{"color": "#dde2e3"}, {"visibility": "on"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#a9de83"}, {"visibility": "on"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#3d85c6"}, {"visibility": "on"}]
  }
];

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold',
    textAlign: 'center', 
    marginVertical: 10 
  },
  toggleButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 10,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8
  },
  map: { 
    flex: 1,
    borderRadius: 8,
    marginHorizontal: 8
  },
  controls: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 8,
    elevation: 2
  },
  recControls: { 
    padding: 10, 
    alignItems: 'center' 
  },
  spotControls: {
    padding: 10,
    alignItems: 'center'
  },
  radiusControl: {
    alignItems: 'center',
    marginTop: 10,
    width: '100%'
  },
  checkpointControls: { 
    padding: 10, 
    alignItems: 'center' 
  },
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    width: '100%' 
  },
  checkpointNumberContainer: {
    backgroundColor: 'yellow',
    borderRadius: 15,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'black'
  },
  checkpointNumber: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14
  }
});
