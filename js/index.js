// js/index.js

// Importa todas as exportações do módulo firebaseExports.js
import * as Firebase from './firebaseExports.js';
// Importa a função showMessage do módulo utils.js
import { showMessage, getLanguageFromSessionIdString } from './utils.js';

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

// Função para esconder o overlay de carregamento
function hideLoadingOverlay() {
    if (loadingOverlay) {
        console.log("hideLoadingOverlay: Escondendo overlay de carregamento.");
        loadingOverlay.classList.add('hidden'); 
    } else {
        console.warn("hideLoadingOverlay: Elemento loadingOverlay não encontrado.");
    }
}

// Função para carregar as traduções do arquivo JSON
async function loadTranslations(lang) {
    let success = false;
    try {
        const response = await fetch(`data/translations/index_translations.json`); // Caminho ajustado
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data[lang]) {
            pageTranslations = data[lang];
            currentLanguage = lang; 
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
        languageSelectorButtonsContainer.innerHTML = ''; 
        AppConfig.supportedLanguages.forEach(lang => {
            const button = document.createElement('button');
            button.className = `lang-button game-button ${currentLanguage === lang.code ? 'selected' : ''}`;
            button.dataset.langCode = lang.code;
            button.textContent = pageTranslations[`lang_${lang.code.replace('-', '_').toLowerCase()}`] || lang.name; 
            button.addEventListener('click', async () => {
                if (currentLanguage !== lang.code) {
                    console.log(`setupLanguageSelector: Idioma alterado para ${lang.code}`);
                    currentLanguage = lang.code; 
                    await loadTranslations(lang.code); 
                    updateContentLanguage(); 
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
    existingGameUsernameInput = document.getElementById('existingGameUsernameInput');
    sessionInfo = document.getElementById('sessionInfo');
    const goToGameButton = document.getElementById('goToGameButton');

    if (newGameButton) {
        newGameButton.addEventListener('click', async () => {
            showMessage(pageTranslations.creating_session_message || 'Criando nova sessão...', 'info');
            newGameButton.disabled = true;
            accessGameButton.disabled = true;
            console.log("New Game Button: Iniciando criação de nova sessão.");

            try {
                // Certifica-se de que o Firebase está pronto antes de usar
                await Firebase.firebaseInitializedPromise; 
                
                if (!Firebase.db || !Firebase.collection || !Firebase.addDoc) {
                    throw new Error("Firebase Firestore não está totalmente disponível.");
                }

                // Garante que o usuário esteja autenticado e tenha um UID
                if (!Firebase.currentUserId || Firebase.currentUserId === 'anonymous-user') {
                    showMessage("Erro: Usuário não autenticado. Tente novamente.", 'error');
                    newGameButton.disabled = false;
                    accessGameButton.disabled = false;
                    return;
                }

                const sessionsCollectionRef = Firebase.collection(Firebase.db, `artifacts/${Firebase.APP_ID}/public/data/sessions`);

                const newSessionRef = await Firebase.addDoc(sessionsCollectionRef, { 
                    createdAt: Firebase.serverTimestamp(),
                    hostId: Firebase.currentUserId,
                    currentPlayers: [{ id: Firebase.currentUserId, name: existingGameUsernameInput.value.trim() || `Host_${Firebase.currentUserId.substring(0,4)}`, isHost: true }], 
                    gameLanguage: currentLanguage, 
                    status: 'waiting', 
                    currentQuestion: null
                });

                const newSessionDocId = newSessionRef.id; // O ID gerado pelo Firestore
                const sessionShortId = newSessionDocId.substring(0, 4).toUpperCase() + currentLanguage.substring(0,2).toUpperCase(); 

                await Firebase.updateDoc(Firebase.doc(Firebase.db, `artifacts/${Firebase.APP_ID}/public/data/sessions`, newSessionDocId), {
                    shortId: sessionShortId // Salva o shortId no documento
                });

                if (sessionInfo) {
                    document.getElementById('displaySessionId').textContent = sessionShortId;
                    sessionInfo.classList.remove('hidden');
                    showMessage(pageTranslations.session_created_message + sessionShortId, 'success');
                    console.log(`Sessão criada no Firestore com ID: ${newSessionDocId} e Short ID: ${sessionShortId}`);
                }
                newGameButton.disabled = false;
                accessGameButton.disabled = false;

                goToGameButton.onclick = () => {
                    window.location.href = `game.html?session=${newSessionDocId}&lang=${currentLanguage}`; // Passa o ID longo e o idioma
                };

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
            showMessage(pageTranslations.checking_session_message || 'Verificando sessão...', 'info');
            newGameButton.disabled = true;
            accessGameButton.disabled = true;
            const enteredShortSessionId = sessionIdInput.value.trim().toUpperCase(); 

            if (!enteredShortSessionId) {
                showMessage(pageTranslations.error_invalid_session_id || "Por favor, insira um ID de sessão.", 'error');
                newGameButton.disabled = false;
                accessGameButton.disabled = false;
                return;
            }

            const username = existingGameUsernameInput.value.trim(); 
            if (!username) {
                showMessage(pageTranslations.error_empty_username || "Por favor, insira seu nome de usuário.", 'error');
                newGameButton.disabled = false;
                accessGameButton.disabled = false;
                return;
            }

            console.log(`Access Game Button: Tentando acessar sessão com short ID: ${enteredShortSessionId}`);

            try {
                await Firebase.firebaseInitializedPromise; // Certifica-se de que o Firebase está pronto
                
                if (!Firebase.db || !Firebase.query || !Firebase.collection || !Firebase.where || !Firebase.getDocs) {
                    throw new Error("Firebase Firestore não está totalmente disponível.");
                }

                // Garante que o usuário esteja autenticado e tenha um UID
                if (!Firebase.currentUserId || Firebase.currentUserId === 'anonymous-user') {
                    showMessage("Erro: Usuário não autenticado. Tente novamente.", 'error');
                    newGameButton.disabled = false;
                    accessGameButton.disabled = false;
                    return;
                }

                const sessionsCollectionRef = Firebase.collection(Firebase.db, `artifacts/${Firebase.APP_ID}/public/data/sessions`);
                const q = Firebase.query(sessionsCollectionRef, Firebase.where('shortId', '==', enteredShortSessionId));
                const querySnapshot = await Firebase.getDocs(q);

                let sessionDoc = null;
                let sessionId = null;
                let sessionLanguage = AppConfig.defaultLanguage; 

                if (!querySnapshot.empty) {
                    sessionDoc = querySnapshot.docs[0];
                    sessionId = sessionDoc.id;
                    const sessionData = sessionDoc.data();
                    sessionLanguage = sessionData.gameLanguage || AppConfig.defaultLanguage;

                    // Adicionar/Atualizar jogador na sessão
                    const playerDocRef = Firebase.doc(Firebase.db, `artifacts/${Firebase.APP_ID}/public/data/sessions/${sessionId}/players`, Firebase.currentUserId);
                    await Firebase.setDoc(playerDocRef, {
                        uid: Firebase.currentUserId,
                        name: username,
                        score: sessionData.currentPlayers?.find(p => p.id === Firebase.currentUserId)?.score || 0, // Mantém a pontuação se já existia
                        lastActive: Firebase.serverTimestamp(),
                        status: "connected"
                    }, { merge: true });

                    // Adiciona o currentUserId ao array currentPlayers na sessão principal se ainda não estiver lá
                    await Firebase.updateDoc(Firebase.doc(Firebase.db, `artifacts/${Firebase.APP_ID}/public/data/sessions`, sessionId), {
                        currentPlayers: Firebase.arrayUnion(Firebase.currentUserId)
                    });

                    showMessage(pageTranslations.session_found_message || 'Sessão encontrada!', 'success');
                    console.log(`Entrando na sessão ${sessionId}.`);
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

// Inicializa a lógica da página após o carregamento completo do DOM
async function initPageLogic() {
    console.log("initPageLogic: Iniciando...");

    // Obter referências aos elementos DOM
    mainContentContainer = document.getElementById('main-content-container');
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    existingGameUsernameInput = document.getElementById('existingGameUsernameInput');
    messageBox = document.getElementById('messageBox');
    sessionInfo = document.getElementById('sessionInfo');
    languageSelectorButtonsContainer = document.getElementById('languageSelectorButtons');

    if (!mainContentContainer || !newGameButton || !accessGameButton || !sessionIdInput || !existingGameUsernameInput || !messageBox || !sessionInfo || !languageSelectorButtonsContainer) {
        console.error("initPageLogic: Um ou mais elementos DOM essenciais não foram encontrados.");
        // Exibir um erro visível ao usuário se elementos críticos estiverem faltando
        if (mainContentContainer) {
            mainContentContainer.innerHTML = `<p class="text-red-600 text-center">Erro: A página não pôde carregar completamente. Elementos essenciais faltando.</p>`;
            mainContentContainer.style.opacity = '1';
            mainContentContainer.style.visibility = 'visible';
        }
        return; 
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
    hideLoadingOverlay();

    // Torna o conteúdo principal visível
    mainContentContainer.style.opacity = '1';
    mainContentContainer.style.visibility = 'visible';

    console.log("initPageLogic: Finalizado. Conteúdo principal visível.");
}

// Listener principal DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded disparado. Iniciando inicialização da página...");
    await initPageLogic(); // Começa a inicialização da página
});
