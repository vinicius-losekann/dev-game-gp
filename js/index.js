// js/index.js

// Idioma padrão lido do arquivo de configuração
let currentLanguage = AppConfig.defaultLanguage;
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

let newGameButton;
let accessGameButton;
let sessionIdInput;
let usernameInput; // Novo: referência ao campo de nome de usuário
let messageBox; // Referência à caixa de mensagem
let sessionInfo; // Novo elemento para informações da sessão
let displaySessionId; // Novo: elemento para exibir o ID da sessão criada
let goToGameButton; // Novo: botão para ir para o jogo após criar sessão
let languageSelectorButtonsContainer; // Referência ao contêiner dos botões de idioma
let loadingOverlay;
let mainContentContainer;

const LOCAL_STORAGE_USERNAME_KEY = 'pm_game_username'; // Chave para armazenar o username no localStorage

// Função para mostrar mensagens na tela
function showMessage(message, type = 'info') {
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`; // Resetar classes e adicionar a nova
        messageBox.classList.remove('hidden');
    } else {
        console.warn('Elemento messageBox não encontrado.');
    }
}

// Função para esconder a caixa de mensagem
function hideMessage() {
    if (messageBox) {
        messageBox.classList.add('hidden');
    }
}

// Função para carregar as traduções do arquivo JSON
async function loadTranslations(lang) {
    let success = false;
    try {
        const response = await fetch(`/dev-game-gp/translations/index_translations.json`);
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status} ao carregar index_translations.json`);
            // Tenta um caminho alternativo ou notifica o usuário
            showMessage('Erro ao carregar traduções. Por favor, recarregue a página.', 'error');
            return false;
        }
        const translations = await response.json();
        if (translations[lang]) {
            pageTranslations = translations[lang];
            applyTranslations();
            currentLanguage = lang; // Atualiza o idioma atual após carregar
            localStorage.setItem('pm_game_language', lang); // Salva o idioma selecionado no localStorage
            success = true;
        } else {
            console.error(`Idioma '${lang}' não encontrado nas traduções.`);
            success = false;
        }
    } catch (error) {
        console.error("Erro ao carregar ou processar traduções:", error);
        showMessage('Erro ao carregar traduções. Verifique o console para detalhes.', 'error');
        success = false;
    }
    return success;
}

// Função para aplicar as traduções aos elementos DOM
function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.dataset.langKey;
        if (pageTranslations[key]) {
            // Se for um input placeholder, usa setAttribute
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.setAttribute('placeholder', pageTranslations[key]);
            } else {
                element.innerHTML = pageTranslations[key];
            }
        }
    });

    // Atualiza o placeholder do campo de username manualmente para evitar conflito com data-lang-key no H2
    if (usernameInput && pageTranslations.input_username_placeholder) {
        usernameInput.setAttribute('placeholder', pageTranslations.input_username_placeholder);
    }
}

// Função para carregar dinamicamente os botões de seleção de idioma
function setupLanguageSelector() {
    if (languageSelectorButtonsContainer && AppConfig.supportedLanguages) {
        languageSelectorButtonsContainer.innerHTML = ''; // Limpa botões existentes
        AppConfig.supportedLanguages.forEach(lang => {
            const button = document.createElement('button');
            button.className = 'lang-button game-button py-2 px-4 rounded-lg shadow font-semibold';
            button.dataset.langCode = lang.code;
            button.textContent = lang.name;
            if (lang.code === currentLanguage) {
                button.classList.add('bg-green-500', 'text-white');
            } else {
                button.classList.add('bg-gray-200', 'hover:bg-gray-300', 'text-gray-800');
            }
            button.addEventListener('click', async () => {
                if (button.dataset.langCode !== currentLanguage) {
                    await loadTranslations(button.dataset.langCode);
                    // Atualiza o estilo dos botões
                    document.querySelectorAll('.lang-button').forEach(btn => {
                        if (btn.dataset.langCode === currentLanguage) {
                            btn.classList.add('bg-green-500', 'text-white');
                            btn.classList.remove('bg-gray-200', 'hover:bg-gray-300', 'text-gray-800');
                        } else {
                            btn.classList.remove('bg-green-500', 'text-white');
                            btn.classList.add('bg-gray-200', 'hover:bg-gray-300', 'text-gray-800');
                        }
                    });
                }
            });
            languageSelectorButtonsContainer.appendChild(button);
        });
    }
}

// Função para gerar um ID de sessão único
function generateSessionId(langCode) {
    const timestamp = Date.now().toString().slice(-4); // Últimos 4 dígitos do timestamp
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 dígitos aleatórios
    const langSuffix = langCode.replace('-', '').toUpperCase(); // Ex: PTBR, ENUS, ESES
    return `${timestamp}${random}${langSuffix}`;
}

// Função para criar uma nova sessão
async function createNewSession() {
    hideMessage();
    const username = usernameInput.value.trim();

    if (!username) {
        showMessage(pageTranslations.error_empty_username, 'error');
        return;
    }

    if (!window.db || !window.auth || !window.auth.currentUser) {
        showMessage(pageTranslations.error_firebase_init, 'error');
        return;
    }

    newGameButton.disabled = true;
    accessGameButton.disabled = true;
    showMessage(pageTranslations.creating_session_message, 'info');

    try {
        const newSessionId = generateSessionId(currentLanguage);
        const userId = window.currentUserId; // O UID do usuário autenticado Firebase
        const userRef = window.firestore.doc(window.db, `artifacts/${window.appId}/users/${userId}/profile`, 'info');

        // Garante que o perfil do usuário exista e tenha o nome de usuário
        await window.firestore.setDoc(userRef, { username: username, lastSeen: window.firestore.serverTimestamp() }, { merge: true });
        localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, username); // Salva o nome de usuário no localStorage

        const sessionRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);
        const sessionDoc = await window.firestore.getDoc(sessionRef);

        if (sessionDoc.exists()) {
            showMessage(pageTranslations.error_creating_session + ': ID já existe, tentando novamente.', 'error');
            setTimeout(() => createNewSession(), 500); // Tenta novamente após um pequeno atraso
            return;
        }

        const initialSessionData = {
            createdAt: window.firestore.serverTimestamp(),
            hostId: userId,
            hostUsername: username,
            language: currentLanguage,
            status: 'waiting', // Ou 'active', 'lobby'
            currentPlayers: [{ id: userId, username: username, joinedAt: window.firestore.serverTimestamp() }]
        };

        await window.firestore.setDoc(sessionRef, initialSessionData);

        displaySessionId.textContent = newSessionId;
        sessionInfo.classList.remove('hidden');
        showMessage(pageTranslations.session_created_message + newSessionId, 'success');
        console.log(`Sessão ${newSessionId} criada com sucesso.`);

        // Armazena o ID da sessão criada no localStorage para uso futuro
        localStorage.setItem('pm_game_session_id', newSessionId);

        newGameButton.disabled = false;
        accessGameButton.disabled = false;

    } catch (error) {
        console.error("Erro ao criar sessão no Firestore:", error);
        showMessage(pageTranslations.error_creating_session + `: ${error.message}`, 'error');
        newGameButton.disabled = false;
        accessGameButton.disabled = false;
    }
}

// Função para acessar uma sessão existente
async function accessExistingSession() {
    hideMessage();
    const enteredSessionId = sessionIdInput.value.trim();
    const username = usernameInput.value.trim();

    if (!username) {
        showMessage(pageTranslations.error_empty_username, 'error');
        return;
    }

    if (!enteredSessionId) {
        showMessage(pageTranslations.error_invalid_session_id, 'error');
        return;
    }

    // Basic regex for session ID format (e.g., 4 digits + 3 digits + 4 chars for lang)
    const sessionIdRegex = /^\d{7}[A-Z]{4}$/;
    if (!sessionIdRegex.test(enteredSessionId)) {
        showMessage(pageTranslations.error_invalid_session_id, 'error');
        return;
    }

    if (!window.db || !window.auth || !window.auth.currentUser) {
        showMessage(pageTranslations.error_firebase_init, 'error');
        return;
    }

    newGameButton.disabled = true;
    accessGameButton.disabled = true;
    showMessage(pageTranslations.joining_session_message + ` ${enteredSessionId}...`, 'info');

    try {
        const userId = window.currentUserId; // O UID do usuário autenticado Firebase
        const userRef = window.firestore.doc(window.db, `artifacts/${window.appId}/users/${userId}/profile`, 'info');

        // Garante que o perfil do usuário exista e tenha o nome de usuário
        await window.firestore.setDoc(userRef, { username: username, lastSeen: window.firestore.serverTimestamp() }, { merge: true });
        localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, username); // Salva o nome de usuário no localStorage

        const sessionRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, enteredSessionId);
        const sessionDoc = await window.firestore.getDoc(sessionRef);

        if (sessionDoc.exists()) {
            const sessionData = sessionDoc.data();
            const sessionLanguage = sessionData.language || AppConfig.defaultLanguage;

            // Adicionar o jogador à lista de currentPlayers se ainda não estiver lá
            const currentPlayers = sessionData.currentPlayers || [];
            const playerExists = currentPlayers.some(player => player.id === userId);

            if (!playerExists) {
                await window.firestore.updateDoc(sessionRef, {
                    currentPlayers: window.firestore.arrayUnion({ id: userId, username: username, joinedAt: window.firestore.serverTimestamp() })
                });
            }

            showMessage(pageTranslations.joining_session_message + ` ${enteredSessionId}...`, 'success');
            console.log(`Entrando na sessão ${enteredSessionId}.`);

            // Armazena o ID da sessão acessada no localStorage
            localStorage.setItem('pm_game_session_id', enteredSessionId);

            // Redireciona para a página do jogo com o ID da sessão e o idioma da sessão
            window.location.href = `game.html?session=${enteredSessionId}&lang=${sessionLanguage}`;
        } else {
            showMessage(pageTranslations.session_not_found_error || `Sessão \"${enteredSessionId}\" não encontrada.`, 'error');
            newGameButton.disabled = false;
            accessGameButton.disabled = false;
        }
    } catch (error) {
        console.error("Erro ao verificar sessão no Firestore:", error);
        showMessage(pageTranslations.error_checking_session + `: ${error.message}`, 'error');
        newGameButton.disabled = false;
        accessGameButton.disabled = false;
    }
}

// Inicialização da lógica da página
async function initPageLogic() {
    // Obter referências aos elementos DOM
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    usernameInput = document.getElementById('usernameInput');
    messageBox = document.getElementById('messageBox');
    sessionInfo = document.getElementById('sessionInfo');
    displaySessionId = document.getElementById('displaySessionId');
    goToGameButton = document.getElementById('goToGameButton');
    languageSelectorButtonsContainer = document.getElementById('languageSelectorButtons');
    loadingOverlay = document.getElementById('loadingOverlay');
    mainContentContainer = document.getElementById('main-content-container');

    // Tenta carregar o idioma salvo no localStorage, caso contrário, usa o padrão
    const savedLanguage = localStorage.getItem('pm_game_language');
    if (savedLanguage && AppConfig.supportedLanguages.some(l => l.code === savedLanguage)) {
        currentLanguage = savedLanguage;
    } else {
        currentLanguage = AppConfig.defaultLanguage;
    }

    // Tenta carregar o nome de usuário salvo no localStorage
    const savedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
    if (savedUsername) {
        usernameInput.value = savedUsername;
    }

    const translationsLoaded = await loadTranslations(currentLanguage);
    if (!translationsLoaded) {
        console.error("Falha ao carregar as traduções iniciais. A interface pode não estar traduzida.");
        // Não impede a execução, mas a experiência do usuário será afetada
    }

    setupLanguageSelector(); // Configura os botões de seleção de idioma

    // Adiciona event listeners
    if (newGameButton) {
        newGameButton.addEventListener('click', createNewSession);
    } else {
        console.error("Botão 'newGameButton' não encontrado.");
    }

    if (accessGameButton) {
        accessGameButton.addEventListener('click', accessExistingSession);
    } else {
        console.error("Botão 'accessGameButton' não encontrado.");
    }

    if (goToGameButton) {
        goToGameButton.addEventListener('click', () => {
            const currentSessionId = displaySessionId.textContent;
            if (currentSessionId) {
                // Redireciona para a página do jogo com o ID da sessão e o idioma
                window.location.href = `game.html?session=${currentSessionId}&lang=${currentLanguage}`;
            } else {
                showMessage(pageTranslations.error_no_session_info, 'error');
            }
        });
    } else {
        console.error("Botão 'goToGameButton' não encontrado.");
    }

    // Esconder overlay de carregamento e mostrar conteúdo principal
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
    if (mainContentContainer) {
        mainContentContainer.classList.remove('opacity-0', 'invisible');
    }
}

// Listener principal DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded disparado. Iniciando inicialização...");

    // Aguarda que a promessa de inicialização do Firebase seja resolvida
    await window.firebaseInitializedPromise;
    console.log("Firebase inicializado. Iniciando a lógica da página...");

    // Agora que Firebase e AppConfig estão prontos, inicia a lógica principal da página
    await initPageLogic();
});
