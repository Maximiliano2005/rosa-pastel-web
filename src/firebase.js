import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // 1. Agregamos esta importación

const firebaseConfig = {
  apiKey: "AIzaSyDJym_YwfZYdomKUFrWCWo9xYtvxQFWANA",
  authDomain: "rosa-pastel-app.firebaseapp.com",
  projectId: "rosa-pastel-app",
  storageBucket: "rosa-pastel-app.firebasestorage.app",
  messagingSenderId: "474837912108",
  appId: "1:474837912108:web:a42a0abed6587a5ccd9f89"
};

// 2. Inicializamos la App
const app = initializeApp(firebaseConfig);

// 3. EXPORTAMOS la base de datos para usarla en otros archivos
export const db = getFirestore(app);