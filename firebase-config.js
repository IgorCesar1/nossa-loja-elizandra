import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// TODO: O usuário deve substituir este objeto pelas chaves do seu projeto Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyBeuHGtU3UwNrsBQnL4GYfJxL-XZ-L3nww",
  authDomain: "vendas-online-5963d.firebaseapp.com",
  projectId: "vendas-online-5963d",
  storageBucket: "vendas-online-5963d.firebasestorage.app",
  messagingSenderId: "4397956836",
  appId: "1:4397956836:web:41e694a88cea32621876f1",
  measurementId: "G-7R5ZK9DCNG"
};

// Configuração opcional para não quebrar a aplicação caso o usuário ainda não tenha configurado
let app, db, auth;

try {
    if (firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI") {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
    } else {
        console.warn("Atenção: Firebase não configurado. Por favor, insira suas credenciais no firebase-config.js");
    }
} catch (error) {
    console.error("Erro ao inicializar Firebase", error);
}

export { app, db, auth };
