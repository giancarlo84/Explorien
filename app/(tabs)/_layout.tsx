import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import useColorScheme from '@/_hooks/useColorScheme';
import { useAuth } from '@/_context/AuthContext';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeTintColor = colorScheme === 'dark' ? '#fff' : '#FF6B00';
  const { currentUser, loading } = useAuth();

  // Simple auth check - render login button if not authenticated
  if (!loading && !currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Explorien</Text>
        <Text style={styles.message}>Please log in to access this app</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/auth/login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTintColor,
        headerTitle: '',                           // remove top title
        headerRight: () => (                       // add profile icon
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/screens/Profile')}
          >
            <FontAwesome5 name="user-circle" size={24} color={activeTintColor} />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome5 name="campground" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <FontAwesome5 name="compass" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <FontAwesome5 name="map-marked-alt" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FF6B00',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  profileButton: {
    marginRight: 16,
  },
});
