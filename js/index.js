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

// Função para exibir mensagens ao usuário
function showMessage(message, type = 'info') {
    console.log(`showMessage: ${message} (Type: ${type})`); // Log para depuração
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`; // Resetar classes e adicionar a nova
        messageBox.classList.remove('hidden');
    } else {
        console.warn('showMessage: Elemento messageBox não encontrado.');
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
    console.log(`loadTranslations: Tentando carregar traduções para '${lang}'`); // Log para depuração
    let success = false;
    try {
        const response = await fetch(`/dev-game-gp/translations/index_translations.json`);
        if (!response.ok) {
            console.error(`loadTranslations: HTTP error! status: ${response.status} ao carregar index_translations.json`);
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
            console.log(`loadTranslations: Traduções para '${lang}' carregadas com sucesso.`); // Log para depuração
        } else {
            console.error(`loadTranslations: Idioma '${lang}' não encontrado nas traduções.`);
            success = false;
        }
    } catch (error) {
        console.error("loadTranslations: Erro ao carregar ou processar traduções:", error);
        showMessage('Erro ao carregar traduções. Verifique o console para detalhes.', 'error');
        success = false;
    }
    return success;
}

// Função para aplicar as traduções aos elementos DOM
function applyTranslations() {
    console.log('applyTranslations: Aplicando traduções aos elementos DOM.'); // Log para depuração
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.dataset.langKey;
        if (pageTranslations[key]) {
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.setAttribute('placeholder', pageTranslations[key]);
            } else {
                element.innerHTML = pageTranslations[key];
            }
        }
    });

    if (usernameInput && pageTranslations.input_username_placeholder) {
        usernameInput.setAttribute('placeholder', pageTranslations.input_username_placeholder);
    }
    console.log('applyTranslations: Traduções aplicadas.'); // Log para depuração
}

// Função para carregar dinamicamente os botões de seleção de idioma
function setupLanguageSelector() {
    console.log('setupLanguageSelector: Configurando botões de seleção de idioma.'); // Log para depuração
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
        console.log('setupLanguageSelector: Botões de idioma configurados.'); // Log para depuração
    } else {
        console.warn('setupLanguageSelector: languageSelectorButtonsContainer ou AppConfig.supportedLanguages não encontrados.');
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
    console.log('createNewSession: Iniciando criação de nova sessão.'); // Log para depuração
    hideMessage();
    const username = usernameInput.value.trim();

    if (!username) {
        showMessage(pageTranslations.error_empty_username, 'error');
        console.warn('createNewSession: Nome de usuário vazio.');
        return;
    }

    if (!window.db || !window.auth || !window.auth.currentUser) {
        showMessage(pageTranslations.error_firebase_init, 'error');
        console.error('createNewSession: Firebase não inicializado ou usuário não autenticado.');
        return;
    }

    newGameButton.disabled = true;
    accessGameButton.disabled = true;
    showMessage(pageTranslations.creating_session_message, 'info');

    try {
        const newSessionId = generateSessionId(currentLanguage);
        const userId = window.currentUserId; // O UID do usuário autenticado Firebase
        const userRef = window.firestore.doc(window.db, `artifacts/${window.appId}/users/${userId}/profile`, 'info');

        await window.firestore.setDoc(userRef, { username: username, lastSeen: window.firestore.serverTimestamp() }, { merge: true });
        localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, username);

        const sessionRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);
        const sessionDoc = await window.firestore.getDoc(sessionRef);

        if (sessionDoc.exists()) {
            showMessage(pageTranslations.error_creating_session + ': ID já existe, tentando novamente.', 'error');
            console.warn('createNewSession: ID de sessão já existe. Tentando novamente.');
            setTimeout(() => createNewSession(), 500);
            return;
        }

        const initialSessionData = {
            createdAt: window.firestore.serverTimestamp(),
            hostId: userId,
            hostUsername: username,
            language: currentLanguage,
            status: 'waiting',
            currentPlayers: [{ id: userId, username: username, joinedAt: window.firestore.serverTimestamp() }]
        };

        await window.firestore.setDoc(sessionRef, initialSessionData);

        displaySessionId.textContent = newSessionId;
        sessionInfo.classList.remove('hidden');
        showMessage(pageTranslations.session_created_message + newSessionId, 'success');
        console.log(`createNewSession: Sessão ${newSessionId} criada com sucesso.`);

        localStorage.setItem('pm_game_session_id', newSessionId);

        newGameButton.disabled = false;
        accessGameButton.disabled = false;

    } catch (error) {
        console.error("createNewSession: Erro ao criar sessão no Firestore:", error);
        showMessage(pageTranslations.error_creating_session + `: ${error.message}`, 'error');
        newGameButton.disabled = false;
        accessGameButton.disabled = false;
    }
}

// Função para acessar uma sessão existente
async function accessExistingSession() {
    console.log('accessExistingSession: Tentando acessar sessão existente.'); // Log para depuração
    hideMessage();
    const enteredSessionId = sessionIdInput.value.trim();
    const username = usernameInput.value.trim();

    if (!username) {
        showMessage(pageTranslations.error_empty_username, 'error');
        console.warn('accessExistingSession: Nome de usuário vazio.');
        return;
    }

    if (!enteredSessionId) {
        showMessage(pageTranslations.error_invalid_session_id, 'error');
        console.warn('accessExistingSession: ID de sessão vazio.');
        return;
    }

    const sessionIdRegex = /^\d{7}[A-Z]{4}$/;
    if (!sessionIdRegex.test(enteredSessionId)) {
        showMessage(pageTranslations.error_invalid_session_id, 'error');
        console.warn('accessExistingSession: Formato de ID de sessão inválido:', enteredSessionId);
        return;
    }

    if (!window.db || !window.auth || !window.auth.currentUser) {
        showMessage(pageTranslations.error_firebase_init, 'error');
        console.error('accessExistingSession: Firebase não inicializado ou usuário não autenticado.');
        return;
    }

    newGameButton.disabled = true;
    accessGameButton.disabled = true;
    showMessage(pageTranslations.joining_session_message + ` ${enteredSessionId}...`, 'info');

    try {
        const userId = window.currentUserId;
        const userRef = window.firestore.doc(window.db, `artifacts/${window.appId}/users/${userId}/profile`, 'info');

        await window.firestore.setDoc(userRef, { username: username, lastSeen: window.firestore.serverTimestamp() }, { merge: true });
        localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, username);

        const sessionRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, enteredSessionId);
        const sessionDoc = await window.firestore.getDoc(sessionRef);

        if (sessionDoc.exists()) {
            const sessionData = sessionDoc.data();
            const sessionLanguage = sessionData.language || AppConfig.defaultLanguage;

            const currentPlayers = sessionData.currentPlayers || [];
            const playerExists = currentPlayers.some(player => player.id === userId);

            if (!playerExists) {
                await window.firestore.updateDoc(sessionRef, {
                    currentPlayers: window.firestore.arrayUnion({ id: userId, username: username, joinedAt: window.firestore.serverTimestamp() })
                });
                console.log(`accessExistingSession: Adicionado jogador '${username}' à sessão '${enteredSessionId}'.`);
            } else {
                console.log(`accessExistingSession: Jogador '${username}' já está na sessão '${enteredSessionId}'.`);
            }

            showMessage(pageTranslations.joining_session_message + ` ${enteredSessionId}...`, 'success');
            console.log(`accessExistingSession: Entrando na sessão ${enteredSessionId}.`);

            localStorage.setItem('pm_game_session_id', enteredSessionId);

            window.location.href = `game.html?session=${enteredSessionId}&lang=${sessionLanguage}`;
        } else {
            showMessage(pageTranslations.session_not_found_error || `Sessão \"${enteredSessionId}\" não encontrada.`, 'error');
            console.warn(`accessExistingSession: Sessão '${enteredSessionId}' não encontrada.`);
            newGameButton.disabled = false;
            accessGameButton.disabled = false;
        }
    } catch (error) {
        console.error("accessExistingSession: Erro ao verificar sessão no Firestore:", error);
        showMessage(pageTranslations.error_checking_session + `: ${error.message}`, 'error');
        newGameButton.disabled = false;
        accessGameButton.disabled = false;
    }
}

// Inicialização da lógica da página
async function initPageLogic() {
    console.log("initPageLogic: Iniciando inicialização da lógica da página."); // Log para depuração

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

    // Validação que todos os elementos importantes foram encontrados
    if (!newGameButton || !accessGameButton || !sessionIdInput || !usernameInput || !messageBox || !sessionInfo || !displaySessionId || !goToGameButton || !languageSelectorButtonsContainer || !loadingOverlay || !mainContentContainer) {
        console.error("initPageLogic: Um ou mais elementos DOM essenciais não foram encontrados. Verifique o HTML.");
        showMessage("Erro crítico: Elementos da interface não encontrados. Verifique o console.", "error");
        // Não proceed, pois a UI não está completa
        return;
    }
    console.log("initPageLogic: Todos os elementos DOM essenciais encontrados."); // Log para depuração


    const savedLanguage = localStorage.getItem('pm_game_language');
    if (savedLanguage && AppConfig.supportedLanguages.some(l => l.code === savedLanguage)) {
        currentLanguage = savedLanguage;
        console.log(`initPageLogic: Idioma salvo detectado: ${savedLanguage}`);
    } else {
        currentLanguage = AppConfig.defaultLanguage;
        console.log(`initPageLogic: Usando idioma padrão: ${AppConfig.defaultLanguage}`);
    }

    const savedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
    if (savedUsername) {
        usernameInput.value = savedUsername;
        console.log(`initPageLogic: Nome de usuário salvo carregado: ${savedUsername}`);
    }

    const translationsLoaded = await loadTranslations(currentLanguage);
    if (!translationsLoaded) {
        console.error("initPageLogic: Falha ao carregar as traduções iniciais. A interface pode não estar traduzida.");
    }

    setupLanguageSelector();

    if (newGameButton) {
        newGameButton.addEventListener('click', createNewSession);
    }
    if (accessGameButton) {
        accessGameButton.addEventListener('click', accessExistingSession);
    }
    if (goToGameButton) {
        goToGameButton.addEventListener('click', () => {
            const currentSessionId = displaySessionId.textContent;
            if (currentSessionId) {
                window.location.href = `game.html?session=${currentSessionId}&lang=${currentLanguage}`;
            } else {
                showMessage(pageTranslations.error_no_session_info, 'error');
                console.warn("initPageLogic: Tentativa de ir para o jogo sem ID de sessão.");
            }
        });
    }

    // Esconder overlay de carregamento e mostrar conteúdo principal
    console.log("initPageLogic: Escondendo loadingOverlay e mostrando mainContentContainer."); // Log para depuração
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
    if (mainContentContainer) {
        mainContentContainer.classList.remove('opacity-0', 'invisible');
        mainContentContainer.classList.add('fade-in'); // Adicionar classe para animação de fade-in se desejar
    }
    console.log("initPageLogic: Lógica da página inicializada com sucesso."); // Log para depuração
}

// Listener principal DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded: Disparado. Iniciando inicialização..."); // Log para depuração

    // Aguarda que a promessa de inicialização do Firebase seja resolvida
    // A promessa `window.firebaseInitializedPromise` é definida em index.html
    if (typeof window.firebaseInitializedPromise !== 'undefined') {
        await window.firebaseInitializedPromise;
        console.log("DOMContentLoaded: Firebase inicializado. Iniciando a lógica da página...");
        await initPageLogic();
    } else {
        console.error("DOMContentLoaded: window.firebaseInitializedPromise não está definido. Firebase não foi configurado corretamente.");
        // Pode ser útil mostrar uma mensagem de erro ao usuário aqui também.
        document.getElementById('loadingOverlay').textContent = "Erro crítico: Firebase não configurado. Verifique o console.";
    }
});
