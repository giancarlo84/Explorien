// app/screens/ActivityBuilderStep2.tsx
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Button,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ActivityBuilderContext } from '../_context/ActivityBuilderContext';
import { Picker } from '@react-native-picker/picker';
import { collection, getDocs, query, where, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import DifficultyBlocks from '../_components/DifficultyBlocks';

// Define types for category and activity
interface Category {
  id: string;
  displayName: string;
}

interface Activity {
  id: string;
  displayName: string;
  categoryId: string;
}

export default function ActivityBuilderStep2() {
  const { builderState, setBuilderState } = useContext(ActivityBuilderContext);
  const router = useRouter();
  
  // Form fields
  const [title, setTitle] = useState(builderState.title || '');
  const [description, setDescription] = useState(builderState.description || '');
  const [tips, setTips] = useState(builderState.tips || '');
  const [difficulty, setDifficulty] = useState(builderState.difficulty || 1);
  const [imageUri, setImageUri] = useState(builderState.gallery?.[0] || '');
  
  // Category and activity selection
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(builderState.category || '');
  const [selectedActivityType, setSelectedActivityType] = useState(builderState.activityType || '');
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get difficulty label
  const getDifficultyLabel = () => {
    switch (difficulty) {
      case 1: return 'Easy';
      case 2: return 'Easy-Moderate';
      case 3: return 'Moderate';
      case 4: return 'Moderate-Hard';
      case 5: return 'Hard';
      default: return 'Moderate';
    }
  };
  
  // Get simplified mode text
  const getSimpleModeText = () => {
    switch (builderState.mode) {
      case 'path': return 'Path';
      case 'spot': return 'Spot';
      case 'checkpoints': return 'Checkpoints';
      default: return '';
    }
  };
  
  // Get simplified distance/radius text
  const getSimpleDistanceText = () => {
    if (builderState.mode === 'spot' && builderState.spotRadius) {
      return `${builderState.spotRadius} m`;
    } else if ((builderState.mode === 'path' || builderState.mode === 'checkpoints') && builderState.distanceKm) {
      return `${builderState.distanceKm} km`;
    } else {
      return '-';
    }
  };
  
  // Load categories from Firebase
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesCollection = collection(db, 'categories');
        const categoriesSnapshot = await getDocs(categoriesCollection);
        const categoriesList: Category[] = [];
        
        categoriesSnapshot.forEach((doc) => {
          categoriesList.push({ 
            id: doc.id, 
            displayName: doc.data().displayName || doc.id 
          });
        });
        
        // If no categories found in Firebase, add fallback categories
        if (categoriesList.length === 0) {
          console.log('No categories found, adding fallback categories');
          categoriesList.push({ id: 'Air', displayName: 'Air' });
          categoriesList.push({ id: 'Ice_Snow', displayName: 'Ice/Snow' });
          categoriesList.push({ id: 'Land', displayName: 'Land' });
          categoriesList.push({ id: 'Urban', displayName: 'Urban' });
          categoriesList.push({ id: 'Water', displayName: 'Water' });
          categoriesList.push({ id: 'ATV', displayName: 'All Terrain Vehicles' });
        }
        
        setCategories(categoriesList);
      } catch (error) {
        console.error('Error fetching categories from Firebase:', error);
        
        // Add fallback categories on error
        const fallbackCategories = [
          { id: 'Air', displayName: 'Air' },
          { id: 'Ice_Snow', displayName: 'Ice/Snow' },
          { id: 'Land', displayName: 'Land' },
          { id: 'Urban', displayName: 'Urban' },
          { id: 'Water', displayName: 'Water' },
          { id: 'ATV', displayName: 'All Terrain Vehicles' }
        ];
        setCategories(fallbackCategories);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Fetch activities when a category is selected
useEffect(() => {
  const fetchActivities = async () => {
    if (!selectedCategory) {
      setFilteredActivities([]);
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Fetching activities for category: ${selectedCategory}`);
      
      // Start with an empty Map to collect unique activities by normalized name
      const activityMap = new Map();
      
      // First try to get actual activities from Firebase
      try {
        // Get all activity types in this category
        const activityTypesRef = collection(doc(db, 'categories', selectedCategory), 'activities');
        const activityTypesSnap = await getDocs(activityTypesRef);
        
        console.log(`Found ${activityTypesSnap.size} activity types in category ${selectedCategory}`);
        
        // Process each activity type from Firebase
        activityTypesSnap.forEach(docSnapshot => {
          const activityTypeId = docSnapshot.id;
          const data = docSnapshot.data();
          
          // Normalize the display name (not the ID) for comparison
          const displayName = data.displayName || formatActivityName(activityTypeId);
          const normalizedName = normalizeActivityName(displayName);
          
          // Add this activity type with priority over fallbacks
          activityMap.set(normalizedName, {
            id: activityTypeId,
            displayName: displayName,
            categoryId: selectedCategory
          });
        });
      } catch (error) {
        console.error(`Error fetching activity types for category ${selectedCategory}:`, error);
      }
      
      // Get the fallback activities - only add if no Firebase version exists
      const baseActivities = getFallbackActivitiesForCategory(selectedCategory);
      
      // Add fallback activities only if no Firebase match exists
      baseActivities.forEach(activity => {
        // Normalize the display name for comparison
        const normalizedName = normalizeActivityName(activity.displayName);
        
        // Only add if not already in the map
        if (!activityMap.has(normalizedName)) {
          activityMap.set(normalizedName, {
            ...activity
          });
        }
      });
      
      // Convert map back to array and sort alphabetically by display name
      const activitiesList = Array.from(activityMap.values())
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      console.log(`Prepared ${activitiesList.length} activities for dropdown`);
      
      setFilteredActivities(activitiesList);
    } catch (error) {
      console.error('Error fetching activities from Firebase:', error);
      // On error, use fallback activities
      const fallbackActivities = getFallbackActivitiesForCategory(selectedCategory);
      setFilteredActivities(fallbackActivities);
    } finally {
      setLoading(false);
    }
  };
  
  fetchActivities();
}, [selectedCategory]);

// For comparison/deduplication - creates normalized strings for Map keys
const normalizeActivityName = (displayName) => {
  if (!displayName) return '';
  
  // Convert to lowercase
  let normalized = displayName.toLowerCase();
  
  // Replace hyphens with spaces
  normalized = normalized.replace(/-/g, ' ');
  
  // Replace multiple spaces with a single space
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Remove all non-alphanumeric characters (except spaces)
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');
  
  // Trim any leading/trailing spaces
  normalized = normalized.trim();
  
  // Finally, remove all spaces
  normalized = normalized.replace(/\s/g, '');
  
  return normalized;
};

// For display purposes - converts IDs to readable names
const formatActivityName = (activityTypeId) => {
  if (!activityTypeId) return '';
  
  return activityTypeId
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
  
  // Handle image picking
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  };
  
  // Handle save draft
  const handleSaveDraft = () => {
    setBuilderState({
      ...builderState,
      title,
      description,
      tips,
      difficulty,
      category: selectedCategory,
      activityType: selectedActivityType || 'exploration',
      gallery: imageUri ? [imageUri] : [],
    });
    Alert.alert('Saved', 'Your draft has been saved.');
  };
  
  // Handle continue to preview
  const handleContinueToPreview = () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Title is required.');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Missing Field', 'Description is required.');
      return;
    }
    
    if (!selectedCategory) {
      Alert.alert('Missing Field', 'Category is required.');
      return;
    }
    
    if (!selectedActivityType) {
      Alert.alert('Missing Field', 'Activity is required.');
      return;
    }
    
    setBuilderState({
      ...builderState,
      title,
      description,
      tips,
      difficulty,
      category: selectedCategory,
      activityType: selectedActivityType,
      gallery: imageUri ? [imageUri] : [],
    });
    router.push('/screens/ActivityBuilderStep3');
  };
  
  // Get fallback activities for a category
  const getFallbackActivitiesForCategory = (categoryId) => {
    switch(categoryId) {
      case 'Land':
        return [
          { id: 'camping', displayName: 'Camping', categoryId: 'Land' },
          { id: 'canyoning', displayName: 'Canyoning', categoryId: 'Land' },
          { id: 'caving', displayName: 'Caving', categoryId: 'Land' },
          { id: 'climbing', displayName: 'Climbing', categoryId: 'Land' },
          { id: 'hiking', displayName: 'Hiking', categoryId: 'Land' },
          { id: 'mountain_biking', displayName: 'Mountain Biking', categoryId: 'Land' },
          { id: 'mountaineering', displayName: 'Mountaineering', categoryId: 'Land' },
          { id: 'mounted_riding', displayName: 'Mounted Riding', categoryId: 'Land' },
          { id: 'scrambling', displayName: 'Scrambling', categoryId: 'Land' },
          { id: 'trekking', displayName: 'Trekking', categoryId: 'Land' },
          { id: 'zip_lining', displayName: 'Zip Lining', categoryId: 'Land' },
        ];
      case 'Water':
        return [
          { id: 'canoeing', displayName: 'Canoeing', categoryId: 'Water' },
          { id: 'coasteering', displayName: 'Coasteering', categoryId: 'Water' },
          { id: 'kayaking', displayName: 'Kayaking', categoryId: 'Water' },
          { id: 'paddleboard', displayName: 'Paddleboarding', categoryId: 'Water' },
          { id: 'rafting', displayName: 'Rafting', categoryId: 'Water' },
          { id: 'sailing', displayName: 'Sailing', categoryId: 'Water' },
          { id: 'scuba_diving', displayName: 'Scuba Diving', categoryId: 'Water' },
          { id: 'snorkeling', displayName: 'Snorkeling', categoryId: 'Water' },
        ];
      case 'Air':
        return [
          { id: 'hand_gliding', displayName: 'Hand Gliding', categoryId: 'Air' },
          { id: 'hot_air_balloon', displayName: 'Hot Air Balloon', categoryId: 'Air' },
          { id: 'parachuting', displayName: 'Parachuting', categoryId: 'Air' },
          { id: 'paragliding', displayName: 'Paragliding', categoryId: 'Air' },
          { id: 'skydiving', displayName: 'Skydiving', categoryId: 'Air' },
          { id: 'wingsuit_flying', displayName: 'Wingsuit Flying', categoryId: 'Air' },
        ];
      case 'Ice_Snow':
        return [
          { id: 'ice_climbing', displayName: 'Ice Climbing', categoryId: 'Ice_Snow' },
          { id: 'nordic_skating', displayName: 'Nordic Skating', categoryId: 'Ice_Snow' },
          { id: 'nordic_skiing', displayName: 'Nordic Skiing', categoryId: 'Ice_Snow' },
          { id: 'snowboarding', displayName: 'Snowboarding', categoryId: 'Ice_Snow' },
          { id: 'snowmobile', displayName: 'Snowmobile', categoryId: 'Ice_Snow' },
          { id: 'snowshoeing', displayName: 'Snowshoeing', categoryId: 'Ice_Snow' },
        ];
      case 'ATV':
        return [
          { id: 'dirt_biking', displayName: 'Dirt Biking', categoryId: 'ATV' },
          { id: 'off_roading', displayName: 'Off-Roading', categoryId: 'ATV' },
          { id: 'quad_biking', displayName: 'Quad Biking', categoryId: 'ATV' },
          { id: 'sxs', displayName: 'SxS', categoryId: 'ATV' },
        ];
      case 'Urban':
        return [
          { id: 'electric_scooter_ride', displayName: 'Electric Scooter Ride', categoryId: 'Urban' },
          { id: 'geocaching', displayName: 'Geocaching', categoryId: 'Urban' },
          { id: 'parkour', displayName: 'Parkour', categoryId: 'Urban' },
          { id: 'scooter_ride', displayName: 'Scooter Ride', categoryId: 'Urban' },
          { id: 'skating', displayName: 'Skating', categoryId: 'Urban' },
          { id: 'urban_cycling', displayName: 'Urban Cycling', categoryId: 'Urban' },
          { id: 'urban_hiking', displayName: 'Urban Hiking', categoryId: 'Urban' },
        ];
      default:
        return [];
    }
  };
  
  if (loading && categories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Step 2: Add Details</Text>
      
      <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Name your activity"
      />
      
      <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe your activity"
        multiline
      />
      
      <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedCategory}
          onValueChange={(itemValue) => {
            setSelectedCategory(itemValue);
            setSelectedActivityType(''); // Reset activity when category changes
          }}
          style={styles.picker}
          mode="dropdown"
        >
          <Picker.Item label="Select a category" value="" />
          {categories.map((category) => (
            <Picker.Item
              key={category.id}
              label={category.id === 'Ice_Snow' ? 'Ice/Snow' : 
                    category.id === 'ATV' ? 'All Terrain Vehicles' : 
                    category.displayName || category.id}
              value={category.id}
            />
          ))}
        </Picker>
      </View>
      
      <Text style={styles.label}>Activity <Text style={styles.required}>*</Text></Text>
      <View style={styles.pickerContainer}>
        {loading && selectedCategory ? (
          <View style={styles.loadingPickerContainer}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.loadingText}>Loading activities...</Text>
          </View>
        ) : (
          <Picker
  selectedValue={selectedActivityType}
  onValueChange={(itemValue) => {
    console.log('Selected activity:', itemValue);
    setSelectedActivityType(itemValue);
  }}
  style={styles.picker}
  enabled={!!selectedCategory}
  mode="dropdown"
>
  <Picker.Item label={selectedCategory ? "Select an activity" : "First select a category"} value="" />
  {filteredActivities.map((activity) => (
    <Picker.Item
      key={activity.id}
      label={activity.displayName}
      value={activity.id}
    />
  ))}
</Picker>
        )}
      </View>
      
      <Text style={styles.label}>Mode</Text>
      <Text style={styles.valueText}>
        {getSimpleModeText()}
      </Text>
      
      <Text style={styles.label}>
        {builderState.mode === 'spot' ? 'Radius' : 'Distance'}
      </Text>
      <Text style={styles.valueText}>
        {getSimpleDistanceText()}
      </Text>
      
      <Text style={styles.label}>Difficulty</Text>
      <View style={styles.sliderContainer}>
        <DifficultyBlocks 
          value={difficulty} 
          onValueChange={setDifficulty} 
        />
      </View>
      
      <Text style={styles.label}>Tips (optional)</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={tips}
        onChangeText={setTips}
        placeholder="Optional advice or warnings"
        multiline
      />
      
      <Text style={styles.label}>Upload Picture (optional)</Text>
      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <TouchableOpacity style={styles.changeImageButton} onPress={handlePickImage}>
            <Text style={styles.changeImageText}>Change Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
          <Text style={styles.uploadButtonText}>Select Photo</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.buttonContainer}>
        <Button title="Save Draft" onPress={handleSaveDraft} color="#888" />
        <View style={{ height: 12 }} />
        <Button title="Continue to Preview" onPress={handleContinueToPreview} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 16, 
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  loadingPickerContainer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 24 
  },
  label: { 
    fontSize: 16, 
    marginTop: 16, 
    fontWeight: '600',
  },
  required: {
    color: 'red',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#f9f9f9',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  sliderContainer: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  valueText: {
    fontSize: 16,
    color: '#333',
    marginTop: 8,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  autoGeneratedText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#888',
    marginTop: 8,
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  uploadButtonText: {
    color: '#555',
    fontSize: 16,
  },
  imageContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: { 
    width: '100%', 
    height: 200, 
    borderRadius: 8, 
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderTopLeftRadius: 8,
  },
  changeImageText: {
    color: 'white',
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 16,
  }
});

