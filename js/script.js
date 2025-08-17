// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, increment } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables provided by the Canvas environment (ou valores padrão para desenvolvimento)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Instâncias do Firebase
let app, db, auth;
let userId = null;
let isAuthReady = false;
let authReadyPromiseResolver;
const authReadyPromise = new Promise(resolve => {
    authReadyPromiseResolver = resolve;
});

let currentSelectedLang = config.defaultLang; // Variável para armazenar o idioma selecionado

// --- Funções de UI ---

/**
 * Exibe um modal personalizado com título e mensagem.
 * @param {string} title - O título do modal.
 * @param {string} message - A mensagem a ser exibida.
 */
function showMessage(title, message) {
    const modal = document.getElementById('message-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modal.classList.add('active');
}

/**
 * Atualiza o conteúdo da página com base no idioma selecionado.
 * @param {string} langCode - O código do idioma (ex: 'pt-BR').
 * @param {object} translations - O objeto de traduções.
 */
function updateContent(langCode, translations) {
    const lang = translations[langCode] || translations['pt-BR'];

    const elements = {
        title: document.getElementById('main-title'),
        objective: document.getElementById('game-objective'),
        instructionsTitle: document.getElementById('instructions-title'),
        instructionsList: document.getElementById('instructions-list'),
        newGameTitle: document.getElementById('new-game-title'),
        newGameButton: document.getElementById('new-game-button'),
        joinSessionTitle: document.getElementById('join-session-title'),
        usernameJoin: document.getElementById('username-join'),
        sessionCode: document.getElementById('session-code'),
        joinSessionButton: document.querySelector('#join-session-form button'),
        gameVersionText: document.getElementById('game-version-text')
    };

    document.title = lang.title;

    if (elements.title) elements.title.textContent = lang.title;
    if (elements.objective) elements.objective.textContent = lang.objective;
    if (elements.instructionsTitle) elements.instructionsTitle.textContent = lang.instructionsTitle;

    if (elements.instructionsList) {
        elements.instructionsList.innerHTML = '';
        lang.instructions.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            elements.instructionsList.appendChild(li);
        });
    }

    if (elements.newGameTitle) elements.newGameTitle.textContent = lang.newGameTitle;
    if (elements.newGameButton) elements.newGameButton.textContent = lang.newGameButton;
    if (elements.joinSessionTitle) elements.joinSessionTitle.textContent = lang.joinSessionTitle;
    if (elements.usernameJoin) elements.usernameJoin.placeholder = lang.usernamePlaceholder;
    if (elements.sessionCode) elements.sessionCode.placeholder = lang.sessionCodePlaceholder;
    if (elements.joinSessionButton) elements.joinSessionButton.textContent = lang.joinSessionButton;
    if (elements.gameVersionText) elements.gameVersionText.textContent = lang.versionText;

    document.querySelectorAll('.language-selection button').forEach(button => {
        button.classList.remove('selected');
    });
    const selectedButton = document.querySelector(`button[data-lang="${langCode}"]`);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
    currentSelectedLang = langCode; // Atualiza o idioma selecionado
}

// --- Funções Firebase ---

/**
 * Gera um código de sessão aleatório.
 * @returns {string} - Um código de 6 caracteres alfanuméricos.
 */
function generateSessionCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Cria uma nova sessão de jogo no Firestore.
 */
async function createNewSession() {
    await authReadyPromise; // Garante que a autenticação está pronta

    try {
        const newSessionId = generateSessionCode();
        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', newSessionId);

        // Verifica se a sessão já existe para evitar colisões (muito raro com UUID, mas bom verificar)
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
            showMessage('Erro', 'Ocorreu um problema ao gerar o código da sessão. Por favor, tente novamente.');
            return;
        }

        // Cria o documento da sessão
        await setDoc(sessionRef, {
            createdAt: new Date(),
            hostId: userId,
            currentQuestionIndex: 0,
            activePlayers: 1, // O host já é um jogador ativo
            status: 'waiting' // Status inicial da sessão
        });

        // Adiciona o jogador host à subcoleção 'players'
        const playerName = `Jogador_${userId.substring(0, 4)}`;
        await setDoc(doc(sessionRef, 'players', userId), {
            id: userId,
            name: playerName,
            score: 0
        });

        // Salva o código da sessão e o nome do usuário no sessionStorage
        sessionStorage.setItem('lastSessionCode', newSessionId);
        sessionStorage.setItem('currentUserId', userId);
        sessionStorage.setItem('currentUserName', playerName); // Salva o nome do host

        showMessage('Sessão Criada!', `Nova sessão criada com sucesso! O código da sessão é: ${newSessionId}.`);
        document.getElementById('session-code').value = newSessionId;

        // Redireciona para game.html após um pequeno atraso para o usuário ver a mensagem
        setTimeout(() => {
            window.location.href = `game.html?session=${newSessionId}&user=${userId}&lang=${currentSelectedLang}`;
        }, 1500);

    } catch (error) {
        console.error("Erro ao criar nova sessão:", error);
        showMessage('Erro', `Não foi possível criar a sessão: ${error.message}`);
    }
}

/**
 * Permite que um usuário entre em uma sessão existente.
 * @param {Event} event - O evento de submit do formulário.
 */
async function joinExistingSession(event) {
    event.preventDefault(); // Impede o recarregamento da página

    await authReadyPromise; // Garante que a autenticação está pronta

    const usernameInput = document.getElementById('username-join');
    const sessionCodeInput = document.getElementById('session-code');

    const username = usernameInput.value.trim();
    const sessionCode = sessionCodeInput.value.trim();

    if (!username) {
        showMessage('Erro', 'Por favor, informe seu nome de usuário.');
        return;
    }
    if (!sessionCode) {
        showMessage('Erro', 'Por favor, informe o código da sessão.');
        return;
    }

    try {
        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionCode);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            showMessage('Erro', 'Sessão não encontrada. Verifique o código e tente novamente.');
            return;
        }

        const playersCollectionRef = collection(sessionRef, 'players');
        const playerDocRef = doc(playersCollectionRef, userId);
        const playerSnap = await getDoc(playerDocRef);

        if (playerSnap.exists()) {
            // Se o jogador já está na sessão, apenas atualiza o nome se for diferente e redireciona
            if (playerSnap.data().name !== username) {
                await updateDoc(playerDocRef, { name: username });
                showMessage('Bem-vindo de Volta!', `Você já está nesta sessão e seu nome foi atualizado para ${username}.`);
            } else {
                showMessage('Bem-vindo de Volta!', 'Você já está nesta sessão.');
            }
        } else {
            // Adiciona o novo jogador à subcoleção 'players'
            await setDoc(playerDocRef, {
                id: userId,
                name: username,
                score: 0
            });
            // Incrementa o contador de jogadores ativos na sessão principal
            await updateDoc(sessionRef, { activePlayers: increment(1) });
            showMessage('Sessão Encontrada!', `Você entrou na sessão ${sessionCode} como ${username}.`);
        }

        // Salva o código da sessão e o nome do usuário no sessionStorage
        sessionStorage.setItem('lastSessionCode', sessionCode);
        sessionStorage.setItem('currentUserId', userId);
        sessionStorage.setItem('currentUserName', username);

        // Redireciona para game.html
        setTimeout(() => {
            window.location.href = `game.html?session=${sessionCode}&user=${userId}&lang=${currentSelectedLang}`;
        }, 1500);

    } catch (error) {
        console.error("Erro ao entrar na sessão:", error);
        showMessage('Erro', `Não foi possível entrar na sessão: ${error.message}`);
    }
}

// --- Inicialização da Página ---

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Configura o modal de mensagens
    document.getElementById('modal-close-button').addEventListener('click', () => {
        document.getElementById('message-modal').classList.remove('active');
    });

    // 2. Carrega as traduções
    let translations = {};
    try {
        const response = await fetch('data/translations/index_translations.json');
        if (!response.ok) {
            throw new Error(`Erro ao carregar o arquivo de tradução: ${response.status} ${response.statusText}`);
        }
        translations = await response.json();
    } catch (error) {
        console.error('Falha ao carregar as traduções:', error);
        showMessage('Erro de Carregamento', 'Não foi possível carregar o conteúdo do jogo. Por favor, tente novamente mais tarde.');
        return; // Interrompe se não conseguir carregar as traduções
    }

    // 3. Inicializa Firebase
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
            } else {
                // Se não houver token inicial, faz login anônimo
                try {
                    await signInAnonymously(auth);
                    userId = auth.currentUser.uid;
                } catch (anonError) {
                    console.error("Erro ao fazer login anônimo:", anonError);
                    showMessage('Erro de Autenticação', 'Não foi possível autenticar no jogo.');
                    return;
                }
            }
            isAuthReady = true;
            authReadyPromiseResolver(true); // Resolve a promise para indicar que a autenticação está pronta

            // Após a autenticação, tenta preencher o código da última sessão
            const lastSessionCode = sessionStorage.getItem('lastSessionCode');
            if (lastSessionCode) {
                document.getElementById('session-code').value = lastSessionCode;
            }
            // Exibe o ID do usuário para depuração (opcional, remova em produção)
            console.log("Usuário autenticado:", userId);
        });

        // Se houver um token inicial, tenta fazer login com ele
        if (initialAuthToken) {
            try {
                await signInWithCustomToken(auth, initialAuthToken);
            } catch (tokenError) {
                console.warn("Falha ao autenticar com token personalizado, tentando login anônimo:", tokenError);
                // A autenticação anônima será tratada pelo onAuthStateChanged se o token falhar
            }
        } else {
            // Inicia o fluxo de autenticação anônima se não houver token
            // Isso será capturado pelo onAuthStateChanged
        }

    } catch (firebaseError) {
        console.error("Erro ao inicializar Firebase:", firebaseError);
        showMessage('Erro de Configuração', `Não foi possível iniciar o Firebase: ${firebaseError.message}`);
        return;
    }

    // 4. Cria os botões de idioma e atualiza o conteúdo
    const langContainer = document.getElementById('language-selection');
    config.languages.forEach(lang => {
        const button = document.createElement('button');
        button.textContent = lang.name;
        button.setAttribute('data-lang', lang.code);
        button.onclick = () => updateContent(lang.code, translations);
        langContainer.appendChild(button);
    });

    updateContent(config.defaultLang, translations); // Carrega o idioma padrão

    // 5. Adiciona os event listeners para os botões e formulários
    document.getElementById('new-game-button').addEventListener('click', createNewSession);
    document.getElementById('join-session-form').addEventListener('submit', joinExistingSession);
});
