// js/firebaseExports.js

// Importa as funções necessárias do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore, doc, setDoc, getDoc, collection, updateDoc,
    arrayUnion, arrayRemove, serverTimestamp, onSnapshot, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
    apiKey: "AIzaSyDdiedj1Smjzn9CDqShdhG5Y0_Sa18xyWI", // SUA CHAVE ATUALIZADA
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

        let finalFirebaseConfig = {};
        let initialAuthToken = null;

        // Função para tentar obter as variáveis globais do ambiente Canvas usando polling.
        // Este método é crucial porque as variáveis __app_id, __firebase_config e __initial_auth_token
        // podem não estar disponíveis imediatamente no carregamento inicial do script,
        // especialmente em ambientes como o Canvas que injetam variáveis de forma assíncrona.
        const pollForCanvasGlobals = () => new Promise(resolvePoll => {
            const interval = setInterval(() => {
                // Verifica se TODAS as variáveis esperadas estão definidas
                if (typeof __app_id !== 'undefined' && typeof __firebase_config !== 'undefined' && typeof __initial_auth_token !== 'undefined') {
                    clearInterval(interval); // Para o polling
                    try {
                        finalFirebaseConfig = JSON.parse(__firebase_config);
                    } catch (e) {
                        console.error("firebaseExports (polling): Erro ao analisar __firebase_config:", e);
                        finalFirebaseConfig = {}; // Garante que a configuração seja um objeto vazio em caso de erro
                    }
                    initialAuthToken = __initial_auth_token;
                    console.log("firebaseExports (polling): Variáveis do Canvas obtidas via polling.");
                    resolvePoll(); // Resolve a promessa interna de polling
                } else {
                    // console.log("firebaseExports (polling): Aguardando variáveis do Canvas...");
                }
            }, 50); // Tenta a cada 50ms (ajustado para ser mais rápido)
        });

        console.log("firebaseExports: Iniciando polling para variáveis do Canvas...");
        await pollForCanvasGlobals(); // Espera até que as variáveis do Canvas estejam disponíveis

        // Se, mesmo após o polling, as variáveis do Canvas não estiverem disponíveis, usa a config manual.
        // Isso é principalmente para desenvolvimento local. No Canvas, devem estar disponíveis.
        if (Object.keys(finalFirebaseConfig).length === 0 || !finalFirebaseConfig.projectId) {
            console.warn("firebaseExports: Variáveis do Canvas não disponíveis ou inválidas. Usando configuração manual para testes locais.");
            finalFirebaseConfig = manualFirebaseConfig;
        }

        if (!finalFirebaseConfig || Object.keys(finalFirebaseConfig).length === 0 || !finalFirebaseConfig.projectId) {
            const errorMessage = "firebaseExports: Configuração do Firebase ausente ou inválida. Não foi possível inicializar.";
            console.error(errorMessage);
            reject(new Error(errorMessage));
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
