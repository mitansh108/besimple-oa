import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDDwanRorspqHuHXz-4dCs6W29kmWJeD2c",
    authDomain: "ai-judge-26062.firebaseapp.com",
    projectId: "ai-judge-26062",
    storageBucket: "ai-judge-26062.firebasestorage.app",
    messagingSenderId: "332848248500",
    appId: "1:332848248500:web:41cb56a138e64a7e2789e1",
    measurementId: "G-2G21CCXDJ2"
  };

// 1. Initialize the App
const app = initializeApp(firebaseConfig);

// 2. Export the Database Service (Firestore)
export const db = getFirestore(app);

// 3. Export Cloud Functions (for your AI runner later)
export const functions = getFunctions(app, "us-central1");

// 4. Export Storage Service (for image uploads)
export const storage = getStorage(app);