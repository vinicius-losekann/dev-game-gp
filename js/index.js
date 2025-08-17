// js/index.js

// Idioma padrão lido do arquivo de configuração
let currentLanguage = AppConfig.defaultLanguage;
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

let newGameButton;
let accessGameButton;
let sessionIdInput;
let existingGameUsernameInput;
let messageBox;
let sessionInfo;
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
    // Implementação simples de UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Carregar traduções
async function loadTranslations(lang) {
    try {
        // CORREÇÃO: Carregar index_translations.json para a página inicial
        const response = await fetch(`index_translations.json`);
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
        const db = window.db; // Aceda à instância do Firestore a partir de window
        if (!db) {
            console.error("Firestore não está inicializado.");
            showMessage(pageTranslations['error_firebase_init'] || "Erro: Firebase não inicializado.", 'error');
            return false;
        }
        const sessionRef = window.firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, sessionId);
        const sessionSnap = await window.firestore.getDoc(sessionRef);
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

    const db = window.db; // Aceda à instância do Firestore
    const currentUserId = window.currentUserId; // Aceda ao ID do utilizador autenticado
    const appId = window.appId; // Aceda ao ID da aplicação

    if (!db || !currentUserId || !appId) {
        console.error("Firebase Firestore, ID do utilizador ou ID da aplicação não estão inicializados. Impossível criar sessão.");
        showMessage(pageTranslations['error_firebase_init'] || "Erro: Firebase não inicializado ou utilizador não autenticado.", 'error');
        return;
    }

    showMessage(pageTranslations['creating_session_message'] || "Criando nova sessão...", 'info');

    // Gera um ID de sessão único (ex: 1234PTBR, 5678ENUS)
    const newSessionId = Math.floor(1000 + Math.random() * 9000).toString() + currentLanguage.replace('-', '').toUpperCase();
    const sessionRef = window.firestore.doc(db, `artifacts/${appId}/public/data/sessions`, newSessionId);

    try {
        // Verifica se o ID já existe para evitar colisões (improvável mas possível)
        const docSnap = await window.firestore.getDoc(sessionRef);
        if (docSnap.exists()) {
            console.warn(`Sessão ID ${newSessionId} já existe. Tentando novamente.`);
            // Recursivamente tenta gerar um novo ID
            return createNewSession(username);
        }

        await window.firestore.setDoc(sessionRef, {
            createdAt: window.firestore.serverTimestamp(), // Adiciona timestamp do servidor
            hostId: currentUserId,
            hostName: username,
            language: currentLanguage,
            status: 'waiting', // ou 'active', etc.
            players: {
                [currentUserId]: username // Adiciona o host como primeiro jogador
            }
        });
        showMessage(pageTranslations['session_created_message'] + newSessionId, 'success');

        // Mostra a secção de "Entrar no Jogo"
        if (document.getElementById('displaySessionId')) {
            document.getElementById('displaySessionId').textContent = newSessionId;
        }
        if (document.getElementById('go-to-game-container')) {
            document.getElementById('go-to-game-container').classList.remove('hidden');
        }

        // Armazena o ID da sessão e o nome de utilizador localmente
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

    const db = window.db;
    const currentUserId = window.currentUserId;
    const appId = window.appId;

    if (!db || !currentUserId || !appId) {
        console.error("Firebase Firestore, ID do utilizador ou ID da aplicação não estão inicializados. Impossível aceder à sessão.");
        showMessage(pageTranslations['error_firebase_init'] || "Erro: Firebase não inicializado ou utilizador não autenticado.", 'error');
        return;
    }

    showMessage(pageTranslations['joining_session_message'] + sessionId + "...", 'info');
    const sessionRef = window.firestore.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId);

    try {
        const sessionSnap = await window.firestore.getDoc(sessionRef);

        if (sessionSnap.exists()) {
            const sessionData = sessionSnap.data();
            // Adiciona o utilizador à lista de jogadores da sessão
            const players = sessionData.players || {};
            if (!players[currentUserId]) { // Adiciona apenas se ainda não estiver na lista
                players[currentUserId] = username;
                await window.firestore.updateDoc(sessionRef, {
                    players: players
                });
            }
            // Armazena o ID da sessão e o nome de utilizador localmente
            localStorage.setItem('pm_game_session_id', sessionId);
            localStorage.setItem('pm_game_username', username);
            // Redireciona para a página do jogo, usando o idioma da sessão se disponível, ou o atual
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
    newGameButton.addEventListener('click', () => {
        // Gera um nome de utilizador automático para novo jogo
        const autoUsername = `Jogador${Math.floor(Math.random() * 10000)}`;
        createNewSession(autoUsername);
    });

    accessGameButton.addEventListener('click', () => {
        const sessionId = sessionIdInput.value.trim();
        const username = existingGameUsernameInput.value.trim();
        if (sessionId && username) {
            accessExistingSession(sessionId, username);
        } else {
            showMessage(pageTranslations['error_invalid_session_id'] || "Por favor, digite o ID da sessão e o seu nome de utilizador.", 'warning');
        }
    });

    // Listener para o botão "Entrar no Jogo" após criar sessão
    const goToGameButton = document.getElementById('goToGameButton');
    if (goToGameButton) {
        goToGameButton.addEventListener('click', () => {
            const sessionId = localStorage.getItem('pm_game_session_id');
            if (sessionId) {
                // Usa o idioma que foi definido na criação da sessão (que é o currentLanguage)
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

    // Verificações para elementos DOM
    if (!newGameButton || !accessGameButton || !sessionIdInput) {
        console.error("initPageLogic: Um ou mais botões/inputs principais não foram encontrados no DOM! A página pode não funcionar corretamente.");
    }
    if (!loadingOverlay) {
        console.warn("initPageLogic: Elemento #loadingOverlay não encontrado no DOM. O overlay de carregamento não será gerido.");
    }
    if (!existingGameUsernameInput) {
        console.error("initPageLogic: O elemento de input 'existingGameUsernameInput' não foi encontrado no DOM! A entrada de nome de utilizador para jogos existentes pode não funcionar.");
    }
    if (!languageSelectorButtonsContainer) {
        console.error("initPageLogic: O elemento 'language-selector-buttons' não foi encontrado no DOM. O seletor de idioma não funcionará.");
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
        await window.firebaseInitializedPromise;
        console.log("Firebase inicializado e autenticado. Iniciando a lógica da página...");
        await initPageLogic();
    } catch (error) {
        console.error("Erro na inicialização do Firebase, pulando a lógica da página:", error);
        showMessage("Erro ao iniciar a aplicação. Por favor, tente novamente. " + error.message, 'error');
        hideLoadingOverlay(); // Garante que o overlay seja escondido mesmo em caso de erro
        // Pode-se exibir uma mensagem de erro persistente ou uma tela de erro aqui
        if (mainContentContainer) {
            mainContentContainer.innerHTML = `<div class="text-red-500 text-center text-lg p-4">Ocorreu um erro crítico ao carregar a aplicação. Por favor, recarregue a página.</div>`;
            mainContentContainer.style.opacity = '1';
            mainContentContainer.style.visibility = 'visible';
        }
    }
});
