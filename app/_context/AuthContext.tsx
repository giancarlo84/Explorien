// app/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Define user roles for Explorien
export type UserRole = 'thrillseeker' | 'pathfinder' | 'expeditionary' | 'admin';

// Extended user type with Explorien-specific properties
export interface ExplorenUser extends User {
  role?: UserRole;
  displayName?: string | null;
  photoURL?: string | null;
}

// Context type definition
interface AuthContextType {
  currentUser: ExplorenUser | null;
  userRole: UserRole | null;
  loading: boolean;
  signup: (email: string, password: string, role?: UserRole) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<ExplorenUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Create a new user
  async function signup(email: string, password: string, role: UserRole = 'thrillseeker') {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        role,
        createdAt: new Date(),
        // Add other initial profile fields for Explorien
        achievements: [],
        xp: 0,
        level: 1,
        activitiesCompleted: 0,
        lastActive: new Date()
      });
      
      return;
    } catch (error) {
      console.error("Error during signup:", error);
      throw error;
    }
  }

  // Login existing user
  async function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout current user
  function logout() {
    return signOut(auth);
  }

  // Reset password
  function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  // Fetch user role from Firestore
  async function fetchUserRole(userId: string) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data().role as UserRole;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Update current user with Explorien-specific properties
        const role = await fetchUserRole(user.uid);
        setCurrentUser(user as ExplorenUser);
        setUserRole(role);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loading,
    signup,
    login,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}