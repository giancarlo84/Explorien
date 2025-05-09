// app/firebaseConfig.ts

// 1. Core SDK
import { initializeApp } from 'firebase/app';

// 2. Firestore (if you need Firestore)
import { getFirestore } from 'firebase/firestore';

// 3. Realtime Database (if you need RTDB)
import { getDatabase } from 'firebase/database';

// 4. Add Authentication
import { getAuth } from 'firebase/auth';

// Your Firebase project configuration
const firebaseConfig = {
  apiKey:            "AIzaSyAZ19FJwB-AeFYF-WzxIk8IoBACOMpesfY",
  authDomain:        "explorien-d33f6.firebaseapp.com",
  databaseURL:       "https://explorien-d33f6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "explorien-d33f6",
  storageBucket:     "explorien-d33f6.appspot.com",
  messagingSenderId: "226048235504",
  appId:             "1:226048235504:web:670988ec41426818ec2f35"
};

// Initialize and export your SDK clients
const app = initializeApp(firebaseConfig);

// Firestore (if you're using it)
export const db = getFirestore(app);

// Realtime Database (if you're using it)
export const realtimeDB = getDatabase(app);

// Initialize and export Auth
export const auth = getAuth(app);

// Optionally export the raw app instance
export default app;

