// js/index.js

// Idioma padrão lido do arquivo de configuração
let currentLanguage = AppConfig.defaultLanguage;
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

let newGameButton;
let accessGameButton;
let sessionIdInput;
// REMOVIDO: let newGameUsernameInput; // Input para nome de usuário em novo jogo
let existingGameUsernameInput; // Novo: Input para nome de usuário em jogo existente
let messageBox; // Referência à caixa de mensagem
let sessionInfo; // Novo elemento para informações da sessão
let mainContentContainer; // Referência ao contêiner principal
let languageSelectorButtonsContainer; // Referência ao contêiner dos botões de idioma
const loadingOverlay = document.getElementById('loadingOverlay'); // Referência ao overlay de carregamento

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
        loadingOverlay.classList.add('hidden'); // Usa uma classe Tailwind 'hidden' que define display: none;
    } else {
        console.warn("hideLoadingOverlay: Elemento loadingOverlay não encontrado.");
    }
}

// Função para carregar as traduções do arquivo JSON
async function loadTranslations(lang) {
    let success = false;
    try {
        const response = await fetch(`/dev-game-gp/translations/index_translations.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Verifica se o idioma solicitado existe, caso contrário, usa o padrão
        if (data[lang]) {
            pageTranslations = data[lang];
            currentLanguage = lang; // Atualiza a linguagem atual se o carregamento for bem-sucedido
            success = true;
            console.log(`loadTranslations: Traduções para '${lang}' carregadas com sucesso.`);
        } else {
            console.warn(`loadTranslations: Idioma '${lang}' não encontrado no arquivo de tradução. Usando idioma padrão.`);
            if (data[AppConfig.defaultLanguage]) {
                pageTranslations = data[AppConfig.defaultLanguage];
                currentLanguage = AppConfig.defaultLanguage;
                success = true;
            } else {
                console.error("loadTranslations: Idioma padrão também não encontrado. As traduções podem estar vazias.");
            }
        }
    } catch (error) {
        console.error('loadTranslations: Erro ao carregar traduções:', error);
        showMessage('Erro ao carregar traduções. Por favor, recarregue a página.', 'error');
    }
    return success;
}

// Função para atualizar o conteúdo da página com base no idioma selecionado
function updateContentLanguage() {
    console.log("updateContentLanguage: Atualizando conteúdo para o idioma:", currentLanguage);
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (pageTranslations[key]) {
            element.innerHTML = pageTranslations[key];
        }
    });
    // Atualiza o placeholder do input de sessão separadamente
    if (sessionIdInput && pageTranslations.input_session_placeholder) {
        sessionIdInput.placeholder = pageTranslations.input_session_placeholder;
    }
    // Atualiza o título da página
    const pageTitleElement = document.querySelector('title[data-lang-key="main_page_title"]');
    if (pageTitleElement && pageTranslations.main_page_title) {
        pageTitleElement.textContent = pageTranslations.main_page_title;
    }
}

// Configura os botões de seleção de idioma dinamicamente
function setupLanguageSelector() {
    if (languageSelectorButtonsContainer) {
        languageSelectorButtonsContainer.innerHTML = ''; // Limpa botões existentes
        AppConfig.supportedLanguages.forEach(lang => {
            const button = document.createElement('button');
            button.className = `lang-button game-button ${currentLanguage === lang.code ? 'selected' : ''}`;
            button.dataset.langCode = lang.code;
            button.textContent = pageTranslations[`lang_${lang.code.replace('-', '_').toLowerCase()}`] || lang.name; // Usa tradução se disponível, senão o nome
            button.addEventListener('click', async () => {
                if (currentLanguage !== lang.code) {
                    console.log(`setupLanguageSelector: Idioma alterado para ${lang.code}`);
                    currentLanguage = lang.code; // Atualiza o idioma atual imediatamente
                    await loadTranslations(lang.code); // Carrega as novas traduções
                    updateContentLanguage(); // Atualiza o conteúdo da UI
                    // Remove 'selected' de todos e adiciona ao clicado
                    document.querySelectorAll('.lang-button').forEach(btn => btn.classList.remove('selected'));
                    button.classList.add('selected');
                }
            });
            languageSelectorButtonsContainer.appendChild(button);
        });
        console.log("setupLanguageSelector: Botões de idioma configurados.");
    } else {
        console.warn("setupLanguageSelector: Elemento 'languageSelectorButtonsContainer' não encontrado.");
    }
}

// Adiciona todos os listeners de eventos aos elementos da página
function addEventListeners() {
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    // REMOVIDO: newGameUsernameInput = document.getElementById('newGameUsernameInput'); // Referência para o novo input
    existingGameUsernameInput = document.getElementById('existingGameUsernameInput'); // Referência para o novo input
    sessionInfo = document.getElementById('sessionInfo');
    const goToGameButton = document.getElementById('goToGameButton');


    if (newGameButton) {
        newGameButton.addEventListener('click', async () => {
            hideMessage(); // Esconde qualquer mensagem anterior
            newGameButton.disabled = true;
            accessGameButton.disabled = true;
            // REMOVIDO: const username = newGameUsernameInput.value.trim(); // Usa o input específico para novo jogo
            // REMOVIDO: if (!username) { ... }

            showMessage(pageTranslations.creating_session_message || 'Criando nova sessão...', 'info');
            console.log("New Game Button: Iniciando criação de nova sessão.");

            // Adiciona o currentUserId à sessão de jogadores com um nome padrão para o host
            const players = [{ id: window.currentUserId, name: "Host", isHost: true }]; // Nome padrão "Host"
            try {
                if (window.db && window.firestore && window.firestore.collection) { // Verifica se Firestore está disponível
                    // Usa __app_id do ambiente Canvas, se disponível.
                    // Caso contrário, usa um fallback ou um ID de app padrão (poderia ser firebaseConfig.appId)
                    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

                    // Referência à coleção 'sessions' dentro do escopo público do seu aplicativo
                    // Formato: /artifacts/{appId}/public/data/{your_collection_name}
                    const sessionsCollectionRef = window.firestore.collection(window.db, `artifacts/${appId}/public/data/sessions`);

                    const newSessionRef = await window.firestore.addDoc(sessionsCollectionRef, { // Usa addDoc
                        createdAt: window.firestore.serverTimestamp(),
                        hostId: window.currentUserId,
                        currentPlayers: players, // Inicializa com o criador
                        gameLanguage: currentLanguage, // Salva o idioma da sessão
                        status: 'waiting', // Define um status inicial
                        // Outros dados da sessão podem ser adicionados aqui
                    });

                    const newSessionId = newSessionRef.id;
                    // Gera um shortId mais robusto
                    const sessionShortId = newSessionId.substring(0, 4).toUpperCase() + currentLanguage.substring(0,2).toUpperCase(); // Ex: 1A2BPT

                    await window.firestore.updateDoc(window.firestore.doc(window.db, `artifacts/${appId}/public/data/sessions`, newSessionId), {
                        shortId: sessionShortId
                    });

                    // Exibe o ID da sessão e o botão para ir para o jogo
                    if (sessionInfo) {
                        document.getElementById('displaySessionId').textContent = sessionShortId;
                        sessionInfo.classList.remove('hidden');
                        showMessage(pageTranslations.session_created_message + sessionShortId, 'success');
                        console.log(`Sessão criada com ID: ${newSessionId} e Short ID: ${sessionShortId}`);
                    }
                    newGameButton.disabled = false;
                    accessGameButton.disabled = false;

                    // Automaticamente redireciona após um pequeno atraso ou permite que o usuário clique no botão
                    goToGameButton.onclick = () => {
                        window.location.href = `game.html?session=${newSessionId}&lang=${currentLanguage}`;
                    };

                } else {
                    showMessage(pageTranslations.error_firebase_init || "Erro: Firebase não inicializado.", 'error');
                    console.error("Firebase Firestore ou suas funções não estão disponíveis.");
                    newGameButton.disabled = false;
                    accessGameButton.disabled = false;
                }
            } catch (error) {
                console.error("Erro ao criar sessão no Firestore:", error);
                showMessage(pageTranslations.error_creating_session + `: ${error.message}`, 'error');
                newGameButton.disabled = false;
                accessGameButton.disabled = false;
            }
        });
    } else {
        console.error("Botão 'newGameButton' não encontrado.");
    }

    if (accessGameButton) {
        accessGameButton.addEventListener('click', async () => {
            hideMessage(); // Esconde qualquer mensagem anterior
            newGameButton.disabled = true;
            accessGameButton.disabled = true;
            const enteredShortSessionId = sessionIdInput.value.trim().toUpperCase(); // Garante que o ID de sessão seja em maiúsculas

            if (!enteredShortSessionId) {
                showMessage(pageTranslations.error_invalid_session_id || "Por favor, insira um ID de sessão.", 'error');
                newGameButton.disabled = false;
                accessGameButton.disabled = false;
                return;
            }

            const username = existingGameUsernameInput.value.trim(); // Usa o input específico para jogo existente
            if (!username) {
                showMessage(pageTranslations.error_username_required || "Por favor, insira seu nome de usuário.", 'error');
                newGameButton.disabled = false;
                accessGameButton.disabled = false;
                return;
            }

            console.log(`Access Game Button: Tentando acessar sessão com short ID: ${enteredShortSessionId}`);
            showMessage(pageTranslations.checking_session_message || 'Verificando sessão...', 'info');

            try {
                if (!window.db || !window.firestore || !window.firestore.query || !window.firestore.collection) {
                    throw new Error("Firebase Firestore ou suas funções não estão disponíveis.");
                }

                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                const sessionsCollectionRef = window.firestore.collection(window.db, `artifacts/${appId}/public/data/sessions`);
                const q = window.firestore.query(sessionsCollectionRef, window.firestore.where('shortId', '==', enteredShortSessionId));
                const querySnapshot = await window.firestore.getDocs(q);

                let sessionDoc = null;
                let sessionId = null;
                let sessionLanguage = AppConfig.defaultLanguage; // Default language

                if (!querySnapshot.empty) {
                    sessionDoc = querySnapshot.docs[0];
                    sessionId = sessionDoc.id;
                    const sessionData = sessionDoc.data();
                    sessionLanguage = sessionData.gameLanguage || AppConfig.defaultLanguage;

                    // Adicionar jogador à sessão
                    let currentPlayers = sessionData.currentPlayers || [];
                    const playerExists = currentPlayers.some(player => player.id === window.currentUserId);

                    if (!playerExists) {
                        currentPlayers.push({ id: window.currentUserId, name: username, isHost: false });
                        await window.firestore.updateDoc(window.firestore.doc(window.db, `artifacts/${appId}/public/data/sessions`, sessionId), {
                            currentPlayers: currentPlayers
                        });
                        console.log(`Usuário ${username} adicionado à sessão ${sessionId}.`);
                    } else {
                        // Se o usuário já existe, apenas atualiza o nome se diferente
                        const playerIndex = currentPlayers.findIndex(player => player.id === window.currentUserId);
                        if (currentPlayers[playerIndex].name !== username) {
                            currentPlayers[playerIndex].name = username;
                            await window.firestore.updateDoc(window.firestore.doc(window.db, `artifacts/${appId}/public/data/sessions`, sessionId), {
                                currentPlayers: currentPlayers
                            });
                            console.log(`Nome do usuário ${window.currentUserId} atualizado para ${username} na sessão ${sessionId}.`);
                        }
                    }

                    showMessage(pageTranslations.session_found_message || 'Sessão encontrada!', 'success');
                    console.log(`Entrando na sessão ${sessionId}.`);
                    // Redireciona para a página do jogo com o ID da sessão e o idioma da sessão
                    window.location.href = `game.html?session=${sessionId}&lang=${sessionLanguage}`;
                } else {
                    showMessage(pageTranslations.session_not_found_error || `Sessão \"${enteredShortSessionId}\" não encontrada.`, 'error');
                    newGameButton.disabled = false;
                    accessGameButton.disabled = false;
                }
            } catch (error) {
                console.error("Erro ao verificar sessão no Firestore:", error);
                showMessage(pageTranslations.error_checking_session + `: ${error.message}`, 'error');
                newGameButton.disabled = false;
                accessGameButton.disabled = false;
            }
        });
    } else {
        console.error("Botão 'accessGameButton' não encontrado.");
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

// Inicializa a lógica da página após o carregamento completo do DOM
async function initPageLogic() {
    console.log("initPageLogic: Iniciando...");

    // Obter referências aos elementos DOM
    mainContentContainer = document.getElementById('main-content-container');
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    // REMOVIDO: newGameUsernameInput = document.getElementById('newGameUsernameInput'); // Novo: Referência
    existingGameUsernameInput = document.getElementById('existingGameUsernameInput'); // Novo: Referência
    messageBox = document.getElementById('messageBox');
    sessionInfo = document.getElementById('sessionInfo');
    languageSelectorButtonsContainer = document.getElementById('languageSelectorButtons');


    // Verificar se os elementos principais foram encontrados
    if (!mainContentContainer) {
        console.error("initPageLogic: Elemento #main-content-container não encontrado no DOM! A página pode não renderizar corretamente.");
        // Pode ser útil mostrar uma mensagem de erro na tela aqui também
    }
    if (!loadingOverlay) {
        console.warn("initPageLogic: Elemento #loadingOverlay não encontrado no DOM. O overlay de carregamento não será gerenciado.");
    }
    // Verificado apenas existingGameUsernameInput, já que newGameUsernameInput foi removido
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
