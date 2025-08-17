// js/index.js

// Importa as funções e instâncias do Firebase de firebaseExports.js
// Isso garante que o Firebase seja inicializado e as instâncias estejam disponíveis.
import { 
    firebaseInitializedPromise, db, auth, APP_ID, currentUserId, serverTimestamp,
    doc, getDoc, setDoc, collection, updateDoc, onSnapshot, query, where, getDocs
} from './firebaseExports.js';

// Idioma padrão lido do arquivo de configuração
let currentLanguage = AppConfig.defaultLanguage;
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

let newGameButton;
let accessGameButton;
let sessionIdInput;
let existingGameUsernameInput;
let messageBox;
let mainContentContainer;
let languageSelectorButtonsContainer;
const loadingOverlay = document.getElementById('loadingOverlay');

// Função para mostrar mensagens na tela
function showMessage(message, type = 'info') {
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`;
        messageBox.classList.remove('hidden');
        setTimeout(() => {
            hideMessage();
        }, 5000);
    } else {
        console.warn('Elemento messageBox não encontrado.');
    }
}

// Função para esconder a caixa de mensagem
function hideMessage() {
    if (messageBox) {
        messageBox.classList.add('hidden');
        messageBox.textContent = '';
    }
}

// Função para esconder o overlay de carregamento
function hideLoadingOverlay() {
    if (loadingOverlay) {
        console.log("hideLoadingOverlay: Escondendo overlay de carregamento. Adicionando classe 'hidden'.");
        loadingOverlay.classList.add('hidden');
    }
}

// Função para gerar um UUID (Universally Unique Identifier) simples
// Esta função é uma alternativa a `crypto.randomUUID()` para maior compatibilidade.
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Carregar traduções (agora carrega index_translations.json)
async function loadTranslations(lang) {
    try {
        const response = await fetch(`data/translations/index_translations.json`); // Caminho corrigido
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        pageTranslations = data[lang];
        if (!pageTranslations) {
            console.warn(`No translations found for language: ${lang} in index_translations.json. Falling back to default.`);
            pageTranslations = data[AppConfig.defaultLanguage];
        }

        console.log(`Traduções para ${lang} carregadas.`, pageTranslations);
        return true;
    } catch (error) {
        console.error("Erro ao carregar traduções (index.js):", error);
        showMessage("Erro ao carregar traduções. A interface pode não exibir texto.", 'error');
        return false;
    }
}

// Atualizar o conteúdo da página com base no idioma atual
function updateContentLanguage() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (pageTranslations[key]) {
            element.textContent = pageTranslations[key];
        } else {
            console.warn(`Chave de tradução "${key}" não encontrada para o idioma "${currentLanguage}".`);
        }
    });
    // Atualizar o placeholder do username e session id
    if (existingGameUsernameInput) {
        existingGameUsernameInput.placeholder = pageTranslations['input_username_placeholder'] || 'Digite seu Nome de Utilizador';
    }
    if (sessionIdInput) {
        sessionIdInput.placeholder = pageTranslations['input_session_placeholder'] || 'Digite o ID da Sessão (Ex: 1234PTBR)';
    }

    // Atualiza o título da página
    const pageTitleElement = document.querySelector('title');
    if (pageTitleElement) {
        pageTitleElement.textContent = pageTranslations['main_page_title'] || 'Jogo de Gerenciamento de Projetos';
    }

    // Atualiza o texto dentro dos botões game-button que não têm data-lang-key em span
    document.querySelectorAll('button.game-button').forEach(button => {
        const span = button.querySelector('span[data-lang-key]');
        if (span) {
            const key = span.getAttribute('data-lang-key');
            if (pageTranslations[key]) {
                span.textContent = pageTranslations[key];
            }
        }
    });
}

// Configurar os botões de seleção de idioma
function setupLanguageSelector() {
    if (!languageSelectorButtonsContainer) {
        console.warn("setupLanguageSelector: Elemento #language-selector-buttons não encontrado.");
        return;
    }
    languageSelectorButtonsContainer.innerHTML = ''; // Limpa botões existentes
    AppConfig.supportedLanguages.forEach(lang => {
        const button = document.createElement('button');
        button.textContent = lang.name;
        button.dataset.langCode = lang.code;
        button.className = `lang-button px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${currentLanguage === lang.code ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
        button.addEventListener('click', async () => {
            currentLanguage = lang.code;
            localStorage.setItem('pm_game_language', currentLanguage); // Salva a preferência
            // Atualiza o estado visual de todos os botões de idioma
            document.querySelectorAll('.lang-button').forEach(btn => {
                if (btn.dataset.langCode === currentLanguage) {
                    btn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
                    btn.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
                } else {
                    btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
                    btn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
                }
            });
            await loadTranslations(currentLanguage);
            updateContentLanguage();
        });
        languageSelectorButtonsContainer.appendChild(button);
    });
}


// Redireciona para a página do jogo com o ID da sessão e idioma
function redirectToGame(sessionId, lang) {
    if (sessionId && lang) {
        window.location.href = `game.html?session=${sessionId}&lang=${lang}`;
    } else {
        showMessage(pageTranslations['error_no_session_id'] || "Erro: ID da sessão ou idioma inválidos para redirecionamento.", 'error');
    }
}

// Função para verificar se a sessão existe
async function checkSessionExists(sessionId) {
    try {
        if (!db) { // Usa a instância 'db' importada
            console.error("Firestore não está inicializado (checkSessionExists).");
            showMessage(pageTranslations['error_firebase_init'] || "Erro: Firebase não inicializado.", 'error');
            return false;
        }
        const sessionRef = doc(db, `artifacts/${APP_ID}/public/data/sessions`, sessionId); // Usa doc e APP_ID importados
        const sessionSnap = await getDoc(sessionRef); // Usa getDoc importado
        return sessionSnap.exists();
    } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        showMessage(pageTranslations['error_checking_session'] + error.message, 'error');
        return false;
    }
}

// Função para criar uma nova sessão
async function createNewSession(username) {
    if (!username) {
        showMessage(pageTranslations['error_empty_username'] || "Por favor, digite o seu nome de utilizador.", 'warning');
        return;
    }

    if (!db || !currentUserId || !APP_ID) { // Usa db, currentUserId, APP_ID importados
        console.error("Firebase Firestore, ID do utilizador ou ID da aplicação não estão inicializados. Impossível criar sessão.");
        showMessage(pageTranslations['error_firebase_init'] || "Erro: Firebase não inicializado ou utilizador não autenticado.", 'error');
        return;
    }

    showMessage(pageTranslations['creating_session_message'] || "Criando nova sessão...", 'info');

    const newSessionId = Math.floor(1000 + Math.random() * 9000).toString() + currentLanguage.replace('-', '').toUpperCase();
    const sessionRef = doc(db, `artifacts/${APP_ID}/public/data/sessions`, newSessionId); // Usa doc e APP_ID importados

    try {
        const docSnap = await getDoc(sessionRef); // Usa getDoc importado
        if (docSnap.exists()) {
            console.warn(`Sessão ID ${newSessionId} já existe. Tentando novamente.`);
            return createNewSession(username);
        }

        await setDoc(sessionRef, { // Usa setDoc importado
            createdAt: serverTimestamp(), // Usa serverTimestamp importado
            hostId: currentUserId,
            hostName: username,
            language: currentLanguage,
            status: 'waiting',
            players: {
                [currentUserId]: username
            }
        });
        showMessage(pageTranslations['session_created_message'] + newSessionId, 'success');

        if (document.getElementById('displaySessionId')) {
            document.getElementById('displaySessionId').textContent = newSessionId;
        }
        if (document.getElementById('go-to-game-container')) {
            document.getElementById('go-to-game-container').classList.remove('hidden');
        }

        localStorage.setItem('pm_game_session_id', newSessionId);
        localStorage.setItem('pm_game_username', username);

    } catch (error) {
        console.error("Erro ao criar sessão:", error);
        showMessage(pageTranslations['error_creating_session'] + error.message, 'error');
    }
}


// Função para aceder a uma sessão existente
async function accessExistingSession(sessionId, username) {
    if (!sessionId || !username) {
        showMessage(pageTranslations['error_invalid_session_id'] || "Por favor, digite o ID da sessão e o seu nome de utilizador.", 'warning');
        return;
    }

    if (!db || !currentUserId || !APP_ID) { // Usa db, currentUserId, APP_ID importados
        console.error("Firebase Firestore, ID do utilizador ou ID da aplicação não estão inicializados. Impossível aceder à sessão.");
        showMessage(pageTranslations['error_firebase_init'] || "Erro: Firebase não inicializado ou utilizador não autenticado.", 'error');
        return;
    }

    showMessage(pageTranslations['joining_session_message'] + sessionId + "...", 'info');
    const sessionRef = doc(db, `artifacts/${APP_ID}/public/data/sessions`, sessionId); // Usa doc e APP_ID importados

    try {
        const sessionSnap = await getDoc(sessionRef); // Usa getDoc importado

        if (sessionSnap.exists()) {
            const sessionData = sessionSnap.data();
            const players = sessionData.players || {};
            if (!players[currentUserId]) {
                players[currentUserId] = username;
                await updateDoc(sessionRef, { // Usa updateDoc importado
                    players: players
                });
            }
            localStorage.setItem('pm_game_session_id', sessionId);
            localStorage.setItem('pm_game_username', username);
            redirectToGame(sessionId, sessionData.language || currentLanguage);
        } else {
            showMessage(pageTranslations['session_not_found_error'] + sessionId, 'error');
        }
    } catch (error) {
        console.error("Erro ao aceder à sessão:", error);
        showMessage(pageTranslations['error_accessing_session'] + error.message, 'error');
    }
}


// Adicionar event listeners aos botões
function addEventListeners() {
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    existingGameUsernameInput = document.getElementById('existingGameUsernameInput');
    messageBox = document.getElementById('messageBox');
    const goToGameButton = document.getElementById('goToGameButton'); // Apenas para este escopo
    mainContentContainer = document.getElementById('main-content-container');
    languageSelectorButtonsContainer = document.getElementById('language-selector-buttons');


    if (newGameButton) {
        newGameButton.addEventListener('click', () => {
            const autoUsername = `Jogador${Math.floor(Math.random() * 10000)}`;
            createNewSession(autoUsername);
        });
    } else {
        console.warn("Elemento #newGameButton não encontrado.");
    }

    if (accessGameButton) {
        accessGameButton.addEventListener('click', () => {
            const sessionId = sessionIdInput.value.trim();
            const username = existingGameUsernameInput.value.trim();
            if (sessionId && username) {
                accessExistingSession(sessionId, username);
            } else {
                showMessage(pageTranslations['error_invalid_session_id'] || "Por favor, digite o ID da sessão e o seu nome de utilizador.", 'warning');
            }
        });
    } else {
        console.warn("Elemento #accessGameButton não encontrado.");
    }

    if (goToGameButton) {
        goToGameButton.addEventListener('click', () => {
            const sessionId = localStorage.getItem('pm_game_session_id');
            if (sessionId) {
                redirectToGame(sessionId, currentLanguage);
            } else {
                showMessage(pageTranslations['error_no_session_id'] || "Nenhum ID de sessão encontrado para entrar no jogo.", 'error');
            }
        });
    } else {
        console.warn("Elemento #goToGameButton não encontrado no DOM. O botão 'Entrar no Jogo' não funcionará.");
    }
}

// Função principal de inicialização da lógica da página
async function initPageLogic() {
    console.log("initPageLogic: Iniciando...");

    // Obter referências DOM
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    existingGameUsernameInput = document.getElementById('existingGameUsernameInput');
    messageBox = document.getElementById('messageBox');
    mainContentContainer = document.getElementById('main-content-container');
    languageSelectorButtonsContainer = document.getElementById('language-selector-buttons');


    // Validação de elementos DOM para depuração
    if (!messageBox) {
        console.error("initPageLogic: Elemento #messageBox não encontrado no DOM! Mensagens ao utilizador não serão exibidas.");
    }
    if (!document.getElementById('go-to-game-container')) {
        console.warn("initPageLogic: Elemento #go-to-game-container não encontrado no DOM. O contentor do botão 'Entrar no Jogo' não será gerido.");
    }
    if (!mainContentContainer) {
        console.warn("initPageLogic: Elemento #main-content-container não encontrado no DOM. O conteúdo principal pode ter FOUC.");
    }
    if (!languageSelectorButtonsContainer) {
        console.warn("initPageLogic: O elemento 'language-selector-buttons' não foi encontrado no DOM. O seletor de idioma não funcionará.");
    }
    if (!existingGameUsernameInput) {
        console.error("initPageLogic: O elemento de input 'existingGameUsernameInput' não foi encontrado no DOM! A entrada de nome de utilizador para jogos existentes pode não funcionar.");
    }


    // Tenta carregar o idioma salvo no localStorage, caso contrário, usa o padrão
    const savedLanguage = localStorage.getItem('pm_game_language');
    if (savedLanguage && AppConfig.supportedLanguages.some(lang => lang.code === savedLanguage)) {
        currentLanguage = savedLanguage;
    } else {
        currentLanguage = AppConfig.defaultLanguage;
        localStorage.setItem('pm_game_language', currentLanguage);
    }

    // Carregar traduções e configurar seletor de idioma
    const translationsLoaded = await loadTranslations(currentLanguage);
    if (translationsLoaded) {
        setupLanguageSelector();
        updateContentLanguage();
    } else {
        console.error("initPageLogic: Falha ao carregar traduções. A interface pode não exibir texto.");
    }

    addEventListeners(); // Adiciona os listeners para os botões e inputs

    // Esconde o overlay de carregamento APÓS tudo estar pronto
    console.log("initPageLogic: Chamando hideLoadingOverlay()...");
    hideLoadingOverlay();

    // Torna o conteúdo principal visível
    if (mainContentContainer) {
        console.log("initPageLogic: Definindo mainContentContainer para opacidade 1 e visível.");
        mainContentContainer.style.opacity = '1';
        mainContentContainer.style.visibility = 'visible';
    }

    console.log("initPageLogic: Finalizado. Conteúdo principal visível (se mainContentContainer existir).");
}

// Listener principal para iniciar a lógica da página APÓS o DOM e o Firebase estarem prontos.
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded disparado em index.js.");
    try {
        // Aguarda a promessa global de inicialização do Firebase definida em firebaseExports.js
        await firebaseInitializedPromise;
        console.log("Firebase inicializado e autenticado. Iniciando a lógica da página...");
        await initPageLogic();
    } catch (error) {
        console.error("Erro na inicialização do Firebase, pulando a lógica da página:", error);
        // Exibe uma mensagem de erro na UI
        showMessage("Erro ao iniciar a aplicação. Por favor, tente novamente. " + error.message, 'error');
        hideLoadingOverlay(); // Garante que o overlay seja escondido
        // Pode-se exibir uma tela de erro mais amigável aqui
        if (document.getElementById('main-content-container')) {
            document.getElementById('main-content-container').innerHTML = `<div class="text-red-500 text-center text-lg p-4">Ocorreu um erro crítico ao carregar a aplicação. Por favor, recarregue a página.</div>`;
            document.getElementById('main-content-container').style.opacity = '1';
            document.getElementById('main-content-container').style.visibility = 'visible';
        }
    }
});
