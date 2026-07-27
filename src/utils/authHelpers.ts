import { User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export interface UserProfileDocument {
  uid: string;
  id: string;
  displayName: string;
  name: string;
  email: string;
  photoURL?: string;
  avatar?: string;
  createdAt: string;
  lastLogin: string;
  emailVerified: boolean;
  provider: string;
  role: 'Admin' | 'Editor' | 'Viewer';
}

/**
 * Creates or updates the Firestore user profile document.
 * Guarantees lastLogin and emailVerified are refreshed on every auth event.
 */
export async function syncUserProfileToFirestore(
  user: User,
  customData?: {
    displayName?: string;
    provider?: string;
    role?: 'Admin' | 'Editor' | 'Viewer';
  }
): Promise<void> {
  if (!user || !user.uid) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const existingSnap = await getDoc(userRef);

    const providerId = customData?.provider || user.providerData[0]?.providerId || 'password';
    const displayName = customData?.displayName || user.displayName || user.email?.split('@')[0] || 'User';
    const email = user.email || '';
    const photoURL = user.photoURL || undefined;
    const nowIso = new Date().toISOString();

    if (!existingSnap.exists()) {
      // Create new profile document
      const newProfile: UserProfileDocument = {
        uid: user.uid,
        id: user.uid,
        displayName,
        name: displayName,
        email,
        photoURL,
        avatar: photoURL,
        createdAt: nowIso,
        lastLogin: nowIso,
        emailVerified: user.emailVerified,
        provider: providerId,
        role: customData?.role || 'Editor',
      };

      await setDoc(userRef, newProfile);
    } else {
      // Update existing document with latest lastLogin & emailVerified
      await updateDoc(userRef, {
        lastLogin: nowIso,
        emailVerified: user.emailVerified,
        displayName: displayName || existingSnap.data()?.displayName || 'User',
        name: displayName || existingSnap.data()?.name || 'User',
        ...(photoURL ? { photoURL, avatar: photoURL } : {}),
      });
    }
  } catch (err) {
    console.warn('Unable to sync Firestore user profile:', err);
  }
}
