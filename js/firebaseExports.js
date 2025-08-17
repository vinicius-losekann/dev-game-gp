// js/firebaseExports.js

// Importa as funções necessárias do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, updateDoc, 
    arrayUnion, arrayRemove, serverTimestamp, onSnapshot, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Variáveis globais (exportadas) para as instâncias do Firebase
let app;
let db;
let auth;
let currentUserId; // O ID do usuário autenticado (UID)
let firebaseInitializedPromise; // Promessa que resolve quando o Firebase está pronto

// Define as configurações do Firebase.
// No ambiente Canvas, __firebase_config e __app_id são fornecidos.
// Para testes locais, você DEVE preencher manualFirebaseConfig com os seus dados do Firebase.
const manualFirebaseConfig = { 
    apiKey: "AIzaSyDdiedj1Smjzn9CDqShdhG5Y0_Sa18xyWI",
    authDomain: "jogo-gerencia-de-projetos.firebaseapp.com",
    projectId: "jogo-gerencia-de-projetos",
    storageBucket: "jogo-gerencia-de-projetos.firebasestorage.app",
    messagingSenderId: "356867532123",
    appId: "1:356867532123:web:0657d84635a5849df2667e",
    measurementId: "G-M5QYQ36Q9P"
};

// Define o ID do aplicativo. No Canvas, será __app_id. Localmente, use 'gameGP'.
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'gameGP'; // Seu appId para coleções Firestore

// Função para inicializar o Firebase. Será chamada apenas uma vez.
async function initializeFirebase() {
    if (firebaseInitializedPromise) {
        return firebaseInitializedPromise; // Já está inicializando ou já inicializou
    }

    firebaseInitializedPromise = new Promise(async (resolve, reject) => {
        console.log("firebaseExports: Iniciando inicialização do Firebase...");

        const finalFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : manualFirebaseConfig;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (!finalFirebaseConfig || Object.keys(finalFirebaseConfig).length === 0 || !finalFirebaseConfig.projectId) {
            console.error("firebaseExports: Configuração do Firebase ausente ou inválida. Não foi possível inicializar.");
            reject(new Error("Firebase configuration missing or invalid."));
            return;
        }

        try {
            app = initializeApp(finalFirebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);

            // Autenticação: tenta com token customizado (Canvas), senão anonimamente
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
                console.log("firebaseExports: Autenticado com token personalizado.");
            } else {
                await signInAnonymously(auth);
                console.log("firebaseExports: Autenticado anonimamente.");
            }
            
            // Define o UID do usuário autenticado para uso em toda a aplicação
            currentUserId = auth.currentUser?.uid || `anon-${crypto.randomUUID()}`;
            console.log("firebaseExports: Firebase inicializado e autenticado. UserID:", currentUserId);
            resolve(); // Resolve a promessa.

        } catch (error) {
            console.error("firebaseExports: Erro na inicialização ou autenticação do Firebase:", error);
            // Se houver um erro grave, reject a promessa.
            reject(error);
        }
    });
    return firebaseInitializedPromise;
}

// Chama a função de inicialização uma vez ao carregar o módulo
initializeFirebase();

// Exporta as instâncias e funções para serem usadas por outros módulos
export { 
    app, 
    db, 
    auth, 
    APP_ID, // O ID do aplicativo para caminhos do Firestore
    currentUserId, 
    serverTimestamp, // Função do Firestore para timestamps do servidor

    // Funções do Firestore que serão usadas
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    onSnapshot, 
    query, 
    where, 
    getDocs,

    firebaseInitializedPromise // Promessa para garantir que o Firebase está pronto
};
