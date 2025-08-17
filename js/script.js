// js/script.js

// Importa a configuração do arquivo local
import { config } from './config.js';

// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log("Script.js iniciado. Versão do app:", config.appId);

const firebaseConfig = config.firebaseConfig;
const appId = config.appId;

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elementos do DOM
const newGameForm = document.getElementById('new-game-form');
const joinSessionForm = document.getElementById('join-session-form');
const usernameNewInput = document.getElementById('username-new');
const usernameJoinInput = document.getElementById('username-join');
const sessionCodeInput = document.getElementById('session-code');

const messageModal = document.getElementById('message-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseButton = document.getElementById('modal-close-button');

// Adiciona event listener para fechar o modal
modalCloseButton.addEventListener('click', () => {
    messageModal.classList.remove('active');
});

// Funções para manipulação do modal
function showMessage(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    messageModal.classList.add('active');
}

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

// Cria uma nova sessão no Firestore
async function createNewSession(user, playerName) {
    const sessionId = generateRandomId(6);
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId);
    console.log("Tentando criar nova sessão com ID:", sessionId);

    try {
        await setDoc(sessionRef, {
            createdAt: serverTimestamp(),
            hostId: user.uid,
            status: 'waiting',
            language: 'pt-BR' // Usando idioma fixo por enquanto
        });

        console.log("Sessão criada no Firestore. Adicionando jogador...");
        const playerRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId, 'players', user.uid);
        await setDoc(playerRef, {
            name: playerName,
            score: 0
        });

        console.log("Jogador adicionado à sessão. Redirecionando...");
        window.location.href = `game.html?session=${sessionId}&user=${user.uid}&lang=pt-BR`;
    } catch (error) {
        console.error("Erro ao criar sessão:", error);
        showMessage("Erro ao Criar Sessão", "Não foi possível criar a sessão. Por favor, tente novamente.");
    }
}

// Entra em uma sessão existente
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

// Funções utilitárias
function generateRandomId(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Event Listeners dos formulários
newGameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Formulário de novo jogo submetido.");

    const playerName = usernameNewInput.value.trim();
    if (!playerName) {
        showMessage("Campo Vazio", "Por favor, digite seu nome.");
        return;
    }
    
    const user = await signInAnonymouslyUser();
    if (user) {
        await createNewSession(user, playerName);
    }
});

joinSessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Formulário de entrar em sessão submetido.");

    const playerName = usernameJoinInput.value.trim();
    const sessionId = sessionCodeInput.value.trim();

    if (!playerName || !sessionId) {
        showMessage("Campos Vazios", "Por favor, preencha seu nome e o código da sessão.");
        return;
    }
    
    const user = await signInAnonymouslyUser();
    if (user) {
        await joinExistingSession(user, playerName, sessionId);
    }
});
