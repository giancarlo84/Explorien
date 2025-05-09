import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  LogBox
} from 'react-native';
import { Stack } from 'expo-router';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';

LogBox.ignoreLogs(['Support for defaultProps will be removed']);

interface UserData {
  displayName?: string;
  photoURL?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'thrillseeker' | 'pathfinder' | 'expeditionary' | 'admin';
  countryName?: string;
  countryCode?: CountryCode;
  bio?: string;
  createdAt?: any;
  level: number;
  xp: number;
  activitiesCompleted: number;
  activitiesCreated?: number;
  achievements: string[];
}

export default function Profile() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'users', uid))
      .then(snap => snap.exists() && setUserData(snap.data() as UserData))
      .finally(() => setLoading(false));
  }, [uid]);

  const saveProfile = async () => {
    if (!uid || !userData) return;
    const { displayName, firstName, lastName, countryName, countryCode, bio } = userData;
    await updateDoc(doc(db, 'users', uid), { displayName, firstName, lastName, countryName, countryCode, bio });
    setEditing(false);
  };

  const toggleEdit = () => editing ? saveProfile() : setEditing(true);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && uid) {
      const uri = result.assets?.[0]?.uri;
      if (uri) {
        setUserData(d => d ? { ...d, photoURL: uri } : d);
        await updateDoc(doc(db, 'users', uid), { photoURL: uri });
      }
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;
  if (!userData) return <Text style={styles.center}>No profile data.</Text>;

  let memberSince = '';
  if (userData.createdAt) {
    const d = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
    memberSince = d.toLocaleDateString();
  }

  const flagEmoji = userData.countryCode
    ? String.fromCodePoint(
        ...userData.countryCode.toUpperCase().split('').map(c => c.codePointAt(0)! + 127397)
      )
    : '';

  const onSelectCountry = (country: Country) => {
    setUserData(d => d ? {
      ...d,
      countryName: country.name,
      countryCode: country.cca2
    } : d);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: userData.displayName || userData.email,
          headerRight: () => (
            <TouchableOpacity onPress={toggleEdit} style={styles.headerButton}>
              <FontAwesome5 name={editing ? 'save' : 'pen'} size={20} color="#FF6B00" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} disabled={!editing}>
            {userData.photoURL
              ? <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
              : <FontAwesome5 name="user-circle" size={96} color="#ccc" />}
          </TouchableOpacity>
          <Text style={styles.displayNameText}>{userData.displayName || userData.email}</Text>
          <Text style={styles.role}>{userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</Text>
        </View>

        {editing ? (
          <>
            <Text>First Name</Text>
            <TextInput
              style={styles.input}
              value={userData.firstName}
              onChangeText={text => setUserData({ ...userData, firstName: text })}
            />
            <Text>Last Name</Text>
            <TextInput
              style={styles.input}
              value={userData.lastName}
              onChangeText={text => setUserData({ ...userData, lastName: text })}
            />
            <Text>Country</Text>
            <View style={styles.input}>
              <CountryPicker
                countryCode={userData.countryCode || 'US'}
                withFilter
                withFlag
                withEmoji
                withCountryNameButton
                onSelect={onSelectCountry}
                placeholder={userData.countryName || 'Select your country'}
              />
              <FontAwesome5 name="chevron-down" style={styles.dropdownIcon} size={14} color="#333" />
            </View>
            <Text>Bio</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={userData.bio}
              multiline
              onChangeText={text => setUserData({ ...userData, bio: text })}
            />
          </>
        ) : (
          <>
            <Text style={styles.inlineInfo}>
              {userData.firstName} {userData.lastName} {flagEmoji && `• ${flagEmoji} ${userData.countryName}`}
            </Text>
            {userData.bio && <Text style={styles.bioText}>{userData.bio}</Text>}
          </>
        )}

        <Text style={styles.memberSince}>Member Since: {memberSince}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statValue}>{userData.level}</Text><Text style={styles.statLabel}>Level</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{userData.xp}</Text><Text style={styles.statLabel}>XP</Text></View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statValue}>{userData.activitiesCompleted}</Text><Text style={styles.statLabel}>Completed</Text></View>
            {userData.role !== 'thrillseeker' && (
              <View style={styles.statCard}><Text style={styles.statValue}>{userData.activitiesCreated || 0}</Text><Text style={styles.statLabel}>Created</Text></View>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Achievements</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerButton: { marginRight: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 8 },
  displayNameText: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  role: { fontSize: 16, color: '#666', marginBottom: 12, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownIcon: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -7,
    pointerEvents: 'none',
  },
  inlineInfo: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  bioText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  memberSince: { textAlign: 'center', marginBottom: 20, color: '#666' },
  statsContainer: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statCard: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: '#666' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
});










