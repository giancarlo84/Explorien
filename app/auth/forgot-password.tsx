// app/auth/forgot-password.tsx - Updated to support email or username
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import AuthInput from './components/AuthInput';
import AuthButton from './components/AuthButton';

export default function ForgotPasswordScreen() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
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

  async function handleResetPassword() {
    if (!emailOrUsername) {
      Alert.alert('Error', 'Please enter your email address or username');
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
            'Username Not Found', 
            'We couldn\'t find an account with that username. Please check your username or try using your email address instead.'
          );
          setLoading(false);
          return;
        }
        
        emailToUse = foundEmail;
        console.log('Found email for username:', emailToUse);
      }

      // Send password reset email
      await sendPasswordResetEmail(auth, emailToUse);
      
      Alert.alert(
        'Password Reset Email Sent',
        `We've sent password reset instructions to ${emailToUse}. Check your email (including spam folder) and follow the instructions to reset your password.`,
        [{ text: 'OK', onPress: () => router.push('/auth/login') }]
      );
      
    } catch (error) {
      console.error('Error sending reset email:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please check your email address or sign up for a new account.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many password reset requests. Please wait a moment before trying again.';
      }
      
      Alert.alert('Reset Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address or username and we'll send you instructions to reset your password
      </Text>
      
      <AuthInput
        placeholder="Email or Username"
        value={emailOrUsername}
        onChangeText={setEmailOrUsername}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.helperText}>
        You can use either your email address or username
      </Text>
      
      <AuthButton 
        title="Send Reset Link"
        onPress={handleResetPassword}
        loading={loading}
      />
      
      <AuthButton 
        title="Back to Login"
        onPress={() => router.push('/auth/login')}
        secondary
      />
      
      <AuthButton 
        title="Don't have an account? Sign Up"
        onPress={() => router.push('/auth/signup')}
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
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 15,
    marginTop: -10,
    textAlign: 'center',
  },
});