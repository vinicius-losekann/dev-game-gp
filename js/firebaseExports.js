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
        let canvasGlobalsFound = false;

        // Função para tentar obter as variáveis globais do ambiente Canvas usando polling.
        const pollForCanvasGlobals = () => new Promise((resolvePoll) => {
            const pollingStartTime = Date.now();
            const pollingTimeoutMs = 5000; // 5 segundos de timeout para o polling

            const interval = setInterval(() => {
                const elapsedTime = Date.now() - pollingStartTime;

                // Verifica se TODAS as variáveis esperadas estão definidas
                if (typeof __app_id !== 'undefined' && typeof __firebase_config !== 'undefined' && typeof __initial_auth_token !== 'undefined') {
                    clearInterval(interval); // Para o polling
                    canvasGlobalsFound = true;
                    try {
                        finalFirebaseConfig = JSON.parse(__firebase_config);
                    } catch (e) {
                        console.error("firebaseExports (polling): Erro ao analisar __firebase_config:", e);
                        finalFirebaseConfig = {};
                    }
                    initialAuthToken = __initial_auth_token;
                    console.log("firebaseExports (polling): Variáveis do Canvas obtidas via polling. Finalizando polling.");
                    resolvePoll();
                } else if (elapsedTime > pollingTimeoutMs) {
                    clearInterval(interval); // Para o polling se o timeout for atingido
                    console.warn("firebaseExports (polling): Timeout de polling atingido. Variáveis do Canvas não encontradas ou não injetadas a tempo.");
                    console.log("firebaseExports (polling debug): __app_id:", typeof __app_id !== 'undefined');
                    console.log("firebaseExports (polling debug): __firebase_config:", typeof __firebase_config !== 'undefined');
                    console.log("firebaseExports (polling debug): __initial_auth_token:", typeof __initial_auth_token !== 'undefined');
                    resolvePoll(); // Resolve o polling para que o código possa tentar a config manual
                } else {
                    // console.log("firebaseExports (polling): Aguardando variáveis do Canvas...");
                    // Comentado para evitar poluir o console, descomente se precisar de logs muito detalhados.
                }
            }, 50); // Tenta a cada 50ms
        });

        console.log("firebaseExports: Iniciando polling para variáveis do Canvas...");
        await pollForCanvasGlobals(); // Espera até que as variáveis do Canvas estejam disponíveis ou o timeout seja atingido

        // Se, mesmo após o polling, as variáveis do Canvas não estiverem disponíveis, usa a config manual.
        if (!canvasGlobalsFound || Object.keys(finalFirebaseConfig).length === 0 || !finalFirebaseConfig.projectId) {
            console.warn("firebaseExports: Variáveis do Canvas não disponíveis ou inválidas. Usando configuração manual para testes locais ou fallback.");
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
            reject(error); // Rejeita a promessa em caso de erro
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
