// app/auth/login.tsx - Updated to support email or username login
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import AuthInput from './components/AuthInput';
import AuthButton from './components/AuthButton';

export default function LoginScreen() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to check if input is an email or username
  function isEmail(input: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  }

  // Function to get email from username
  async function getEmailFromUsername(username: string) {
    try {
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', username.toLowerCase())
      );
      const querySnapshot = await getDocs(usernameQuery);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return userDoc.data().email;
      }
      return null;
    } catch (error) {
      console.error('Error finding email from username:', error);
      throw new Error('Could not verify username');
    }
  }

  async function handleLogin() {
    if (!emailOrUsername || !password) {
      Alert.alert('Error', 'Please enter both your email/username and password');
      return;
    }

    try {
      setLoading(true);
      
      let emailToUse = emailOrUsername.trim().toLowerCase();
      
      // If input is not an email, treat it as username and get the email
      if (!isEmail(emailToUse)) {
        console.log('Input appears to be a username, looking up email...');
        
        const foundEmail = await getEmailFromUsername(emailToUse);
        if (!foundEmail) {
          Alert.alert(
            'Login Failed', 
            'Username not found. Please check your username or try using your email address.'
          );
          setLoading(false);
          return;
        }
        
        emailToUse = foundEmail;
        console.log('Found email for username:', emailToUse);
      }
      
      // Login with email and password
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      console.log("Logged in user UID:", userCredential.user.uid);
      
      // Navigate to home screen
      router.replace('/');
      
    } catch (error) {
      console.error('Error during login:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email/username. Please check your credentials or sign up.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explorien</Text>
      <Text style={styles.subtitle}>Welcome back, explorer!</Text>
      
      <AuthInput
        placeholder="Email or Username"
        value={emailOrUsername}
        onChangeText={setEmailOrUsername}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.helperText}>
        You can use either your email address or username to log in
      </Text>
      
      <AuthInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <AuthButton 
        title="Log In"
        onPress={handleLogin}
        loading={loading}
      />
      
      <AuthButton 
        title="Don't have an account? Sign Up"
        onPress={() => router.push('/auth/signup')}
        secondary
      />
      
      <AuthButton 
        title="Forgot Password?"
        onPress={() => router.push('/auth/forgot-password')}
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
    color: '#2196F3',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 15,
    marginTop: -10,
    textAlign: 'center',
  },
});