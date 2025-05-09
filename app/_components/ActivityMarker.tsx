// _components/ActivityMarker.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import getMarkerSvg from './markers';

// Category colors mapping
const categoryColors = {
  'Land': '#81C784',
  'Water': '#64B5F6',
  'Air': '#FFF59D',
  'Ice_Snow': '#E3F2FD',
  'ATV': '#EF9A9A',
  'Urban': '#BDBDBD',
};

const ActivityMarker = ({ id, coordinate, title, description, category, activity, displayName, size = 36 }) => {
  // Skip rendering if this is a category rather than an activity
  const isCategory = !title && displayName && !activity;
  if (isCategory) {
    console.log(`Skipping marker for category: ${displayName}`);
    return null;
  }
  
  // Skip rendering if coordinate is invalid
  if (!coordinate || typeof coordinate.latitude !== 'number' || typeof coordinate.longitude !== 'number') {
    console.warn(`Invalid coordinate for activity ${id}, skipping marker`);
    return null;
  }
  
  // For debugging
  console.log(`Rendering marker: ${category}/${activity}`);
  
  // Get the appropriate SVG component
  const MarkerIcon = getMarkerSvg(category, activity);
  const markerColor = categoryColors[category] || '#81C784';
  
  return (
    <Marker
      key={id}
      coordinate={coordinate}
      title={title}
      description={description}
    >
      <View style={[styles.markerContainer, { backgroundColor: markerColor }]}>
        <View style={styles.iconWrapper}>
          {MarkerIcon ? (
            <MarkerIcon width={24} height={24} fill="#000000" />
          ) : (
            <Text style={styles.fallbackText}>{activity && activity[0] ? activity[0].toUpperCase() : '?'}</Text>
          )}
        </View>
      </View>
      <Callout>
        <View style={styles.calloutView}>
          <Text style={styles.calloutTitle}>{title || 'Untitled'}</Text>
          <Text style={styles.calloutDescription}>{description || 'No description'}</Text>
          <Text style={styles.calloutCategory}>{displayName || category || 'Unknown'}</Text>
        </View>
      </Callout>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  calloutView: {
    padding: 10,
    maxWidth: 200,
    minWidth: 150,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  calloutDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  calloutCategory: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ActivityMarker;