// app/auth/signup.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import AuthInput from './components/AuthInput';
import AuthButton from './components/AuthButton';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    // Add password length validation
    if (password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("User created with UID:", user.uid);
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        role: 'thrillseeker', // Default role
        createdAt: new Date(),
        xp: 0,
        level: 1,
        achievements: [],
        activitiesCompleted: 0,
        lastActive: new Date()
      });
      
      Alert.alert('Success', 'Account created successfully! Your UID is: ' + user.uid);
      
      // Navigate to login or home screen
      router.replace('/');
    } catch (error) {
      console.error('Error during signup:', error);
      Alert.alert('Signup Failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explorien</Text>
      <Text style={styles.subtitle}>Create your account</Text>
      
      <AuthInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <AuthInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <AuthInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      
      <AuthButton 
        title="Sign Up"
        onPress={handleSignup}
        loading={loading}
      />
      
      <AuthButton 
        title="Already have an account? Log In"
        onPress={() => router.push('/auth/login')}
        secondary
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
});