// app/_context/ActivityBuilderContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';
// Remove direct router import in the context
// import { router } from 'expo-router';

// Define the state interface with correct types
export interface BuilderState {
  title: string;
  category: string;
  difficulty: number;
  durationMinutes: number;
  distanceKm: number | null; // Allow null for spot mode
  activityType: string;
  mode: 'path' | 'spot' | 'checkpoints';
  gallery: string[];
  description: string;
  tips: string;
  route: { latitude: number; longitude: number }[] | null;
  location: { latitude: number; longitude: number } | null;
  checkpoints: { latitude: number; longitude: number }[];
  spotRadius?: number; // Add support for spotRadius
}

// Define context type with better typing
type ActivityBuilderContextType = {
  builderState: BuilderState;
  setBuilderState: (state: BuilderState | ((prevState: BuilderState) => BuilderState)) => void;
  isStateReady: boolean; // Add a flag to track state readiness
  canUseBuilder: boolean; // Add permission flag
};

// Create context with default values
export const ActivityBuilderContext = createContext<ActivityBuilderContextType>({
  builderState: {
    title: '',
    category: '',
    difficulty: 1,
    durationMinutes: 0,
    distanceKm: 0,
    activityType: 'exploration',
    mode: 'spot',
    gallery: [],
    description: '',
    tips: '',
    route: null,
    location: null,
    checkpoints: [],
    spotRadius: 100,
  },
  setBuilderState: () => {},
  isStateReady: false,
  canUseBuilder: false,
});

// Create provider component
export const ActivityBuilderProvider = ({ children }: { children: React.ReactNode }) => {
  // Get user role from AuthContext
  const { userRole } = useAuth();
  
  // Check if user has builder permissions
  const canUseBuilder = userRole === 'pathfinder' || userRole === 'expeditionary' || userRole === 'admin';
  
  // Define initial state
  const initialState: BuilderState = {
    title: '',
    category: '',
    difficulty: 1,
    durationMinutes: 0,
    distanceKm: 0,
    activityType: 'exploration',
    mode: 'spot',
    gallery: [],
    description: '',
    tips: '',
    route: null,
    location: null,
    checkpoints: [],
    spotRadius: 100,
  };

  // State hooks
  const [builderState, setBuilderState] = useState<BuilderState>(initialState);
  const [isStateReady, setIsStateReady] = useState(false);

  // Set state as ready after initial render
  useEffect(() => {
    console.log('ActivityBuilderContext: Setting state ready');
    setIsStateReady(true);
  }, []);

  // Log state changes for debugging
  useEffect(() => {
    console.log('ActivityBuilderContext: State updated', builderState);
  }, [builderState]);

  // Remove the problematic effect that was causing the error
  // We'll handle permission checks in individual components instead

  // Provide context
  return (
    <ActivityBuilderContext.Provider 
      value={{ 
        builderState, 
        setBuilderState, 
        isStateReady,
        canUseBuilder
      }}
    >
      {children}
    </ActivityBuilderContext.Provider>
  );
};

// Create a custom hook for easier context consumption
export const useActivityBuilder = () => {
  const context = useContext(ActivityBuilderContext);
  if (!context) {
    throw new Error('useActivityBuilder must be used within an ActivityBuilderProvider');
  }
  return context;
};

