"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getMessaging, type Messaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let messaging: Messaging | null = null;

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;

  if (!isFirebaseClientConfigured()) {
    return null;
  }

  if (!app) {
    const existing = getApps();
    app = existing.length > 0 ? existing[0]! : initializeApp(firebaseConfig);
  }

  return app;
}

export function getFirestoreInstance(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!firestore) {
    firestore = getFirestore(firebaseApp);
  }
  return firestore;
}

export function getStorageInstance(): FirebaseStorage | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!storage) {
    storage = getStorage(firebaseApp);
  }
  return storage;
}

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  if (!messaging) {
    messaging = getMessaging(firebaseApp);
  }
  return messaging;
}
