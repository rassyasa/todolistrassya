import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// isi konfigurasi sesuai dengan konfigurasi firebase kalian
const firebaseConfig = {
  apiKey: 'AIzaSyAi_grQs78L2x-lACHlcydLAH-OxjTdX5I',
  authDomain: 'todoliez.firebaseapp.com',
  projectId: 'todoliez',
  storageBucket: 'todoliez.firebasestorage.app',
  messagingSenderId: '1001003533678',
  appId: '1:1001003533678:web:bea6aaf621f6b90861ed7f'
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };