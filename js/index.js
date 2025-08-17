// js/index.js

// Importa as funções necessárias do Firebase Firestore
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Idioma padrão lido do arquivo de configuração
let currentLanguage = AppConfig.defaultLanguage;
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

// Referências a elementos DOM
let newGameButton;
let accessGameButton;
let newGameCard; // Referência ao card "Iniciar Novo Jogo"
let accessGameCard; // Referência ao card "Acessar Jogo Existente"
let sessionIdInput;
let existingGameUsernameInput; // Input para nome de usuário em jogo existente
let messageBox; // Referência à caixa de mensagem
let goToGameButton; // Botão para ir para o jogo
let goBackToHomeButtonContainer; // Container do botão "Entrar no Jogo"
let mainContentContainer; // Referência ao contêiner principal
let languageSelectorButtonsContainer; // Referência ao contêiner dos botões de idioma
const loadingOverlay = document.getElementById('loadingOverlay'); // Referência ao overlay de carregamento

// Funções utilitárias

/**
 * Exibe uma mensagem temporária em uma caixa de mensagens pré-definida no HTML.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo da mensagem ('info', 'success', 'error', 'warning').
 */
function showMessage(message, type = 'info') {
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`; // Resetar classes e adicionar a nova
        messageBox.classList.remove('hidden');
    } else {
        console.warn('Elemento messageBox não encontrado.');
    }
}

/**
 * Esconde a caixa de mensagem.
 */
function hideMessage() {
    if (messageBox) {
        messageBox.classList.add('hidden');
    }
}

/**
 * Esconde o overlay de carregamento.
 */
function hideLoadingOverlay() {
    if (loadingOverlay) {
        console.log("hideLoadingOverlay: Escondendo overlay de carregamento. Adicionando classe 'hidden'.");
        loadingOverlay.classList.add('hidden');
    }
}

/**
 * Gera um ID de sessão aleatório com sufixo de idioma.
 * @returns {string} O ID de sessão gerado.
 */
function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Adiciona o sufixo do idioma atual (ex: PTBR, ENUS)
    return result + currentLanguage.toUpperCase().replace('-', '');
}

/**
 * Carrega as traduções do arquivo JSON.
 * @param {string} lang - O código do idioma a ser carregado.
 * @returns {boolean} Verdadeiro se as traduções forem carregadas com sucesso, falso caso contrário.
 */
async function loadTranslations(lang) {
    try {
        const response = await fetch(`data/translations/index_translations.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        pageTranslations = data; // Armazena todas as traduções
        console.log(`Traduções para ${lang} carregadas.`, pageTranslations[lang]);
        return true;
    } catch (error) {
        console.error("Erro ao carregar o arquivo de traduções:", error);
        return false;
    }
}

/**
 * Atualiza o conteúdo da página com base no idioma selecionado.
 */
function updateContentLanguage() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (pageTranslations[currentLanguage] && pageTranslations[currentLanguage][key]) {
            element.textContent = pageTranslations[currentLanguage][key];
        }
    });

    // Atualiza placeholders manualmente, pois textContent não funciona para eles
    const usernameInputPlaceholder = pageTranslations[currentLanguage]?.input_username_placeholder || 'Digite seu Nome de Usuário';
    if (existingGameUsernameInput) {
        existingGameUsernameInput.placeholder = usernameInputPlaceholder;
    }

    const sessionIdPlaceholder = pageTranslations[currentLanguage]?.input_session_placeholder || 'Digite o ID da Sessão (Ex: 1234PTBR)';
    if (sessionIdInput) {
        sessionIdInput.placeholder = sessionIdPlaceholder;
    }
}

/**
 * Configura os botões de seleção de idioma.
 */
function setupLanguageSelector() {
    if (!languageSelectorButtonsContainer) {
        console.warn("Elemento #language-selector-buttons não encontrado. Seletor de idioma não será configurado.");
        return;
    }
    languageSelectorButtonsContainer.innerHTML = ''; // Limpa botões existentes

    AppConfig.supportedLanguages.forEach(lang => {
        const button = document.createElement('button');
        button.textContent = pageTranslations[lang.code]?.['lang_' + lang.code.replace('-', '_').toLowerCase()] || lang.name;
        button.className = `lang-button px-4 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 ${currentLanguage === lang.code ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`;
        button.setAttribute('data-lang', lang.code);
        button.addEventListener('click', () => {
            currentLanguage = lang.code;
            localStorage.setItem('pm_game_language', currentLanguage); // Salva o idioma selecionado
            updateContentLanguage();
            setupLanguageSelector(); // Recria os botões para atualizar o estilo do ativo
        });
        languageSelectorButtonsContainer.appendChild(button);
    });
}

/**
 * Manipula a criação de uma nova sessão de jogo.
 */
async function createNewSession() {
    hideMessage(); // Esconde qualquer mensagem anterior

    // Adiciona uma asserção para garantir que window.db e window.auth existam
    console.assert(window.db, "Erro de Asserção: window.db não está definido em createNewSession!");
    console.assert(window.auth, "Erro de Asserção: window.auth não está definido em createNewSession!");

    showMessage(pageTranslations[currentLanguage].creating_session_message, 'info');

    // Acessa diretamente window.db e window.auth
    if (!window.db || !window.auth) {
        showMessage(pageTranslations[currentLanguage].error_firebase_init, 'error');
        console.error("Firebase Firestore ou Auth NÃO ESTÃO INICIALIZADOS no createNewSession. Isso é inesperado!");
        return;
    }

    try {
        const userId = window.auth.currentUser?.uid || crypto.randomUUID();
        const defaultUsername = `Usuário-${userId.substring(0, 5)}`;

        const sessionId = generateSessionId(); // Gera um ID de sessão
        const sessionDocRef = doc(window.db, "artifacts", window.appId, "public", "data", "sessions", sessionId);
        const playerDocRef = doc(sessionDocRef, "players", userId);

        await setDoc(sessionDocRef, {
            createdAt: serverTimestamp(),
            hostId: userId,
            currentQuestionIndex: 0,
            questionArea: null,
            language: currentLanguage
        });

        await setDoc(playerDocRef, {
            username: defaultUsername,
            score: 0,
            lastActivity: serverTimestamp()
        });

        localStorage.setItem('pm_game_session_id', sessionId);
        localStorage.setItem('pm_game_username', defaultUsername);

        if (sessionIdInput) {
            sessionIdInput.value = sessionId;
        }
        if (existingGameUsernameInput) {
            existingGameUsernameInput.value = '';
            existingGameUsernameInput.focus();
        }

        if (newGameCard) {
            newGameCard.classList.add('hidden');
        }
        if (accessGameCard) {
             accessGameCard.classList.remove('hidden');
        }
        if (goBackToHomeButtonContainer) {
            goBackToHomeButtonContainer.classList.remove('hidden');
            goBackToHomeButtonContainer.querySelector('p').textContent = pageTranslations[currentLanguage].session_id_prompt;
        }

        showMessage(`${pageTranslations[currentLanguage].session_created_message}${sessionId}`, 'success');

    } catch (e) {
        console.error("Erro ao criar documento:", e);
        showMessage(`${pageTranslations[currentLanguage].error_creating_session} ${e.message}`, 'error');
    }
}

/**
 * Manipula o acesso a uma sessão de jogo existente.
 */
async function accessExistingSession() {
    hideMessage(); // Esconde qualquer mensagem anterior
    const sessionId = sessionIdInput.value.trim();
    const username = existingGameUsernameInput.value.trim();

    // Adiciona uma asserção para garantir que window.db e window.auth existam
    console.assert(window.db, "Erro de Asserção: window.db não está definido em accessExistingSession!");
    console.assert(window.auth, "Erro de Asserção: window.auth não está definido em accessExistingSession!");

    if (!sessionId) {
        showMessage(pageTranslations[currentLanguage].error_invalid_session_id, 'error');
        return;
    }
    if (!username) {
        showMessage(pageTranslations[currentLanguage].error_empty_username, 'error');
        return;
    }

    showMessage(`${pageTranslations[currentLanguage].joining_session_message} ${sessionId}...`, 'info');

    // Acessa diretamente window.db e window.auth
    if (!window.db || !window.auth) {
        showMessage(pageTranslations[currentLanguage].error_firebase_init, 'error');
        console.error("Firebase Firestore ou Auth NÃO ESTÃO INICIALIZADOS no accessExistingSession. Isso é inesperado!");
        return;
    }

    try {
        const userId = window.auth.currentUser?.uid || crypto.randomUUID();
        const sessionDocRef = doc(window.db, "artifacts", window.appId, "public", "data", "sessions", sessionId);
        const sessionDoc = await getDoc(sessionDocRef);

        if (!sessionDoc.exists()) {
            showMessage(pageTranslations[currentLanguage].session_not_found_error, 'error');
            return;
        }

        const playerDocRef = doc(sessionDocRef, "players", userId);
        await setDoc(playerDocRef, {
            username: username,
            score: 0,
            lastActivity: serverTimestamp()
        }, { merge: true });

        localStorage.setItem('pm_game_session_id', sessionId);
        localStorage.setItem('pm_game_username', username);

        const sessionData = sessionDoc.data();
        const sessionLanguage = sessionData.language || AppConfig.defaultLanguage;

        window.location.href = `game.html?session=${sessionId}&lang=${sessionLanguage}`;

    } catch (e) {
        console.error("Erro ao verificar ou acessar sessão:", e);
        showMessage(`${pageTranslations[currentLanguage].error_checking_session} ${e.message}`, 'error');
    }
}

/**
 * Adiciona os event listeners aos botões.
 * Esta função deve ser chamada APÓS a inicialização do Firebase para garantir que as funções de callback
 * (createNewSession, accessExistingSession) tenham acesso às instâncias de Firebase.
 */
function addEventListeners() {
    // Garante que os elementos existem antes de adicionar listeners
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    existingGameUsernameInput = document.getElementById('existingGameUsernameInput');
    messageBox = document.getElementById('messageBox');
    goToGameButton = document.getElementById('goToGameButton');
    goBackToHomeButtonContainer = document.getElementById('go-to-game-container');
    mainContentContainer = document.getElementById('main-content-container');
    languageSelectorButtonsContainer = document.getElementById('language-selector-buttons');
    newGameCard = document.getElementById('newGameCard');
    accessGameCard = document.getElementById('accessGameCard');

    if (newGameButton) {
        newGameButton.addEventListener('click', createNewSession);
    } else {
        console.warn("Elemento #newGameButton não encontrado.");
    }

    if (accessGameButton) {
        accessGameButton.addEventListener('click', accessExistingSession);
    } else {
        console.warn("Elemento #accessGameButton não encontrado.");
    }

    if (goToGameButton) {
        goToGameButton.addEventListener('click', () => {
            const sessionId = localStorage.getItem('pm_game_session_id');
            const sessionLanguage = localStorage.getItem('pm_game_language') || currentLanguage;
            if (sessionId) {
                window.location.href = `game.html?session=${sessionId}&lang=${sessionLanguage}`;
            } else {
                showMessage(pageTranslations[currentLanguage].error_no_session_id, 'error');
            }
        });
    } else {
        console.warn("Elemento #goToGameButton não encontrado.");
    }
}

/**
 * Função de inicialização da lógica da página.
 */
async function initPageLogic() {
    console.log("initPageLogic: Iniciando...");

    // Tenta carregar o idioma salvo no localStorage, caso contrário, usa o padrão
    const savedLanguage = localStorage.getItem('pm_game_language');
    if (savedLanguage && AppConfig.supportedLanguages.some(lang => lang.code === savedLanguage)) {
        currentLanguage = savedLanguage;
    } else {
        currentLanguage = AppConfig.defaultLanguage;
        localStorage.setItem('pm_game_language', currentLanguage);
    }

    // Adiciona logs para verificar se window.db e window.auth estão definidos
    console.log("initPageLogic: Instância de window.db:", window.db);
    console.log("initPageLogic: Instância de window.auth:", window.auth);


    // Garante que todos os elementos DOM necessários estão disponíveis
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    existingGameUsernameInput = document.getElementById('existingGameUsernameInput');
    messageBox = document.getElementById('messageBox');
    goToGameButton = document.getElementById('goToGameButton');
    goBackToHomeButtonContainer = document.getElementById('go-to-game-container');
    mainContentContainer = document.getElementById('main-content-container');
    languageSelectorButtonsContainer = document.getElementById('language-selector-buttons');
    newGameCard = document.getElementById('newGameCard');
    accessGameCard = document.getElementById('accessGameCard');


    // Validação de elementos DOM para depuração
    if (!messageBox) {
        console.error("initPageLogic: Elemento #messageBox não encontrado no DOM! Mensagens ao usuário não serão exibidas.");
    }
    if (!goToGameButton) {
        console.warn("initPageLogic: Elemento #goToGameButton não encontrado no DOM. O botão 'Entrar no Jogo' não funcionará.");
    }
    if (!goBackToHomeButtonContainer) {
        console.warn("initPageLogic: Elemento #go-to-game-container não encontrado no DOM. O container do botão 'Entrar no Jogo' não será gerenciado.");
    }
    if (!mainContentContainer) {
        console.warn("initPageLogic: Elemento #main-content-container não encontrado no DOM. O conteúdo principal pode ter FOUC.");
    }
    if (!languageSelectorButtonsContainer) {
        console.warn("initPageLogic: Elemento #language-selector-buttons não encontrado no DOM. O seletor de idioma não funcionará.");
    }
    if (!existingGameUsernameInput) {
        console.error("initPageLogic: O elemento de input 'existingGameUsernameInput' não foi encontrado no DOM! A entrada de nome de usuário para jogos existentes pode não funcionar.");
    }

    // Carregar traduções e configurar seletor de idioma
    const translationsLoaded = await loadTranslations(currentLanguage);
    if (translationsLoaded) {
        setupLanguageSelector();
        updateContentLanguage();
    } else {
        console.error("initPageLogic: Falha ao carregar traduções. A interface pode não exibir texto.");
    }

    // Adiciona os listeners APÓS toda a lógica de inicialização, incluindo a verificação do Firebase
    addEventListeners();

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
    // Aguarda a inicialização do Firebase antes de iniciar a lógica da página
    await window.firebaseInitializedPromise;
    console.log("Firebase inicializado e autenticado. Iniciando a lógica da página inicial...");
    initPageLogic();
});
