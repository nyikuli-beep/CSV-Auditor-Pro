import { User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { resolveAuthoritativeMonthlyUsage } from '../lib/quotaService';

export interface UserProfileDocument {
  uid: string;
  id: string;
  displayName: string;
  name: string;
  email: string;
  uploadsRemaining: number;
  uploadsUsed?: number;
  monthlyUploadsUsed?: number;
  maxUploads?: number;
  monthlyUploadLimit?: number;
  quotaPeriod?: string;
  quotaMonth?: string;
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
    const now = new Date();
    const nowIso = now.toISOString();
    const assignedRole: 'Owner' | 'Admin' | 'Editor' | 'Viewer' = isOwnerEmail ? 'Owner' : (customData?.role || 'Editor');

    const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    if (!existingSnap.exists()) {
      // Create new profile document with default authoritative quota: 0 used, 5 remaining
      const defaultLimit = isOwnerEmail ? 999999 : 5;
      const newProfile: UserProfileDocument = {
        uid: user.uid,
        id: user.uid,
        displayName,
        name: displayName,
        email,
        monthlyUploadLimit: defaultLimit,
        maxUploads: defaultLimit,
        monthlyUploadsUsed: 0,
        uploadsUsed: 0,
        uploadsRemaining: defaultLimit,
        quotaMonth: currentPeriod,
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
      const maxUploads = typeof existingData?.monthlyUploadLimit === 'number' && existingData.monthlyUploadLimit > 0
        ? existingData.monthlyUploadLimit
        : (typeof existingData?.maxUploads === 'number' && existingData.maxUploads > 0 ? existingData.maxUploads : (isOwnerEmail ? 999999 : 5));
      
      // Authoritatively resolve September 2026 usage & reconcile stale August records
      const { uploadsUsed } = resolveAuthoritativeMonthlyUsage(existingData, currentPeriod, maxUploads);
      const uploadsRemaining = Math.max(0, maxUploads - uploadsUsed);

      await updateDoc(userRef, {
        lastLogin: nowIso,
        updatedAt: nowIso,
        email: email || existingData?.email || '',
        monthlyUploadLimit: maxUploads,
        maxUploads,
        monthlyUploadsUsed: uploadsUsed,
        uploadsUsed,
        uploadsRemaining,
        quotaMonth: currentPeriod,
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
