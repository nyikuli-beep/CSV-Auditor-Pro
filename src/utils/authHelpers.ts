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

    if (!existingSnap.exists()) {
      // Check if there is an existing fallback quota to preserve cross-device testing state
      let initialUploadsRemaining = 5;
      let initialMonthlyUploadsUsed = 0;
      try {
        const fallbackRef = doc(db, 'users', 'usr-nyikuli');
        const fallbackSnap = await getDoc(fallbackRef);
        if (fallbackSnap.exists()) {
          const fbData = fallbackSnap.data();
          if (typeof fbData?.uploadsRemaining === 'number') {
            initialUploadsRemaining = fbData.uploadsRemaining;
          }
          if (typeof fbData?.monthlyUploadsUsed === 'number') {
            initialMonthlyUploadsUsed = fbData.monthlyUploadsUsed;
          }
        }
      } catch (e) {
        // use default 5
      }

      // Create new profile document with default fields
      const newProfile: any = {
        uid: user.uid,
        id: user.uid,
        displayName,
        name: displayName,
        email,
        uploadsRemaining: initialUploadsRemaining,
        monthlyUploadsUsed: initialMonthlyUploadsUsed,
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
      // Update existing document metadata while NEVER overwriting uploadsRemaining or monthlyUploadsUsed
      const existingData = existingSnap.data();
      const currentRole = isOwnerEmail ? 'Owner' : (existingData?.role || assignedRole);

      await updateDoc(userRef, {
        lastLogin: nowIso,
        updatedAt: nowIso,
        email: email || existingData?.email || '',
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
