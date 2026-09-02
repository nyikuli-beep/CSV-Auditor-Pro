import { User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export interface UserProfileDocument {
  uid: string;
  id: string;
  displayName: string;
  name: string;
  email: string;
  uploadsRemaining: number;
  uploadsUsed?: number;
  maxUploads?: number;
  quotaPeriod?: string;
  updatedAt: string;
  photoURL?: string;
  avatar?: string;
  createdAt: string;
  lastLogin: string;
  emailVerified: boolean;
  provider: string;
  plan: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  lastUploadedFile?: string;
  lastUploadDeviceId?: string;
}

/**
 * Creates or updates the Firestore user profile document.
 * Checks if user document exists in 'users' collection (keyed by user uid).
 * If not, initializes with email, uploadsRemaining: 5, and updatedAt.
 * Guarantees lastLogin, emailVerified, and updatedAt are refreshed on auth event.
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
    const AUTHORIZED_OWNER_EMAILS = ['nyikulibramwel@gmail.com'];
    const isOwnerEmail = AUTHORIZED_OWNER_EMAILS.some(e => e.toLowerCase() === email.toLowerCase().trim());
    
    const displayName = customData?.displayName || user.displayName || email.split('@')[0] || 'User';
    const photoURL = user.photoURL || undefined;
    const nowIso = new Date().toISOString();
    const assignedRole: 'Owner' | 'Admin' | 'Editor' | 'Viewer' = isOwnerEmail ? 'Owner' : (customData?.role || 'Editor');

    const currentPeriod = nowIso.substring(0, 7);

    if (!existingSnap.exists()) {
      // Create new profile document with default authoritative quota: 0 used, 5 remaining
      const newProfile: UserProfileDocument = {
        uid: user.uid,
        id: user.uid,
        displayName,
        name: displayName,
        email,
        maxUploads: 5,
        uploadsUsed: 0,
        uploadsRemaining: 5,
        quotaPeriod: currentPeriod,
        updatedAt: nowIso,
        photoURL,
        avatar: photoURL,
        createdAt: nowIso,
        lastLogin: nowIso,
        emailVerified: user.emailVerified,
        provider: providerId,
        plan: isOwnerEmail ? 'Enterprise' : 'Free',
        role: assignedRole,
      };

      await setDoc(userRef, newProfile);
    } else {
      // Update existing document while preserving valid usage and checking monthly rollover
      const existingData = existingSnap.data();
      const currentRole = isOwnerEmail ? 'Owner' : (existingData?.role || assignedRole);
      const maxUploads = typeof existingData?.maxUploads === 'number' && existingData.maxUploads > 0 
        ? existingData.maxUploads 
        : 5;
      const docPeriod = typeof existingData?.quotaPeriod === 'string' ? existingData.quotaPeriod : currentPeriod;

      let uploadsUsed = 0;
      if (docPeriod !== currentPeriod) {
        uploadsUsed = 0;
      } else if (typeof existingData?.uploadsUsed === 'number') {
        uploadsUsed = Math.max(0, Math.min(maxUploads, existingData.uploadsUsed));
      } else if (typeof existingData?.uploadsRemaining === 'number') {
        uploadsUsed = Math.max(0, Math.min(maxUploads, maxUploads - existingData.uploadsRemaining));
      }

      const uploadsRemaining = Math.max(0, maxUploads - uploadsUsed);

      await updateDoc(userRef, {
        lastLogin: nowIso,
        updatedAt: nowIso,
        email: email || existingData?.email || '',
        maxUploads,
        uploadsUsed,
        uploadsRemaining,
        quotaPeriod: currentPeriod,
        emailVerified: user.emailVerified,
        displayName: displayName || existingData?.displayName || 'User',
        name: displayName || existingData?.name || 'User',
        role: currentRole,
        plan: isOwnerEmail ? 'Enterprise' : (existingData?.plan || 'Free'),
        ...(photoURL ? { photoURL, avatar: photoURL } : {}),
      });
    }
  } catch (err) {
    console.warn('Unable to sync Firestore user profile:', err);
  }
}
