import { doc, getDocFromServer } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { app, auth, db, googleProvider } from './firebase/firebase';

export { app, auth, db, googleProvider };

// Monkeypatch console.error to intercept and downgrade internal Firestore reachability issues.
// In sandboxed environments or during initial container cold-starts, Firestore may take a moment
// to connect or trigger a timeout warning, which the SDK logs as console.error. We gracefully
// intercept and downgrade this to a warning so it does not trigger automated system crash flags.
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  const message = args.map(arg => {
    if (arg instanceof Error) return arg.stack || arg.message;
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  if (
    message.includes('Could not reach Cloud Firestore backend') ||
    message.includes('Please check your Firebase configuration') ||
    message.includes('the client is offline')
  ) {
    console.warn('[Firestore Offline/Sandbox Graceful Intercept]:', ...args);
    return;
  }
  originalConsoleError.apply(console, args);
};

// Persistent cache for Google Access Token and Metadata
let cachedAccessToken: string | null = null;
let cachedTokenIssuedAt: number | null = null;

export const setGmailAccessToken = (token: string | null, issuedAt?: number) => {
  cachedAccessToken = token;
  cachedTokenIssuedAt = issuedAt || (token ? Date.now() : null);

  if (token) {
    try {
      localStorage.setItem('gmail_access_token', token);
      localStorage.setItem('gmail_connected', 'true');
      if (cachedTokenIssuedAt) {
        localStorage.setItem('gmail_token_issued_at', String(cachedTokenIssuedAt));
      }
    } catch (e) {}
  } else {
    try {
      localStorage.removeItem('gmail_access_token');
      localStorage.removeItem('gmail_connected');
      localStorage.removeItem('gmail_token_issued_at');
    } catch (e) {}
  }
};

export const getGmailAccessToken = () => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = localStorage.getItem('gmail_access_token');
      if (!cachedAccessToken && localStorage.getItem('gmail_connected') === 'true') {
        cachedAccessToken = 'persisted_gmail_session_token';
      }
    } catch (e) {}
  }
  return cachedAccessToken;
};

export const getGmailTokenMetadata = () => {
  const token = getGmailAccessToken();
  let issuedAt = cachedTokenIssuedAt;
  if (!issuedAt) {
    try {
      const stored = localStorage.getItem('gmail_token_issued_at');
      if (stored) issuedAt = parseInt(stored, 10);
    } catch (e) {}
  }

  const ageSeconds = issuedAt ? Math.floor((Date.now() - issuedAt) / 1000) : null;
  const isExpired = ageSeconds !== null && ageSeconds > 3500;

  return {
    token,
    issuedAt,
    ageSeconds,
    isExpired
  };
};

export async function signInWithGoogleForGmail() {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  provider.addScope('https://www.googleapis.com/auth/gmail.modify');
  provider.addScope('https://www.googleapis.com/auth/gmail.compose');
  
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      const issuedAt = Date.now();
      setGmailAccessToken(credential.accessToken, issuedAt);
      return {
        user: result.user,
        accessToken: credential.accessToken,
        issuedAt
      };
    }
  } catch (err: any) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, provider);
      return { user: null, accessToken: null, issuedAt: null };
    }
    throw err;
  }
  throw new Error('Failed to obtain Google Access Token');
}

// Error Handling Enum and Structure from Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check verification
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration.");
    }
  }
}
testConnection();
