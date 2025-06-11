// screens/ActivityTracker.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Vibration,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import MapView, {
  Marker,
  Polyline,
  Circle,
  PROVIDER_GOOGLE
} from 'react-native-maps';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../_context/AuthContext';

const adventureMapStyle = [
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }
];

export default function ActivityTracker() {
  const params = useLocalSearchParams();
  const { activityId, title, category } = params;
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [traveledDistance, setTraveledDistance] = useState(0);
  const [activityMode, setActivityMode] = useState('path');
  const [viewMode, setViewMode] = useState('top');
  const [isPaused, setIsPaused] = useState(false);
  const [radiusEntryTime, setRadiusEntryTime] = useState(null);
  const [checkpointIndex, setCheckpointIndex] = useState(0);
  const [countdown, setCountdown] = useState(60);
  const [bearingToCheckpoint, setBearingToCheckpoint] = useState(0);

  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const locationSubscription = useRef(null);

  useEffect(() => {
    const init = async () => {
      const docRef = doc(db, 'activities', activityId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;

      const data = snap.data();
      setActivity(data);
      setActivityMode(data.mode);
      startTimer();
      startTracking();
      setLoading(false);
    };
    init();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (locationSubscription.current) locationSubscription.current.remove();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);
      }
    }, 1000);
  };

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
      (loc) => {
        if (isPaused) return;
        const { latitude, longitude } = loc.coords;
        const location = { latitude, longitude };
        setCurrentLocation(location);
        handleTrackingUpdate(location);
      }
    );
  };

  const handleTrackingUpdate = (location) => {
    if (!activity) return;

    if (activityMode === 'path') {
      const finish = activity.route[activity.route.length - 1];
      const distance = getDistance(location, finish);
      if (distance < 0.03) completeActivity();
    }

    if (activityMode === 'spot') {
      const spot = activity.location;
      const dist = getDistance(location, spot);
      if (dist < activity.spotRadius / 1000) {
        if (!radiusEntryTime) {
          setRadiusEntryTime(Date.now());
          setCountdown(60);
          countdownTimerRef.current = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownTimerRef.current);
                completeActivity();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        setRadiusEntryTime(null);
        setCountdown(60);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        Alert.alert('Out of bounds', 'Return to the zone to complete the activity.');
      }
    }

    if (activityMode === 'checkpoints') {
      const current = activity.checkpoints[checkpointIndex];
      const distance = getDistance(location, current);
      setBearingToCheckpoint(getBearing(location, current));
      if (distance < 0.02) {
        if (checkpointIndex + 1 < activity.checkpoints.length) {
          setCheckpointIndex(checkpointIndex + 1);
          Speech.speak(`Checkpoint ${checkpointIndex + 2}`);
        } else {
          completeActivity();
        }
      }
    }
  };

  const getDistance = (loc1, loc2) => {
    const R = 6371;
    const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const dLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getBearing = (from, to) => {
    const lat1 = from.latitude * Math.PI / 180;
    const lon1 = from.longitude * Math.PI / 180;
    const lat2 = to.latitude * Math.PI / 180;
    const lon2 = to.longitude * Math.PI / 180;
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  const completeActivity = async () => {
    if (!user) return;
    clearInterval(timerRef.current);
    locationSubscription.current?.remove();
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    await updateDoc(doc(db, 'users', user.uid), {
      completedActivities: arrayUnion({
        activityId,
        title: activity.title,
        category: activity.category,
        completedAt: Timestamp.now(),
        duration: elapsedTime,
        distance: parseFloat(traveledDistance.toFixed(2)),
        mode: activityMode
      })
    });
    router.push({
      pathname: '/screens/ActivityCompletion',
      params: {
        activityId,
        title: activity.title,
        duration: elapsedTime.toString(),
        distance: traveledDistance.toFixed(2),
        mode: activityMode
      }
    });
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        showsUserLocation
        followsUserLocation
        showsCompass
        customMapStyle={adventureMapStyle}
        mapType="terrain"
      />

      {activityMode === 'spot' && radiusEntryTime && (
        <View style={styles.countdown}><Text style={styles.countText}>{countdown}s</Text></View>
      )}

      {activityMode === 'checkpoints' && (
        <View style={[styles.arrowContainer, { transform: [{ rotate: `${bearingToCheckpoint}deg` }] }]}>
          <Ionicons name="arrow-up" size={40} color="#FF6B00" />
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity onPress={() => setIsPaused(!isPaused)} style={styles.button}>
          <Text>{isPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode(viewMode === 'top' ? 'first-person' : 'top')} style={styles.button}>
          <Text>{viewMode === 'top' ? '1st Person' : 'Top View'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffffcc',
    padding: 10,
    borderRadius: 10,
  },
  button: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  countdown: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#000a',
    padding: 10,
    borderRadius: 10,
  },
  countText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  arrowContainer: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 50,
    elevation: 5
  }
});
