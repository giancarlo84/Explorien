// app/utils/geoUtils.js
import axios from 'axios';
import { Platform } from 'react-native';
import { GOOGLE_MAPS_ANDROID_API_KEY, GOOGLE_MAPS_WEB_API_KEY } from '@env';

// Choose the appropriate API key based on platform
const GOOGLE_API_KEY = Platform.select({
  ios: GOOGLE_MAPS_WEB_API_KEY, // Using web key for iOS
  android: GOOGLE_MAPS_ANDROID_API_KEY,
  default: GOOGLE_MAPS_WEB_API_KEY, // Fallback to web key
});

/**
 * Converts coordinates to place names using Google Geocoding API
 * @param {number} latitude - The latitude coordinate
 * @param {number} longitude - The longitude coordinate
 * @returns {Promise<string>} The place name (e.g., "Venice, Italy")
 */
export const reverseGeocode = async (latitude, longitude) => {
  console.log(`Geocoding request for: ${latitude}, ${longitude}`);
  console.log(`Using API key for platform: ${Platform.OS}`);
  
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
    // Log URL without showing full API key for security
    console.log(`API Request URL: ${url.substring(0, url.indexOf('key=') + 10)}...`);
    
    const response = await axios.get(url);
    console.log(`API Response status: ${response.data.status}`);
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      // Get the most relevant result
      const result = response.data.results[0];
      console.log(`Found address: ${result.formatted_address}`);
      
      // Extract city and country from address components
      let city = '';
      let country = '';
      
      for (const component of result.address_components) {
        if (component.types.includes('locality')) {
          city = component.long_name;
          console.log(`Found city: ${city}`);
        } else if (component.types.includes('country')) {
          country = component.long_name;
          console.log(`Found country: ${country}`);
        }
      }
      
      if (city && country) {
        const placeName = `${city}, ${country}`;
        console.log(`Returning place name: ${placeName}`);
        return placeName;
      } else {
        console.log(`Returning formatted address: ${result.formatted_address}`);
        return result.formatted_address;
      }
    }
    
    // If we reach here, something went wrong with the API
    console.log(`No usable results from API. Status: ${response.data.status}`);
    if (response.data.error_message) {
      console.log(`Error message: ${response.data.error_message}`);
    }
    
    // Fallback to coordinates with better formatting
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    // Log more details about the error
    if (error.response) {
      console.error('Error response:', error.response.data);
      console.error('Error status:', error.response.status);
    } else if (error.request) {
      console.error('Error request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
};