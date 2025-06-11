import React, { useState, useContext, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Animated, 
  TextInput,
  Modal 
} from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { ActivityBuilderContext } from '../_context/ActivityBuilderContext';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { useAuth } from '../_context/AuthContext';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// ─── Firebase imports ─────────────────────────────────────
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
// ─────────────────────────────────────────────────────────

// Horizontal Wheel Component
const HorizontalWheel = ({ value, onValueChange, minValue, maxValue, step, disabled }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event) => {
  if (event.nativeEvent.oldState === State.ACTIVE) {
    const { translationX } = event.nativeEvent;
    const totalOffset = lastOffset.current + translationX;
    
    // Calculate new value based on horizontal movement
    const sensitivity = 2; // Adjust sensitivity
    const valueChange = Math.round(totalOffset / sensitivity) * step;
    const newValue = Math.max(minValue, Math.min(maxValue, value + valueChange));
    
    if (newValue !== value && !disabled) {
      onValueChange(newValue);
      // Add haptic feedback when value changes
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    lastOffset.current = 0;
    translateX.setValue(0);
  }
};

  return (
    <View style={styles.wheelContainer}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        enabled={!disabled}
      >
        <Animated.View style={styles.wheel}>
          {/* Wheel segments */}
          {Array.from({ length: 10 }, (_, i) => (
            <View key={i} style={[styles.wheelSegment, i % 2 === 0 && styles.wheelSegmentActive]} />
          ))}
          <FontAwesome5 name="arrows-alt-h" size={16} color={disabled ? "#ccc" : "#666"} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

// Warning Toast Component
const WarningToast = ({ visible, message, onHide }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onHide) onHide();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.warningToast, { opacity: fadeAnim }]}>
      <Text style={styles.warningText}>{message}</Text>
    </Animated.View>
  );
};

export default function ActivityBuilderStep1() {
  // Permission check
  const { userRole } = useAuth();
  const navigation = useNavigation();
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

   // ADD THIS useEffect HERE:
  useEffect(() => {
    navigation.setOptions({
      title: 'Activity Builder Step 1 / 3'
    });
  }, [navigation]);
  
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

  // Add this with your other modal states
const [showDeleteCheckpointsModal, setShowDeleteCheckpointsModal] = useState(false);

//Checkpoint distance modal state
const [showCheckpointDistanceModal, setShowCheckpointDistanceModal] = useState(false);

  // Warning toast state
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Drawer animation values - updated heights
  const topDrawerHeight = useRef(new Animated.Value(100)).current; // Increased from 90
  const bottomDrawerHeight = useRef(new Animated.Value(60)).current; // Start with handle visible
  const [topDrawerOpen, setTopDrawerOpen] = useState(true);
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);

  // Recording mode states
  const [locationMode, setLocationMode] = useState(null); // Start with nothing selected
  const [spotMode, setSpotMode] = useState(null); // 'geoHunt' or 'timedZone'
  
  // Add this with your other modal states
  const [showDeletePathModal, setShowDeletePathModal] = useState(false);

  // General states
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [path, setPath] = useState([]);
  const [distance, setDistance] = useState(0);
  const [checkpoints, setCheckpoints] = useState([]);
  const [checkpointDistance, setCheckpointDistance] = useState(0);

  //Pause button pulsing animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation for pause button
useEffect(() => {
  if (paused) {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    
    return () => pulse.stop();
  } else {
    pulseAnim.setValue(1);
  }
}, [paused]);
  
  // Spot states
  const [spot, setSpot] = useState(null);
  const [spotRadius, setSpotRadius] = useState(5); // Default radius in meters
  const [radiusCenter, setRadiusCenter] = useState(null);
  const [markerSet, setMarkerSet] = useState(false);
  const [radiusSet, setRadiusSet] = useState(false);
  const [radiusLocked, setRadiusLocked] = useState(false);
  
  // Timer states
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerSet, setTimerSet] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  
  // Location states
  const [userLocation, setUserLocation] = useState(null);
  const [lastRecordedLocation, setLastRecordedLocation] = useState(null);
  
  // Modal states
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  
  const watchId = useRef(null);
  const timerRef = useRef(null);
  const mapRef = useRef(null);

  // Initialize location
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          log('Location permission denied');
          Alert.alert('Permission Required', 'Location permission is needed for this feature.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        
        const currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        setUserLocation(currentLocation);
        
        // Set up continuous location tracking
        const locationSubscription = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5,
            timeInterval: 1000
          },
          (newLocation) => {
            const updatedLocation = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };
            
            setUserLocation(updatedLocation);
          }
        );
        
        watchId.current = locationSubscription;
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Location Error', 'Failed to get your location. Please check your GPS settings.');
      }
    };

    initializeLocation();
    
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

// Force center map on user location when it becomes available
useEffect(() => {
  if (userLocation && mapRef.current) {
    console.log('Centering map on user location:', userLocation);
    mapRef.current.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.0008,
      longitudeDelta: 0.0008,
      heading: 0,
    }, 1000);
  }
}, [userLocation]);

  // Updated drawer animations
const toggleTopDrawer = () => {
  const toValue = topDrawerOpen ? 40 : 100; // 100 for better button visibility
  Animated.timing(topDrawerHeight, {
    toValue,
    duration: 300,
    useNativeDriver: false,
  }).start();
  setTopDrawerOpen(!topDrawerOpen);
};

// Update the toggleBottomDrawer function:
const toggleBottomDrawer = () => {
  const openHeight = 180; // Reduced from 220 to 180
  const closedHeight = 40;
  
  const toValue = bottomDrawerOpen ? closedHeight : openHeight;
  
  Animated.timing(bottomDrawerHeight, {
    toValue,
    duration: 300,
    useNativeDriver: false,
  }).start();
  setBottomDrawerOpen(!bottomDrawerOpen);
};

const selectMode = (mode) => {
  setLocationMode(mode);
  setSpotMode(null);
  setMarkerSet(false);
  setRadiusSet(false);
  setRadiusLocked(false);
  setTimerSet(false);

  // Auto-collapse top drawer
  Animated.timing(topDrawerHeight, {
    toValue: 40,
    duration: 300,
    useNativeDriver: false,
  }).start();
  setTopDrawerOpen(false);

  // ALWAYS open bottom drawer with SMALLER height
  setBottomDrawerOpen(true);
  Animated.timing(bottomDrawerHeight, {
    toValue: 180, // Changed from 220 to 180
    duration: 300,
    useNativeDriver: false,
  }).start();
};
  
  // Spot mode functions
  const dropMarker = () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please wait for your location to be detected.');
      return;
    }
    
    setSpot(userLocation);
    setMarkerSet(true);
    log('Marker dropped at:', userLocation);
  };

  const dropRadius = () => {
    if (!spot) return;
    
    setRadiusCenter(spot);
    setRadiusSet(true);
    log('Radius set at:', spot, 'with radius:', spotRadius);
  };

  const undoSpotAction = () => {
    if (radiusSet) {
      setRadiusSet(false);
      setRadiusCenter(null);
      setRadiusLocked(false);
    } else if (markerSet) {
      setMarkerSet(false);
      setSpot(null);
    }
  };

  const toggleRadiusLock = () => {
    setRadiusLocked(!radiusLocked);
  };

  // Path recording functions
  const getDistance = (a, b) => {
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

  const startRecording = async () => {
  if (!userLocation) {
    Alert.alert('Location Required', 'Please wait for your location to be detected.');
    return;
  }

  setRecording(true);
  setPaused(false);
  setPath([userLocation]);
  setLastRecordedLocation(userLocation);
  setDistance(0);

  try {
    const subscription = await Location.watchPositionAsync(
      { 
        accuracy: Location.Accuracy.High, 
        distanceInterval: 1, // Changed to 1 meter minimum
        timeInterval: 2000   // Check every 2 seconds
      },
      (location) => {
        const newPoint = { 
          latitude: location.coords.latitude, 
          longitude: location.coords.longitude 
        };
        
        // Check recording state - DON'T record if paused
        setRecording(currentRecording => {
          setPaused(currentPaused => {
            // ONLY record if actively recording AND not paused
            if (currentRecording && !currentPaused) {
              setPath(currentPath => {
                if (currentPath.length === 0) return [newPoint];
                
                const lastPoint = currentPath[currentPath.length - 1];
                const distance = getDistance(lastPoint, newPoint);
                
                // Must move at least 1 meter to add a new point
                if (distance >= 1) {
                  setDistance(prev => prev + distance);
                  setLastRecordedLocation(newPoint);
                  return [...currentPath, newPoint];
                }
                
                return currentPath;
              });
            }
            // If paused or not recording, don't add points
            return currentPaused;
          });
          return currentRecording;
        });
      }
    );
    
    watchId.current = subscription;
    
  } catch (error) {
    console.error('Error starting location tracking:', error);
    Alert.alert('Error', 'Failed to start tracking your location');
    setRecording(false);
  }
};

  const stopRecording = () => {
  // Check if user has moved enough distance from start
  if (path.length > 0 && userLocation) {
    const startPoint = path[0];
    const distanceFromStart = getDistance(startPoint, userLocation);
    
    // Minimum 10 meters from start point to stop
    if (distanceFromStart < 10) {
      showWarningToast(`Move ${Math.round(10 - distanceFromStart)}m further from start to finish recording`);
      return; // Don't stop recording
    }
  }
  
  // Clean up location subscription
  if (watchId.current) {
    watchId.current.remove();
    watchId.current = null;
  }
  
  setRecording(false);
  setPaused(false);
  showWarningToast('Recording stopped!');
};

  // Add this function after stopRecording()
const deleteRecordedPath = () => {
  setShowDeletePathModal(true);
};

const confirmDeletePath = () => {
  setPath([]);
  setDistance(0);
  setRecording(false);
  setPaused(false);
  setLastRecordedLocation(null);
  setShowDeletePathModal(false);
};

const showWarningToast = (message) => {
  setWarningMessage(message);
  setShowWarning(true);
};

  const pauseRecording = () => {
    setPaused(true);
  };

  const resumeRecording = () => {
  if (!userLocation || !lastRecordedLocation) return;
  
  const distanceFromLast = getDistance(userLocation, lastRecordedLocation);
  
  // Must be within 3 meters of last recorded position to resume
  if (distanceFromLast > 3) {
    showWarningToast(`Return to last location to resume (${Math.round(distanceFromLast)}m away)`);
    return;
  }
  
  setPaused(false);
  showWarningToast('Recording resumed!');
};

  // Checkpoint functions
 const addCheckpoint = () => {
  if (!userLocation) {
    Alert.alert('Location Required', 'Please wait for your location to be detected.');
    return;
  }
  
  // Check if too close to existing checkpoints (5 meter minimum)
  const minDistance = 5;
  const tooClose = checkpoints.some(checkpoint => {
    const distance = getDistance(userLocation, checkpoint);
    return distance < minDistance;
  });
  
  if (tooClose) {
    showWarningToast('Move at least 5m away from existing checkpoints'); // Toast like Path mode
    return;
  }
  
  setCheckpoints(prev => [...prev, userLocation]);
};

  const removeLastCheckpoint = () => {
    setShowRemoveModal(true);
  };

  const confirmRemoveCheckpoint = () => {
    setCheckpoints(prev => prev.slice(0, -1));
    setShowRemoveModal(false);
  };

  // Add this function after confirmRemoveCheckpoint
const deleteAllCheckpoints = () => {
  setShowDeleteCheckpointsModal(true);
};

const confirmDeleteAllCheckpoints = () => {
  setCheckpoints([]);
  setCheckpointDistance(0);
  setShowDeleteCheckpointsModal(false);
  showWarningToast('All checkpoints deleted!');
};

  // Calculate checkpoint distance
  useEffect(() => {
    if (checkpoints.length > 1) {
      let total = 0;
      for (let i = 0; i < checkpoints.length - 1; i++) {
        total += getDistance(checkpoints[i], checkpoints[i + 1]);
      }
      setCheckpointDistance(total);
    } else {
      setCheckpointDistance(0);
    }
  }, [checkpoints]);

  // Update the canProceed function
const canProceed = () => {
  if (locationMode === 'spot') {
    // For spot mode, first need to select the spot type
    if (!spotMode) return false; // No spot mode selected yet
    
    if (spotMode === 'geoHunt') {
      return radiusLocked; // Must have locked the radius
    } else if (spotMode === 'timedZone') {
      return timerSet && radiusSet; // Must have set both timer and radius
    }
  } else if (locationMode === 'path') {
    return path.length > 0 && !recording; // Must have recorded a path AND stopped recording
  } else if (locationMode === 'checkpoints') {
    return checkpoints.length >= 2;
  }
  return false;
};

  const handleNext = async () => {
    try {
      let locationData = {};
      
      if (locationMode === 'path') {
        locationData = {
          route: path,
          location: path[0],
          mode: 'path',
          distanceKm: parseFloat((distance / 1000).toFixed(2)),
        };
      } else if (locationMode === 'spot') {
        locationData = {
          location: spot,
          spotRadius: spotRadius,
          mode: 'spot',
          spotMode: spotMode,
          ...(spotMode === 'timedZone' && { timerMinutes }),
        };
      } else if (locationMode === 'checkpoints') {
        locationData = {
          location: checkpoints[0],
          checkpoints: checkpoints,
          mode: 'checkpoints',
          distanceKm: parseFloat((checkpointDistance / 1000).toFixed(2)),
        };
      }
      
      const newState = {
        ...builderState,
        ...locationData,
      };
      
      setBuilderState(newState);
      router.push('/screens/ActivityBuilderStep2');
    } catch (error) {
      console.error('Error in handleNext:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const getCheckpointColor = (index, total) => {
    if (index === 0) return 'green';
    if (index === total - 1) return 'red';
    return 'yellow';
  };
  
  const getCheckpointTitle = (index, total) => {
    if (index === 0) return 'Start';
    if (index === total - 1) return 'Finish';
    return `Checkpoint ${index}`;
  };

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
<MapView 
  ref={mapRef}
  style={styles.fullScreenMap}
  provider={PROVIDER_GOOGLE}
  mapType="terrain"
  showsUserLocation={true}
  followsUserLocation={true}
  scrollEnabled={false}
  rotateEnabled={true}
  zoomEnabled={true}
  showsScale={true}
  showsMyLocationButton={false}
  showsCompass={false}
  // Remove onRegionChange since we don't need it anymore
  customMapStyle={mapCustomStyle}
  onPress={(e) => {
 console.log('Map pressed at:', e.nativeEvent.coordinate);
 
 // Handle circle movement for Geo Hunt mode
 if (locationMode === 'spot' && spotMode === 'geoHunt' && radiusSet && !radiusLocked && markerSet) {
   const pressedCoordinate = e.nativeEvent.coordinate;
   const distanceFromMarker = getDistance(spot, pressedCoordinate);
   
   console.log('Distance from marker:', distanceFromMarker.toFixed(1), 'meters');
   console.log('Radius limit:', spotRadius, 'meters');
   
   // Simple rule: if the press is within the radius distance from the marker, allow movement
   if (distanceFromMarker <= spotRadius) {
     setRadiusCenter(pressedCoordinate);
     console.log('Moved detection center to:', pressedCoordinate);
     
     // Add haptic feedback
     if (Haptics && Haptics.impactAsync) {
       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
     }
     
     showWarningToast('Detection area moved!');
   } else {
     const overDistance = Math.round(distanceFromMarker - spotRadius);
     console.log('Too far from marker by:', overDistance, 'meters');
     showWarningToast(`Too far from marker (${overDistance}m over limit)`);
   }
 }
}}
>

{/* Spot marker and radius */}
{locationMode === 'spot' && spot && (
  <Marker 
    coordinate={spot} 
    title={radiusSet && !radiusLocked ? "Tap circle to move detection area" : "Activity Spot"} 
    pinColor="red" 
  />
)}

{locationMode === 'spot' && radiusSet && radiusCenter && (
  <Circle
    center={radiusCenter}
    radius={spotRadius}
    strokeWidth={2}
    strokeColor="rgba(0, 0, 255, 0.8)"
    fillColor="rgba(0, 0, 255, 0.3)"
  />
)}
        
        {/* Path visualization */}
{locationMode === 'path' && path.length > 0 && (
  <>
    {/* Blue line - always show when path exists */}
    <Polyline 
      coordinates={path} 
      strokeWidth={4} 
      strokeColor="blue" 
    />
    
    {/* Green start marker - ALWAYS show when path exists */}
    <Marker coordinate={path[0]} title="Start" pinColor="green" />
    
    {/* Yellow marker for last recorded position when paused */}
    {paused && lastRecordedLocation && (
      <Marker 
        coordinate={lastRecordedLocation} 
        title="Resume Here" 
        pinColor="yellow" 
      />
    )}
    
    {/* Red finish marker - show when recording is stopped AND path has multiple points */}
    {!recording && !paused && path.length > 1 && (
      <Marker coordinate={path[path.length - 1]} title="Finish" pinColor="red" />
    )}
  </>
)}
        
    {/* Checkpoints */}
{locationMode === 'checkpoints' && 
  checkpoints.map((cp, idx) => (
    <Marker
      key={`cp-${idx}-${checkpoints.length}`}
      coordinate={cp}
      title={getCheckpointTitle(idx, checkpoints.length)}
      pinColor={getCheckpointColor(idx, checkpoints.length)}
    />
  ))
}
      
        {locationMode === 'checkpoints' && checkpoints.length > 1 && (
          <Polyline
            coordinates={checkpoints}
            strokeWidth={3}
            strokeColor="purple"
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

        {/* Reset position button */}
<TouchableOpacity 
  style={[
    styles.currentLocationButton,
    { top: topDrawerOpen ? 120 : 60 }
  ]}
  onPress={() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0008,
        longitudeDelta: 0.0008,
        heading: 0, // Reset rotation to north
      }, 500);
    }
  }}
>
  <FontAwesome6 name="arrows-to-dot" size={20} color="#000" />
</TouchableOpacity>

      {/* Top collapsible drawer - remove title completely */}
<Animated.View 
  style={[
    styles.topDrawer, 
    { 
      height: topDrawerHeight,
    }
  ]}
>
  {topDrawerOpen && (
    <View style={styles.drawerContent}>
      <View style={styles.modeButtons}>
        <TouchableOpacity 
          style={[styles.modeButton, locationMode === 'path' && styles.selectedMode]}
          onPress={() => selectMode('path')}
        >
          <FontAwesome5 name="route" size={20} color="#fff" />
          <Text style={styles.modeButtonText}>PATH</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, locationMode === 'checkpoints' && styles.selectedMode]}
          onPress={() => selectMode('checkpoints')}
        >
          <FontAwesome5 name="flag" size={20} color="#fff" />
          <Text style={styles.modeButtonText}>CHECKPOINTS</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, locationMode === 'spot' && styles.selectedMode]}
          onPress={() => selectMode('spot')}
        >
          <FontAwesome5 name="circle" size={20} color="#fff" />
          <Text style={styles.modeButtonText}>SPOT</Text>
        </TouchableOpacity>
      </View>
      {/* Removed the title text completely */}
    </View>
  )}
  
  <TouchableOpacity 
    style={styles.drawerHandle} 
    onPress={toggleTopDrawer}
  >
    <View style={styles.handleBar} />
  </TouchableOpacity>
</Animated.View>

    {/* Single Bottom Drawer - for ALL modes */}
{locationMode && (
  <Animated.View 
    style={[
      styles.bottomDrawer, 
      { height: bottomDrawerHeight }
    ]}
  >
    <TouchableOpacity 
      style={styles.bottomDrawerHandle} 
      onPress={toggleBottomDrawer}
    >
      <View style={styles.handleBar} />
    </TouchableOpacity>
    
    {bottomDrawerOpen && (
      <View style={styles.drawerContent}>
        {/* Path controls */}
{locationMode === 'path' && (
  <View style={styles.controlsContainer}>
    <View style={styles.mainControls}>
      {/* Add the missing pause button */}
      <Animated.View style={{ transform: [{ scale: paused ? pulseAnim : 1 }] }}>
        <TouchableOpacity 
          style={[
            styles.pauseButton, 
            !recording && styles.disabledButton,
            paused && styles.pulsingButton
          ]}
          onPress={pauseRecording}
          disabled={!recording}
        >
          <FontAwesome5 name="pause" size={20} color={recording ? "#fff" : "#ccc"} />
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity 
  style={[
    styles.mainButton, // Default green
    recording && !paused && styles.recordingButton, // Red when recording
    !recording && path.length > 0 && styles.completedButton, // Gray when stopped
    // Paused state uses default green (mainButton)
  ]}
  onPress={() => {
    if (recording && !paused) {
      stopRecording(); // Stop if currently recording
    } else if (paused) {
      resumeRecording(); // Resume if paused
    } else {
      startRecording(); // Start new recording
    }
  }}
  disabled={!recording && path.length > 0 && !paused} // LOCK when completed (gray)
>
  <FontAwesome5 
    name={
      recording && !paused ? "flag-checkered" : // Flag when actively recording
      !recording && path.length > 0 ? "flag-checkered" : // Flag when stopped
      "shoe-prints" // Footprints for default/paused (ready to start/resume)
    } 
    size={30} 
    color="#fff" 
  />
</TouchableOpacity>
      
      {/* New Delete Button */}
      <TouchableOpacity 
        style={[styles.deleteButton, path.length === 0 && styles.disabledButton]}
        onPress={deleteRecordedPath}
        disabled={path.length === 0}
      >
        <FontAwesome5 name="times" size={20} color={path.length > 0 ? "#fff" : "#ccc"} />
      </TouchableOpacity>
    </View>
    
    <Text style={styles.distanceText}>Distance: {(distance / 1000).toFixed(2)} km</Text>
  </View>
)}

        {/* Checkpoints controls */}
{locationMode === 'checkpoints' && (
  <View style={styles.controlsContainer}>
    <View style={styles.mainControls}>
      <TouchableOpacity 
        style={[styles.undoButton, checkpoints.length === 0 && styles.disabledButton]}
        onPress={removeLastCheckpoint}
        disabled={checkpoints.length === 0}
      >
        <FontAwesome5 name="undo" size={20} color={checkpoints.length > 0 ? "#fff" : "#ccc"} />
      </TouchableOpacity>
      
      <TouchableOpacity 
  style={styles.mainButton}
  onPress={addCheckpoint}
>
  <FontAwesome6 name="location-dot" size={30} color="#fff" />
</TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.deleteButton, checkpoints.length === 0 && styles.disabledButton]}
        onPress={deleteAllCheckpoints}
        disabled={checkpoints.length === 0}
      >
        <FontAwesome5 name="times" size={20} color={checkpoints.length > 0 ? "#fff" : "#ccc"} />
      </TouchableOpacity>
    </View>
    
    <Text style={styles.checkpointText}>
      Checkpoints: {checkpoints.length} (Min: 2)
    </Text>
    {checkpoints.length > 1 && (
      <Text style={styles.distanceText}>
        Distance: {(checkpointDistance / 1000).toFixed(2)} km
      </Text>
    )}
  </View>
)}

{/* Delete All Checkpoints Modal */}
<Modal
  visible={showDeleteCheckpointsModal}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setShowDeleteCheckpointsModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.confirmModal}>
      <Text style={styles.modalTitle}>Delete all checkpoints?</Text>
      <Text style={styles.modalSubtext}>This action cannot be undone</Text>
      <View style={styles.modalButtons}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => setShowDeleteCheckpointsModal(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={confirmDeleteAllCheckpoints}
        >
          <Text style={styles.confirmButtonText}>Delete All</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

{/* Checkpoint Distance Warning Modal */}
<Modal
  visible={showCheckpointDistanceModal}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setShowCheckpointDistanceModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.confirmModal}>
      <Text style={styles.modalTitle}>Too Close to Existing Checkpoint</Text>
      <Text style={styles.modalSubtext}>Move at least 5 meters away from any existing checkpoint before placing a new one.</Text>
      <TouchableOpacity 
        style={styles.confirmButton}
        onPress={() => setShowCheckpointDistanceModal(false)}
      >
        <Text style={styles.confirmButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

        {/* Spot mode selection */}
        {locationMode === 'spot' && !spotMode && (
          <View style={styles.centeredSpotSelection}>
            <TouchableOpacity 
              style={styles.spotModeButton}
              onPress={() => setSpotMode('geoHunt')}
            >
              <FontAwesome5 name="search-location" size={24} color="#fff" />
              <Text style={styles.spotModeText}>Geo Hunt</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.spotModeButton}
              onPress={() => setSpotMode('timedZone')}
            >
              <FontAwesome5 name="hourglass-half" size={24} color="#fff" />
              <Text style={styles.spotModeText}>Timed Zone</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Geo Hunt controls */}
        {locationMode === 'spot' && spotMode === 'geoHunt' && (
          <View style={styles.controlsContainer}>
            <View style={styles.mainControls}>
              {/* Left side - Undo and Lock buttons HORIZONTAL */}
              <View style={styles.leftControlsContainer}>
                <TouchableOpacity 
                  style={[styles.undoButton, !markerSet && styles.disabledButton]}
                  onPress={undoSpotAction}
                  disabled={!markerSet}
                >
                  <FontAwesome5 name="undo" size={20} color={markerSet ? "#fff" : "#ccc"} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.lockButton, !radiusSet && styles.disabledButton]}
                  onPress={toggleRadiusLock}
                  disabled={!radiusSet}
                >
                  <FontAwesome5 
                    name={radiusLocked ? "lock" : "lock-open"} 
                    size={20} 
                    color={radiusSet ? "#fff" : "#ccc"} 
                  />
                </TouchableOpacity>
              </View>
              
{/* Center - Main button */}
<View style={styles.centerButtonContainer}>
  <TouchableOpacity 
    style={[
      styles.mainButton, 
      radiusSet && styles.disabledButton  // Disable after radius is dropped
    ]}
    onPress={markerSet ? dropRadius : dropMarker}
    disabled={radiusSet}  // Disable after radius is set
  >
    {markerSet ? (
      <FontAwesome6 name="circle-dot" size={30} color={radiusSet ? "#ccc" : "#fff"} />
    ) : (
      <FontAwesome5 name="map-pin" size={30} color="#fff" />
    )}
  </TouchableOpacity>
</View>
              
              {/* Right side - Large Wheel */}
              <View style={styles.rightWheelContainer}>
                <HorizontalWheel
                  value={spotRadius}
                  onValueChange={setSpotRadius}
                  minValue={5}
                  maxValue={1000}
                  step={5}
                  disabled={!radiusSet || radiusLocked}
                />
                <Text style={styles.spotValueText}>{spotRadius}m</Text>
              </View>
            </View>
          </View>
        )}

        {/* Timed Zone controls */}
        {locationMode === 'spot' && spotMode === 'timedZone' && (
          <View style={styles.controlsContainer}>
            <View style={styles.mainControls}>
              {/* Left side - Undo and Timer buttons HORIZONTAL */}
              <View style={styles.leftControlsContainer}>
                <TouchableOpacity 
                  style={[styles.undoButton, !radiusSet && styles.disabledButton]}
                  onPress={() => {
                    setRadiusSet(false);
                    setRadiusCenter(null);
                  }}
                  disabled={!radiusSet}
                >
                  <FontAwesome5 name="undo" size={20} color={radiusSet ? "#fff" : "#ccc"} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timerButton, !radiusSet && styles.disabledButton]}
                  onPress={() => setShowTimerModal(true)}
                  disabled={!radiusSet}
                >
                  <FontAwesome5 name="stopwatch" size={20} color={radiusSet ? "#fff" : "#ccc"} />
                </TouchableOpacity>
              </View>
              
{/* Center - Main button */}
<View style={styles.centerButtonContainer}>
  <TouchableOpacity 
    style={[
      styles.mainButton, 
      radiusSet && styles.disabledButton  // Disable after radius is dropped
    ]}
    onPress={() => {
      if (!userLocation) return;
      setRadiusCenter(userLocation);
      setRadiusSet(true);
    }}
    disabled={radiusSet}  // Disable after radius is set
  >
    <FontAwesome6 
      name="circle-dot" 
      size={30} 
      color={radiusSet ? "#ccc" : "#fff"}  // Gray when disabled
    />
  </TouchableOpacity>
</View>
              
              {/* Right side - Large Wheel */}
              <View style={styles.rightWheelContainer}>
                <HorizontalWheel
                  value={spotRadius}
                  onValueChange={setSpotRadius}
                  minValue={10}
                  maxValue={1000}
                  step={10}
                  disabled={!radiusSet}
                />
                <Text style={styles.spotValueText}>{spotRadius}m</Text>
              </View>
            </View>
            
            {/* Timer display under main button */}
            <Text style={styles.distanceText}>
  Timer: {timerSet ? timerMinutes : 0} min
</Text>
          </View>
        )}
      </View>
    )}
  </Animated.View>
)}

      {/* Timer Modal */}
      <Modal
        visible={showTimerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timerModal}>
            <Text style={styles.modalTitle}>Set duration inside the zone</Text>
            <TextInput
              style={styles.timerInput}
              value={timerMinutes.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 1;
                setTimerMinutes(Math.max(1, num));
              }}
              keyboardType="numeric"
              placeholder="Minutes"
            />
            <Text style={styles.modalSubtext}>Min. 1 minute</Text>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={() => {
                setTimerSet(true);
                setShowTimerModal(false);
              }}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Remove Checkpoint Modal */}
      <Modal
        visible={showRemoveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.modalTitle}>Remove last checkpoint?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowRemoveModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={confirmRemoveCheckpoint}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Path Modal */}
<Modal
  visible={showDeletePathModal}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setShowDeletePathModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.confirmModal}>
      <Text style={styles.modalTitle}>Delete recorded path?</Text>
      <View style={styles.modalButtons}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => setShowDeletePathModal(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={confirmDeletePath}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

{/* Fixed footer area - always visible */}
      <View style={styles.bottomButtonContainer}>
        {canProceed() && (
          <TouchableOpacity 
            style={styles.bottomSaveButton}
            onPress={handleNext}
          >
            <Text style={styles.bottomSaveButtonText}>
              Save and Continue
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Warning Toast */}
      <WarningToast
        visible={showWarning}
        message={warningMessage}
        onHide={() => setShowWarning(false)}
      />
    </View>  /* Main container closing tag */
  );
}

// Custom Google Maps styling for adventure theme - ALL POI disabled
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
    "featureType": "poi.business",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "poi.medical",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#a9de83"}, {"visibility": "on"}]
  },
  {
    "featureType": "poi.attraction",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "poi.government",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "poi.school",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "poi.sports_complex",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "poi.place_of_worship",
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
    "featureType": "transit.station",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "transit.station.bus",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "transit.station.rail",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [{"color": "#dde2e3"}, {"visibility": "on"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#3d85c6"}, {"visibility": "on"}]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "labels",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels",
    "stylers": [{"visibility": "simplified"}]
  },
  {
    "featureType": "administrative.neighborhood",
    "elementType": "labels",
    "stylers": [{"visibility": "off"}]
  }
];

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#000',
  paddingBottom: 50, // Match the new footer height
},
fullScreenMap: {
  flex: 1,
  width: '100%',
  height: '100%',
  marginBottom: 0, // Map ends above the footer area
},

// Top drawer styles
topDrawer: {
  position: 'absolute',
  top: 0, // Start from the very top
  left: 0,
  right: 0,
  backgroundColor: 'rgba(255, 255, 255, 0.85)', // Semi-transparent
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
  overflow: 'hidden',
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
},

// BOTTOM DRAWER NEW STYLE
bottomDrawer: {
  position: 'absolute',
  bottom: 50,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  overflow: 'hidden',
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
},

// Alternative with more aggressive centering
centeredSpotSelection: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 15,
  marginBottom: 20,
  marginTop: 35, // Even more top margin to center them vertically
  paddingHorizontal: 20,
  width: '100%',
},

// Warning toast styles
warningToast: {
  position: 'absolute',
  top: '50%',
  left: 20,
  right: 20,
  backgroundColor: '#FF5722',
  borderRadius: 12,
  padding: 16,
  alignItems: 'center',
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  zIndex: 1000,
},

warningText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  textAlign: 'center',
},

// Update drawer handle for more separation
drawerHandle: {
  alignItems: 'center',
  paddingVertical: 6, // Reduced from 8
  backgroundColor: 'transparent',
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
},

// New bottom drawer handle style
bottomDrawerHandle: {
  alignItems: 'center',
  paddingVertical: 6, // Reduced from 8
  backgroundColor: 'transparent',
  position: 'absolute',
  top: 0, // At the top for bottom drawer
  left: 0,
  right: 0,
},

handleBar: {
  width: 40,
  height: 4,
  backgroundColor: '#888',
  borderRadius: 2,
},

// Fine-tune the drawer content padding
drawerContent: {
  padding: 15,
  paddingTop: 20, // Increased from 15 to 20 to push content down slightly
  paddingBottom: 30, // Reduced from 35 to 30 
  minHeight: 100,
  justifyContent: 'center',
},
drawerTitle: {
  fontSize: 16, // Smaller font
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: 10, // Reduced margin
  color: '#333',
},

currentLocationButton: {
  position: 'absolute',
  right: 20,
  width: 50,
  height: 50,
  backgroundColor: 'rgba(255, 255, 255, 0.85)', // Google Maps-like transparency
  borderRadius: 25,
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 6,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
},

// Mode selection buttons
modeButtons: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 paddingHorizontal: 8,
},
modeButton: {
 paddingHorizontal: 8,
 paddingVertical: 12,
 backgroundColor: '#2196F3',
 borderRadius: 8,
 flex: 1,
 alignItems: 'center',
 marginHorizontal: 4,
},
selectedMode: {
 backgroundColor: '#4CAF50',
},
modeButtonText: {
 color: '#fff',
 fontWeight: 'bold',
 fontSize: 12, // Smaller font for text below icon
 marginTop: 4, // Space between icon and text
},

// Center button container - same width as left and right
centerButtonContainer: {
  width: 120, // Same as leftControlsContainer and rightWheelContainer
  alignItems: 'center',
  justifyContent: 'center',
},

// Spot mode selection
spotModeSelection: {
  flexDirection: 'row',
  justifyContent: 'center', // Changed to center
  alignItems: 'center',
  marginBottom: 15, // Reduced from 20
  marginTop: 5, // Reduced from 10
  gap: 20, // Add gap between buttons
},
// Update spot mode button
spotModeButton: {
  backgroundColor: '#2196F3',
  paddingHorizontal: 30,
  paddingVertical: 20,
  borderRadius: 12,
  alignItems: 'center',
  width: 140, // Fixed width instead of flex
  // Remove flex: 1 and maxWidth to avoid layout issues
},
spotModeText: {
  color: '#fff',
  fontWeight: 'bold',
  marginTop: 8,
  fontSize: 14,
},

// Horizontal wheel
wheel: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f0f0f0',
  borderRadius: 22, // Increased from 20
  height: 45, // Increased from 40
  paddingHorizontal: 15, // Increased from 12
  borderWidth: 1,
  borderColor: '#ddd',
},

// Bigger wheel segments:
wheelSegment: {
  width: 4, // Increased from 3
  height: 18, // Increased from 16
  backgroundColor: '#ccc',
  marginHorizontal: 1,
},

wheelSegmentActive: {
  backgroundColor: '#666',
  height: 22, // Increased from 20
},

// Fix controls container 
controlsContainer: {
  alignItems: 'center',
  marginBottom: 10, // Add bottom margin to push content up
  marginTop: 15, // Add top margin to push content down
  justifyContent: 'center',
},

mainControls: {
  flexDirection: 'row',
  justifyContent: 'space-between', // Back to space-between for precise control
  alignItems: 'center',
  marginBottom: 15,
  marginTop: 15,  
  paddingHorizontal: 20,
},

// Main button - default green
mainButton: {
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: '#4CAF50', // Default green for start/resume
  justifyContent: 'center',
  alignItems: 'center',
  marginHorizontal: 20,
  elevation: 6,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
},

// Recording button state (red when actively recording)
recordingButton: {
  backgroundColor: '#f44336', // Red when recording
},

// Completed button state (consistent with other disabled buttons)
completedButton: {
  backgroundColor: '#ccc', // Same as other disabled buttons
  opacity: 0.6, // Same opacity as disabledButton
},

// Side buttons
undoButton: {
  width: 50,
  height: 50,
  borderRadius: 8,
  backgroundColor: '#FF9800',
  justifyContent: 'center',
  alignItems: 'center',
},
lockButton: {
  width: 50,
  height: 50,
  borderRadius: 8,
  backgroundColor: '#9C27B0',
  justifyContent: 'center',
  alignItems: 'center',
},
timerButton: {
  width: 50,
  height: 50,
  borderRadius: 8,
  backgroundColor: '#FF5722',
  justifyContent: 'center',
  alignItems: 'center',
},
pauseButton: {
  width: 50,
  height: 50,
  borderRadius: 8,
  backgroundColor: '#FFC107',
  justifyContent: 'center',
  alignItems: 'center',
},

// Delete button (right side) - change to purple
deleteButton: {
  width: 50,
  height: 50,
  borderRadius: 8,
  backgroundColor: '#9C27B0', // Changed to purple (same as lock button)
  justifyContent: 'center',
  alignItems: 'center',
},

// Pulsing animation for pause button
pulsingButton: {
  shadowColor: '#FFC107',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 1,
  shadowRadius: 10,
  elevation: 10,
},

// Disabled button state
disabledButton: {
  backgroundColor: '#ccc',
  opacity: 0.6,
},

// Spacer for alignment
spacer: {
  width: 50,
},

// Custom marker styles for middle checkpoints only
customMiddleMarker: {
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
},

// Radius slider
radiusSlider: {
  width: '100%',
  alignItems: 'center',
  marginBottom: 5, // Reduced from 10
  marginTop: 0, // Removed top margin
},

radiusText: {
  fontSize: 14,
  fontWeight: 'bold',
  marginBottom: 0, // Removed bottom margin
  color: '#333',
},

slider: {
  width: '80%',
  height: 25, // Reduced from 30
  marginTop: -5, // Pull slider closer to text
},

// Text displays
distanceText: {
  fontSize: 14, // Reduced from 16
  fontWeight: 'bold',
  color: '#333',
  textAlign: 'center',
  marginBottom: 5, // Reduced from 10
},

checkpointText: {
  fontSize: 14, // Reduced from 16
  fontWeight: 'bold',
  color: '#333',
  textAlign: 'center',
  marginBottom: 3, // Reduced from 5
},

timerDisplay: {
  fontSize: 14, // Reduced from 16
  fontWeight: 'bold',
  color: '#4CAF50',
  textAlign: 'center',
  marginTop: 5, // Reduced from 10
},

leftControlsContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  width: 120, // Set to same width
  gap: 10,
},

// Path distance text
resumeDistanceText: {
  fontSize: 12,
  fontWeight: 'bold',
  color: '#666',
  textAlign: 'center',
  marginBottom: 5,
},

warningTextInline: {
  color: '#FF5722',
  fontWeight: 'bold',
},

rightWheelContainer: {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: 120, // Set to same width as left
  paddingLeft: 0,
  paddingRight: 0,
},

wheelContainer: {
  marginTop: 0,
  width: 120, // Match the container width
  height: 45,
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'center',
},

// Value text - directly under wheel
spotValueText: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#333',
  textAlign: 'center',
  marginTop: 5, // Small gap from wheel
},

// Display row for Timed Zone (timer + radius)
displayRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 8,
  paddingHorizontal: 10,
},

// Update the nextButton style
nextButton: {
  backgroundColor: '#2196F3',
  paddingVertical: 8, // Reduced from 15 to 8
  paddingHorizontal: 30,
  borderRadius: 8,
  marginTop: 15, // Reduced from 20 to 15
  alignItems: 'center',
},
nextButtonText: {
  color: '#fff',
  fontSize: 16, // Reduced from 18 to 16
  fontWeight: 'bold',
},
disabledText: {
  color: '#ccc',
},

// Modal styles
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
timerModal: {
  backgroundColor: '#fff',
  padding: 30,
  borderRadius: 12,
  alignItems: 'center',
  minWidth: 280,
},
confirmModal: {
  backgroundColor: '#fff',
  padding: 30,
  borderRadius: 12,
  alignItems: 'center',
  minWidth: 280,
},
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 20,
  textAlign: 'center',
  color: '#333',
},
modalSubtext: {
  fontSize: 14,
  color: '#666',
  marginBottom: 20,
},
timerInput: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
  textAlign: 'center',
  minWidth: 100,
  marginBottom: 10,
},
modalButtons: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  gap: 30, // Space between buttons
},

confirmButton: {
  backgroundColor: '#4CAF50',
  paddingHorizontal: 40,
  paddingVertical: 15,
  borderRadius: 8,
  minWidth: 120,
  alignItems: 'center',
},
confirmButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 16,
},
cancelButton: {
  backgroundColor: '#f44336',
  paddingHorizontal: 40,
  paddingVertical: 15,
  borderRadius: 8,
  minWidth: 120,
  alignItems: 'center',
},
cancelButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 16,
},
// Update bottom button styles
bottomButtonContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 50,
  backgroundColor: '#fff',
  paddingVertical: 3, // Minimal padding
  paddingHorizontal: 8, // Minimal side padding
  borderTopWidth: 1,
  borderTopColor: '#e0e0e0',
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  justifyContent: 'center',
},

bottomSaveButton: {
  backgroundColor: '#2196F3',
  paddingVertical: 0, // Remove padding
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1, // Fill entire container
  height: '100%', // Take full height
},

bottomSaveButtonText: {
  color: '#fff',
  fontSize: 18, // Increased back to 18
  fontWeight: 'bold',
},
});