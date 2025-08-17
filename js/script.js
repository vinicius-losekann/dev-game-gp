// js/script.js

// Importa a configuração do arquivo local
import { config } from './config.js';

// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log("Script.js iniciado. Versão do app:", config.appId);

const firebaseConfig = config.firebaseConfig;
const appId = config.appId;

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elementos do DOM
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const languageSelect = document.getElementById('language');
const sessionCodeInput = document.getElementById('session-code');
const createSessionButton = document.getElementById('create-session-btn');
const joinSessionButton = document.getElementById('join-session-btn');
const errorMessage = document.getElementById('error-message');

// Carregar idiomas do arquivo de configuração
config.languages.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.name;
    if (lang.code === config.defaultLang) {
        option.selected = true;
    }
    languageSelect.appendChild(option);
});

// Autenticação anônima para obter um ID de usuário
async function signInAnonymouslyUser() {
    try {
        console.log("Tentando autenticar anonimamente...");
        const userCredential = await signInAnonymously(auth);
        console.log("Autenticação bem-sucedida. UID:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("Erro na autenticação anônima:", error);
        showMessage("Erro de Autenticação", "Não foi possível conectar ao servidor. Tente novamente mais tarde.");
        return null;
    }
}

// Criar uma nova sessão no Firestore
async function createNewSession(user, playerName) {
    const sessionId = generateRandomId(6);
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId);
    console.log("Tentando criar nova sessão com ID:", sessionId);

    try {
        await setDoc(sessionRef, {
            createdAt: serverTimestamp(),
            hostId: user.uid,
            status: 'waiting',
            language: languageSelect.value
        });

        console.log("Sessão criada no Firestore. Adicionando jogador...");
        const playerRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId, 'players', user.uid);
        await setDoc(playerRef, {
            name: playerName,
            score: 0
        });

        console.log("Jogador adicionado à sessão. Redirecionando...");
        window.location.href = `game.html?session=${sessionId}&user=${user.uid}&lang=${languageSelect.value}`;
    } catch (error) {
        console.error("Erro ao criar sessão:", error);
        showMessage("Erro ao Criar Sessão", "Não foi possível criar a sessão. Por favor, tente novamente.");
    }
}

// Entrar em uma sessão existente
async function joinExistingSession(user, playerName, sessionId) {
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId);
    console.log("Tentando entrar na sessão:", sessionId);

    try {
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            console.warn("Sessão não encontrada:", sessionId);
            showMessage("Sessão Inválida", "O código da sessão não existe. Verifique e tente novamente.");
            return;
        }

        const sessionData = sessionSnap.data();
        if (sessionData.status !== 'waiting') {
            console.warn("Sessão não está mais aberta:", sessionId);
            showMessage("Sessão Fechada", "Esta sessão já está em andamento ou foi encerrada.");
            return;
        }
        
        console.log("Sessão encontrada. Adicionando jogador...");
        const playerRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId, 'players', user.uid);
        await setDoc(playerRef, {
            name: playerName,
            score: 0
        });

        console.log("Jogador adicionado à sessão. Redirecionando...");
        window.location.href = `game.html?session=${sessionId}&user=${user.uid}&lang=${sessionData.language}`;
    } catch (error) {
        console.error("Erro ao entrar na sessão:", error);
        showMessage("Erro ao Entrar na Sessão", "Não foi possível entrar na sessão. Por favor, tente novamente.");
    }
}

// Manipulador do formulário
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Formulário submetido.");

    const playerName = usernameInput.value.trim();
    if (!playerName) {
        showMessage("Campo Vazio", "Por favor, digite seu nome.");
        return;
    }
    
    // Autentica o usuário anonimamente e processa a requisição
    const user = await signInAnonymouslyUser();
    if (!user) {
        return; // Sai da função se a autenticação falhar
    }

    const sessionId = sessionCodeInput.value.trim();

    if (e.submitter.id === 'create-session-btn') {
        await createNewSession(user, playerName);
    } else if (e.submitter.id === 'join-session-btn') {
        if (!sessionId) {
            showMessage("Campo Vazio", "Por favor, digite o código da sessão.");
            return;
        }
        await joinExistingSession(user, playerName, sessionId);
    }
});

function showMessage(title, message) {
    console.warn("Exibindo mensagem de erro:", title, message);
    errorMessage.textContent = `${title}: ${message}`;
}

function generateRandomId(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
