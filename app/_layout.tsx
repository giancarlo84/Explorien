import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import useColorScheme from '@/_hooks/useColorScheme';
import { ActivityBuilderProvider } from '@/_context/ActivityBuilderContext';
import { AuthProvider, useAuth } from '@/_context/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a separate component for protected routes
function ProtectedRouteGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  
  useEffect(() => {
    // Skip protection for auth routes
    const inAuthGroup = segments[0] === 'auth';
    
    if (!loading && !currentUser && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace('/auth/login');
    }
  }, [currentUser, loading, segments]);
  
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ActivityBuilderProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ 
              title: 'Login', 
              headerBackVisible: false 
            }} />
            <Stack.Screen name="auth/signup" options={{ title: 'Sign Up' }} />
            <Stack.Screen name="auth/forgot-password" options={{ title: 'Reset Password' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ActivityBuilderProvider>
    </AuthProvider>
  );
}
