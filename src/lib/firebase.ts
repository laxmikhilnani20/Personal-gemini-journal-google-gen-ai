import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  setDoc as rawSetDoc,
  addDoc as rawAddDoc,
  getDoc,
  getDocs,
  updateDoc as rawUpdateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocFromServer,
  Firestore,
  SetOptions,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initialize Cloud Firestore with strict ignoreUndefinedProperties: true
export const db: Firestore = (() => {
  try {
    return firebaseConfig.firestoreDatabaseId
      ? initializeFirestore(app, { ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId)
      : initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
})();

/**
 * Strict Undefined-Stripping Rule:
 * Recursively strips all keys with undefined values from objects and nested arrays.
 * Guarantees no payload containing undefined can ever be sent to Cloud Firestore.
 */
export function stripUndefined<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        result[key] = stripUndefined(value);
      }
    }
    return result as T;
  }
  return data;
}

/**
 * Wrapped setDoc enforcing the Strict Undefined-Stripping rule.
 */
export async function setDoc<T extends Record<string, any>>(
  reference: any,
  data: T,
  options?: SetOptions
) {
  const sanitized = stripUndefined(data);
  return options !== undefined
    ? rawSetDoc(reference, sanitized, options)
    : rawSetDoc(reference, sanitized);
}

/**
 * Wrapped addDoc enforcing the Strict Undefined-Stripping rule.
 */
export async function addDoc<T extends Record<string, any>>(
  reference: any,
  data: T
) {
  const sanitized = stripUndefined(data);
  return rawAddDoc(reference, sanitized);
}

/**
 * Wrapped updateDoc enforcing the Strict Undefined-Stripping rule.
 */
export async function updateDoc<T extends Record<string, any>>(
  reference: any,
  data: T
) {
  const sanitized = stripUndefined(data);
  return rawUpdateDoc(reference, sanitized as any);
}

// Connection test per Firebase skill guideline
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Standardized Firestore Error Reporting (mandatory in Firebase Skill)
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Firebase Google Sign-In error:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Firebase Sign-Out error:', error);
    throw error;
  }
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Authorization Token & Headers Provider for Protected Backend API Endpoints
export async function getAuthToken(): Promise<string> {
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        return token;
      }
    }
  } catch (err) {
    console.warn('[Auth] Failed to retrieve Firebase ID token:', err);
  }
  // Return demo token for preview/demo mode fallback
  return 'demo-user-token';
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
};
