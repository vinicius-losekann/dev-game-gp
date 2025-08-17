// js/index.js

// Importa as funções necessárias do Firebase Firestore
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Idioma padrão lido do arquivo de configuração
let currentLanguage = AppConfig.defaultLanguage;
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

// Referências a elementos DOM
let newGameButton;
let accessGameButton;
let newGameCard; // Referência ao card "Iniciar Novo Jogo"
let accessGameCard; // Referência ao card "Acessar Jogo Existente"
let sessionIdInput;
// REMOVIDO: let newGameUsernameInput; // Não é mais necessário para "Iniciar Novo Jogo"
let existingGameUsernameInput; // Input para nome de usuário em jogo existente
let messageBox; // Referência à caixa de mensagem
let sessionInfo; // Elemento para informações da sessão
let goToGameButton; // Botão para ir para o jogo
let goBackToHomeButtonContainer; // Container do botão "Entrar no Jogo"
let mainContentContainer; // Referência ao contêiner principal
let languageSelectorButtonsContainer; // Referência ao contêiner dos botões de idioma
const loadingOverlay = document.getElementById('loadingOverlay'); // Referência ao overlay de carregamento

// Variáveis para as instâncias do Firebase
let db;
let auth;

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

// Função para esconder o overlay de carregamento
function hideLoadingOverlay() {
    if (loadingOverlay) {
        console.log("hideLoadingOverlay: Escondendo overlay de carregamento. Adicionando classe 'hidden'.");
        loadingOverlay.classList.add('hidden');
    }
}

// Função para gerar um ID de sessão aleatório
function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Adiciona o sufixo do idioma atual (ex: PTBR, ENUS)
    return result + currentLanguage.toUpperCase().replace('-', '');
}

// Função para carregar as traduções
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

// Função para atualizar o conteúdo da página com base no idioma selecionado
function updateContentLanguage() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (pageTranslations[currentLanguage] && pageTranslations[currentLanguage][key]) {
            element.textContent = pageTranslations[currentLanguage][key];
        }
    });

    // Atualiza placeholders manualmente, pois textContent não funciona para eles
    const usernameInputPlaceholder = pageTranslations[currentLanguage]?.input_username_placeholder || 'Digite seu Nome de Usuário';
    // REMOVIDO: newGameUsernameInput.placeholder = usernameInputPlaceholder;
    if (existingGameUsernameInput) {
        existingGameUsernameInput.placeholder = usernameInputPlaceholder;
    }

    const sessionIdPlaceholder = pageTranslations[currentLanguage]?.input_session_placeholder || 'Digite o ID da Sessão (Ex: 1234PTBR)';
    if (sessionIdInput) {
        sessionIdInput.placeholder = sessionIdPlaceholder;
    }
}

// Função para configurar os botões de seleção de idioma
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

// Função para manipular a criação de uma nova sessão de jogo
async function createNewSession() {
    hideMessage(); // Esconde qualquer mensagem anterior

    showMessage(pageTranslations[currentLanguage].creating_session_message, 'info');

    // As instâncias 'db' e 'auth' são garantidas como inicializadas pelo 'window.firebaseInitializedPromise'
    // e setadas no `initPageLogic`.
    if (!db || !auth) {
        showMessage(pageTranslations[currentLanguage].error_firebase_init, 'error');
        console.error("Firebase Firestore ou Auth não estão inicializados no createNewSession.");
        return;
    }

    try {
        const userId = auth.currentUser?.uid || crypto.randomUUID();
        // Gerar um nome de usuário padrão se não for fornecido no início do jogo
        const defaultUsername = `Usuário-${userId.substring(0, 5)}`;

        const sessionId = generateSessionId(); // Gera um ID de sessão
        const sessionDocRef = doc(db, "artifacts", window.appId, "public", "data", "sessions", sessionId);
        const playerDocRef = doc(sessionDocRef, "players", userId);

        // Cria a sessão com os dados iniciais
        await setDoc(sessionDocRef, {
            createdAt: serverTimestamp(),
            hostId: userId,
            currentQuestionIndex: 0,
            questionArea: null, // Para a primeira pergunta aleatória
            language: currentLanguage
        });

        // Adiciona o jogador à subcoleção 'players'
        await setDoc(playerDocRef, {
            username: defaultUsername, // Usa o nome de usuário padrão
            score: 0,
            lastActivity: serverTimestamp()
        });

        // Armazena o ID da sessão e o nome de usuário (padrão) no localStorage para game.html
        localStorage.setItem('pm_game_session_id', sessionId);
        localStorage.setItem('pm_game_username', defaultUsername); // Salva o nome de usuário padrão

        // Preenche o campo de ID da sessão automaticamente
        if (sessionIdInput) {
            sessionIdInput.value = sessionId;
        }
        // Coloca o foco no campo de nome de usuário existente para o usuário digitar
        if (existingGameUsernameInput) {
            existingGameUsernameInput.value = ''; // Garante que esteja vazio
            existingGameUsernameInput.focus();
        }

        // Oculta o card de novo jogo e mostra a mensagem e botão para ir ao jogo
        if (newGameCard) {
            newGameCard.classList.add('hidden'); // Oculta o card de criar novo jogo
        }
        // Garante que o card de acessar jogo esteja visível (pode já estar)
        if (accessGameCard) {
             accessGameCard.classList.remove('hidden');
        }
        if (goBackToHomeButtonContainer) {
            goBackToHomeButtonContainer.classList.remove('hidden'); // Mostra o container do botão "Entrar no Jogo"
            // Atualiza o texto da mensagem do prompt
            goBackToHomeButtonContainer.querySelector('p').textContent = pageTranslations[currentLanguage].session_id_prompt;
        }

        // Atualiza a mensagem da caixa de mensagens para instruir o usuário
        showMessage(`${pageTranslations[currentLanguage].session_created_message}${sessionId}`, 'success');

    } catch (e) {
        console.error("Erro ao criar documento:", e);
        showMessage(`${pageTranslations[currentLanguage].error_creating_session} ${e.message}`, 'error');
    }
}

// Função para manipular o acesso a uma sessão existente
async function accessExistingSession() {
    hideMessage(); // Esconde qualquer mensagem anterior
    const sessionId = sessionIdInput.value.trim();
    const username = existingGameUsernameInput.value.trim();

    if (!sessionId) {
        showMessage(pageTranslations[currentLanguage].error_invalid_session_id, 'error');
        return;
    }
    if (!username) {
        showMessage(pageTranslations[currentLanguage].error_empty_username, 'error');
        return;
    }

    showMessage(`${pageTranslations[currentLanguage].joining_session_message} ${sessionId}...`, 'info');

    // As instâncias 'db' e 'auth' são garantidas como inicializadas pelo 'window.firebaseInitializedPromise'
    // e setadas no `initPageLogic`.
    if (!db || !auth) {
        showMessage(pageTranslations[currentLanguage].error_firebase_init, 'error');
        console.error("Firebase Firestore ou Auth não estão inicializados no accessExistingSession.");
        return;
    }

    try {
        const userId = auth.currentUser?.uid || crypto.randomUUID();
        const sessionDocRef = doc(db, "artifacts", window.appId, "public", "data", "sessions", sessionId);
        const sessionDoc = await getDoc(sessionDocRef);

        if (!sessionDoc.exists()) {
            showMessage(pageTranslations[currentLanguage].session_not_found_error, 'error');
            return;
        }

        // Adiciona ou atualiza o jogador na subcoleção 'players' da sessão
        const playerDocRef = doc(sessionDocRef, "players", userId);
        await setDoc(playerDocRef, {
            username: username,
            score: 0, // Reinicia ou mantém o score
            lastActivity: serverTimestamp()
        }, { merge: true }); // Usa merge para não sobrescrever outros dados do jogador se existirem

        // Armazena o ID da sessão e o nome de usuário no localStorage para game.html
        localStorage.setItem('pm_game_session_id', sessionId);
        localStorage.setItem('pm_game_username', username);

        // Determina o idioma da sessão para passar para a página do jogo
        const sessionData = sessionDoc.data();
        const sessionLanguage = sessionData.language || AppConfig.defaultLanguage; // Usa o idioma da sessão ou padrão

        // Redireciona para a página do jogo
        window.location.href = `game.html?session=${sessionId}&lang=${sessionLanguage}`;

    } catch (e) {
        console.error("Erro ao verificar ou acessar sessão:", e);
        showMessage(`${pageTranslations[currentLanguage].error_checking_session} ${e.message}`, 'error');
    }
}

// Função para adicionar os event listeners aos botões
function addEventListeners() {
    // Garante que os elementos existem antes de adicionar listeners
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    // REMOVIDO: newGameUsernameInput = document.getElementById('newGameUsernameInput');
    existingGameUsernameInput = document.getElementById('existingGameUsernameInput');
    messageBox = document.getElementById('messageBox');
    sessionInfo = document.getElementById('sessionInfo'); // Certifique-se de que este elemento existe
    goToGameButton = document.getElementById('goToGameButton');
    goBackToHomeButtonContainer = document.getElementById('go-to-game-container');
    mainContentContainer = document.getElementById('main-content-container');
    languageSelectorButtonsContainer = document.getElementById('language-selector-buttons');
    newGameCard = document.getElementById('newGameCard'); // Obtém referência ao novo card
    accessGameCard = document.getElementById('accessGameCard'); // Obtém referência ao novo card

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
            const sessionLanguage = localStorage.getItem('pm_game_language') || currentLanguage; // Usa o idioma salvo ou o atual
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

// Função de inicialização da lógica da página
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

    // Atribui as instâncias do Firebase, que são garantidas pelo window.firebaseInitializedPromise
    db = getFirestore(window.app); // Obtém a instância do Firestore a partir do app global
    auth = window.auth; // A instância de autenticação já está global em window.auth

    // Garante que todos os elementos DOM necessários estão disponíveis
    // Re-obtem as referências caso o initPageLogic seja chamado novamente
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    // REMOVIDO: newGameUsernameInput = document.getElementById('newGameUsernameInput');
    existingGameUsernameInput = document.getElementById('existingGameUsernameInput');
    messageBox = document.getElementById('messageBox');
    sessionInfo = document.getElementById('sessionInfo');
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
    if (!sessionInfo) {
        console.warn("initPageLogic: Elemento #sessionInfo não encontrado no DOM. As informações de sessão não serão exibidas.");
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
    // Aguarda a inicialização do Firebase antes de iniciar a lógica da página
    await window.firebaseInitializedPromise;
    console.log("Firebase inicializado e autenticado. Iniciando a lógica da página inicial...");
    initPageLogic();
});
