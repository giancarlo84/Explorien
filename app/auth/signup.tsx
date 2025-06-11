// app/auth/signup.tsx - Updated with mandatory username field and email validation
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import AuthInput from './components/AuthInput';
import AuthButton from './components/AuthButton';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'available' | 'taken' | 'checking' | null>(null);

  // Debounced email availability check
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (email && email.includes('@') && email.includes('.')) {
        setEmailStatus('checking');
        const isAvailable = await checkEmailAvailability(email);
        setEmailStatus(isAvailable ? 'available' : 'taken');
      } else {
        setEmailStatus(null);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [email]);

  // Function to check if email is available (optional pre-check)
  const checkEmailAvailability = async (email: string) => {
    try {
      // This is a simple way to check - we'll catch the error if email exists
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods.length === 0; // Email is available if no sign-in methods exist
    } catch (error) {
      // If error occurs, assume email is available and let signup handle it
      return true;
    }
  };

  // Function to check if username is already taken
  const checkUsernameAvailability = async (username: string) => {
    try {
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', username.toLowerCase())
      );
      const querySnapshot = await getDocs(usernameQuery);
      return querySnapshot.empty; // Returns true if username is available
    } catch (error) {
      console.error('Error checking username:', error);
      throw new Error('Could not verify username availability');
    }
  };

  // Function to validate username format
  const validateUsername = (username: string) => {
    // Username should be 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    
    if (!username) {
      return 'Username is required';
    }
    
    if (username.length < 3) {
      return 'Username must be at least 3 characters long';
    }
    
    if (username.length > 20) {
      return 'Username must not exceed 20 characters';
    }
    
    if (!usernameRegex.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    
    return null; // Valid username
  };

  const handleSignup = async () => {
    // Validate all fields are filled
    if (!email || !username || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate username format
    const usernameError = validateUsername(username);
    if (usernameError) {
      Alert.alert('Invalid Username', usernameError);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    // Validate password length
    if (password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      
      // Check if username is available
      const isUsernameAvailable = await checkUsernameAvailability(username);
      if (!isUsernameAvailable) {
        Alert.alert('Username Taken', 'This username is already taken. Please choose another one.');
        setLoading(false);
        return;
      }
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("User created with UID:", user.uid);
      
      // Create user profile in Firestore with the chosen username
      await setDoc(doc(db, 'users', user.uid), {
        email: email.toLowerCase(),
        username: username.toLowerCase(), // Store username in lowercase
        displayName: username, // Use username as display name
        role: 'thrillseeker', // Default role
        createdAt: new Date(),
        xp: 0,
        level: 1,
        achievements: [],
        activitiesCompleted: 0,
        lastActive: new Date()
      });
      
      Alert.alert(
        'Success', 
        `Welcome to Explorien, ${username}! Your account has been created successfully.`,
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/')
          }
        ]
      );
      
    } catch (error) {
      console.error('Error during signup:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Failed to create account. Please try again.';
      let alertTitle = 'Signup Failed';
      let alertButtons = [{ text: 'OK' }];
      
      if (error.code === 'auth/email-already-in-use') {
        alertTitle = 'Email Already Registered';
        errorMessage = 'An account with this email already exists. Would you like to sign in instead?';
        alertButtons = [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => router.push('/auth/login')
          }
        ];
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password (at least 6 characters).';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled. Please contact support.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      Alert.alert(alertTitle, errorMessage, alertButtons);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explorien</Text>
      <Text style={styles.subtitle}>Create your explorer account</Text>
      
      <View style={styles.inputContainer}>
        <AuthInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            emailStatus === 'taken' && styles.inputError,
            emailStatus === 'available' && styles.inputSuccess
          ]}
        />
        {emailStatus === 'checking' && (
          <Text style={styles.statusText}>Checking email...</Text>
        )}
        {emailStatus === 'taken' && (
          <Text style={styles.errorText}>This email is already registered</Text>
        )}
        {emailStatus === 'available' && (
          <Text style={styles.successText}>Email is available</Text>
        )}
      </View>
      
      <AuthInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
      />
      <Text style={styles.helperText}>
        Choose a unique username (3-20 characters, letters, numbers, and underscores only)
      </Text>
      
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
        title="Create Account"
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
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  inputSuccess: {
    borderColor: '#4CAF50',
  },
  statusText: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 4,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 4,
    textAlign: 'center',
  },
  successText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    textAlign: 'center',
  },
});