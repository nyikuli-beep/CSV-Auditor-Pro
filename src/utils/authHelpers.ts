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
  plan: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
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
    role?: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  }
): Promise<void> {
  if (!user || !user.uid) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const existingSnap = await getDoc(userRef);

    const providerId = customData?.provider || user.providerData[0]?.providerId || 'password';
    const email = user.email || '';
    const AUTHORIZED_OWNER_EMAILS = ['nyikulibramwel@gmail.com', 'osanojunior38@gmail.com'];
    const isOwnerEmail = AUTHORIZED_OWNER_EMAILS.some(e => e.toLowerCase() === email.toLowerCase().trim());
    
    const displayName = customData?.displayName || user.displayName || email.split('@')[0] || 'User';
    const photoURL = user.photoURL || undefined;
    const nowIso = new Date().toISOString();
    const assignedRole: 'Owner' | 'Admin' | 'Editor' | 'Viewer' = isOwnerEmail ? 'Owner' : (customData?.role || 'Editor');

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
        plan: 'Free',
        role: assignedRole,
      };

      await setDoc(userRef, newProfile);
    } else {
      // Update existing document with latest lastLogin & emailVerified
      const existingData = existingSnap.data();
      const currentRole = isOwnerEmail ? 'Owner' : (existingData?.role || assignedRole);

      await updateDoc(userRef, {
        lastLogin: nowIso,
        emailVerified: user.emailVerified,
        displayName: displayName || existingData?.displayName || 'User',
        name: displayName || existingData?.name || 'User',
        role: currentRole,
        plan: existingData?.plan || 'Free',
        ...(photoURL ? { photoURL, avatar: photoURL } : {}),
      });
    }
  } catch (err) {
    console.warn('Unable to sync Firestore user profile:', err);
  }
}
