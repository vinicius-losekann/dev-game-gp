// js/index.js

// Importa funções utilitárias de 'utils.js'
import { showMessage, getQueryParams } from './utils.js';

// Variáveis de estado
let currentLanguage = window.AppConfig.defaultLanguage; // Idioma padrão lido do arquivo de configuração
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

// Referências aos elementos DOM
const languageSelect = document.getElementById('languageSelect');
const sessionIdInput = document.getElementById('sessionIdInput');
const createSessionButton = document.getElementById('createSessionButton');
const joinSessionButton = document.getElementById('joinSessionButton');
const mainContentContainer = document.getElementById('main-content-container');

// Estas variáveis serão atribuídas dentro de DOMContentLoaded, após o DOM estar pronto
let langPtBrButton;
let langEnUsButton;
let langEsEsButton;

/**
 * Carrega as traduções do arquivo JSON e atualiza a UI.
 * @param {string} lang - O código do idioma a ser carregado (ex: 'pt-BR').
 */
async function loadTranslations(lang) {
    let success = false;
    try {
        const response = await fetch(`./translations/index_translations.json`); // Caminho atualizado
        if (!response.ok) {
            throw new Error(`Erro de rede ou arquivo não encontrado: ${response.status} ${response.statusText}`);
        }
        const allTranslations = await response.json();
        
        if (!allTranslations[lang]) {
            throw new Error(`Idioma '${lang}' não encontrado no arquivo de traduções.`);
        }

        pageTranslations = allTranslations[lang];
        console.log('Traduções carregadas para', lang, ':', pageTranslations);
        updateUITexts(); // Atualiza os textos da UI imediatamente
        success = true;
    } catch (error) {
        console.error('Falha ao carregar ou processar as traduções:', error);
        // Fallback para traduções básicas em caso de erro
        pageTranslations = {
            main_title: "Project Management Game (Load Error)",
            main_page_title: "Project Management Game (Load Error)",
            description_text: "An error occurred while loading content. Please reload the page.",
            button_new_game: "Error",
            access_game_title: "Error",
            input_session_placeholder: "Error",
            button_access_game: "Error",
            error_invalid_session_id: "Error: Invalid ID.",
            language_select_title: "Language (Error)",
            session_created_message: "Error creating session: ",
            session_id_prompt: "Please try again."
        };
        updateUITexts(); // Atualiza os textos da UI com os fallbacks
    } finally {
        // Habilita os botões de ação após tentar carregar as traduções
        createSessionButton.disabled = false;
        joinSessionButton.disabled = sessionIdInput.value.trim() === '';
        
        // MOSTRA o contêiner principal com opacity e visibility para evitar FOUC
        if (mainContentContainer) {
            mainContentContainer.style.opacity = '1';
            mainContentContainer.style.visibility = 'visible';
            console.log('mainContentContainer definido para opacity: 1; visibility: visible;');
        }
    }
}

/**
 * Atualiza os textos da interface do usuário com base nas traduções carregadas.
 */
function updateUITexts() {
    const isTranslationsLoaded = Object.keys(pageTranslations).length > 0 && pageTranslations.main_title;

    // Atualiza o título da página
    document.title = isTranslationsLoaded ? pageTranslations.main_page_title : "Project Management Game";

    // Atualiza todos os elementos com data-lang-key
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (isTranslationsLoaded && pageTranslations[key]) {
            // Usa innerHTML para campos que podem conter negrito, etc.
            element.innerHTML = pageTranslations[key];
        }
    });

    // Elementos específicos que não usam data-lang-key (ou que precisam de tratamento especial)
    if (sessionIdInput) {
        sessionIdInput.placeholder = isTranslationsLoaded ? pageTranslations.input_session_placeholder : "Enter Session ID";
    }

    const sessionInfoElement = document.getElementById('sessionInfo'); // Referência ao elemento de info de sessão
    if (sessionInfoElement && !sessionInfoElement.classList.contains('hidden')) {
        const currentSessionId = sessionInfoElement.getAttribute('data-session-id');
        if (isTranslationsLoaded && pageTranslations.session_created_message && pageTranslations.session_id_prompt) {
            sessionInfoElement.innerHTML = `${pageTranslations.session_created_message} <span class="font-bold text-teal-700">${currentSessionId}</span>.<br>${pageTranslations.session_id_prompt}`;
        } else {
            sessionInfoElement.innerHTML = `Session created! Your ID is: <span class="font-bold text-teal-700">${currentSessionId}</span>.<br>Enter this ID to access your game.`;
        }
    }
}

/**
 * Gera um ID de sessão com 4 dígitos aleatórios e um sufixo de idioma.
 * Ex: 1234PTBR
 * @param {string} languageCode - O código de idioma (ex: 'pt-BR').
 * @returns {string} O ID de sessão gerado.
 */
function generateSessionIdWithLanguage(languageCode) {
    const randomPart = Math.floor(1000 + Math.random() * 9000); // Gera um número de 4 dígitos
    const langSuffix = languageCode.replace('-', '').toUpperCase(); // Converte 'pt-BR' para 'PTBR'
    return `${randomPart}${langSuffix}`;
}

/**
 * Define o idioma atual do aplicativo e recarrega as traduções.
 * @param {string} lang - O novo código de idioma.
 */
async function setLanguage(lang) {
    currentLanguage = lang;
    document.documentElement.lang = currentLanguage; // Define o atributo lang do HTML

    // Remove a classe 'selected' de todos os botões de idioma
    document.querySelectorAll('.language-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Adiciona a classe 'selected' ao botão do idioma escolhido
    let selectedButtonElement = null;
    if (lang === 'pt-BR') selectedButtonElement = langPtBrButton;
    else if (lang === 'en-US') selectedButtonElement = langEnUsButton;
    else if (lang === 'es-ES') selectedButtonElement = langEsEsButton;
    
    if (selectedButtonElement) {
        selectedButtonElement.classList.add('selected');
    } else {
        console.error(`Elemento para idioma '${lang}' não encontrado. Não foi possível adicionar a classe 'selected'.`);
    }
    
    // Desabilita os botões de ação enquanto carrega as traduções
    createSessionButton.disabled = true;
    joinSessionButton.disabled = true;

    await loadTranslations(currentLanguage); // Carrega as traduções para o novo idioma
}

// ===========================================
// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO DA PÁGINA
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
    // Atribui as referências dos botões de idioma após o DOM estar carregado
    langPtBrButton = document.getElementById('langPtBrButton');
    langEnUsButton = document.getElementById('langEnUsButton');
    langEsEsButton = document.getElementById('langEsEsButton');

    // Adiciona event listeners aos botões de idioma
    if (langPtBrButton) langPtBrButton.addEventListener('click', () => setLanguage('pt-BR'));
    if (langEnUsButton) langEnUsButton.addEventListener('click', () => setLanguage('en-US'));
    if (langEsEsButton) langEsEsButton.addEventListener('click', () => setLanguage('es-ES'));

    // Habilita/desabilita o botão "Entrar na Sessão" com base no input
    if (sessionIdInput) {
        sessionIdInput.addEventListener('input', () => {
            joinSessionButton.disabled = sessionIdInput.value.trim() === '';
        });
    }

    // Event listener para o botão "Criar Nova Sessão"
    if (createSessionButton) {
        createSessionButton.addEventListener('click', async () => {
            createSessionButton.disabled = true;
            joinSessionButton.disabled = true;
            showMessage('Criando nova sessão...', 'info');

            // Garante que o Firebase está pronto antes de interagir com ele
            await window.firebaseInitializedPromise;

            // Verifica se o Firebase e a autenticação estão prontos.
            if (!window.db || !window.auth.currentUser || !window.appId) {
                showMessage('Erro: Firebase não inicializado ou usuário não autenticado. Verifique a configuração.', 'error');
                createSessionButton.disabled = false;
                joinSessionButton.disabled = sessionIdInput.value.trim() === '';
                return;
            }

            const selectedLanguage = languageSelect ? languageSelect.value : window.AppConfig.defaultLanguage;
            const newSessionId = generateSessionIdWithLanguage(selectedLanguage);
            
            // Caminho da coleção conforme as regras do Firestore: artifacts/{appId}/public/data/sessions
            const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);

            try {
                // Tenta criar o documento da sessão
                await window.firestore.setDoc(sessionDocRef, {
                    createdAt: window.firestore.serverTimestamp(), // Usa o timestamp do servidor para a criação.
                    hostUserId: window.auth.currentUser.uid,
                    language: selectedLanguage, // Salva o idioma na sessão
                    status: 'active', // 'active', 'completed', 'archived'
                    currentPlayers: [], // Inicia com array vazio de jogadores.
                    currentQuestion: null // Nenhuma pergunta ativa no início.
                });
                showMessage(pageTranslations.session_created_message + newSessionId + '. ' + pageTranslations.session_id_prompt, 'success');
                console.log(`Sessão ${newSessionId} criada no Firestore.`);

                // Redireciona para a página do jogo com o novo ID da sessão e idioma.
                window.location.href = `game.html?session=${newSessionId}&lang=${selectedLanguage}`;

            } catch (error) {
                console.error("Erro ao criar sessão no Firestore:", error);
                showMessage(`Erro ao criar sessão: ${error.message}`, 'error');
                createSessionButton.disabled = false;
                joinSessionButton.disabled = sessionIdInput.value.trim() === '';
            }
        });
    }

    // Event listener para o botão "Entrar na Sessão"
    if (joinSessionButton) {
        joinSessionButton.addEventListener('click', async () => {
            const enteredSessionId = sessionIdInput.value.trim();
            if (!enteredSessionId) {
                showMessage(pageTranslations.error_invalid_session_id || 'Please enter a session ID.', 'warning');
                return;
            }

            createSessionButton.disabled = true;
            joinSessionButton.disabled = true;
            showMessage('Entrando na sessão...', 'info');

            await window.firebaseInitializedPromise; // Garante que o Firebase está pronto

            if (!window.db || !window.auth.currentUser || !window.appId) {
                showMessage('Erro: Firebase não inicializado ou usuário não autenticado. Verifique a configuração.', 'error');
                createSessionButton.disabled = false;
                joinSessionButton.disabled = sessionIdInput.value.trim() === '';
                return;
            }

            // Caminho da coleção conforme as regras do Firestore: artifacts/{appId}/public/data/sessions
            const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, enteredSessionId);

            try {
                const docSnap = await window.firestore.getDoc(sessionDocRef);
                if (docSnap.exists()) {
                    const sessionData = docSnap.data();
                    const sessionLanguage = sessionData.language || window.AppConfig.defaultLanguage; // Pega o idioma da sessão existente
                    showMessage(`Entrando na sessão ${enteredSessionId}...`, 'success');
                    console.log(`Entrando na sessão ${enteredSessionId}.`);
                    // Redireciona para a página do jogo com o ID da sessão e o idioma da sessão
                    window.location.href = `game.html?session=${enteredSessionId}&lang=${sessionLanguage}`;
                } else {
                    showMessage(pageTranslations.error_invalid_session_id || `Session "${enteredSessionId}" not found.`, 'error');
                    createSessionButton.disabled = false;
                    joinSessionButton.disabled = false;
                }
            } catch (error) {
                console.error("Erro ao verificar sessão no Firestore:", error);
                showMessage(`Erro ao verificar sessão: ${error.message}`, 'error');
                createSessionButton.disabled = false;
                joinSessionButton.disabled = false;
            }
        });
    }

    // Define o idioma inicial e carrega as traduções quando o DOM estiver pronto
    setLanguage(window.AppConfig.defaultLanguage);
    console.log('Página carregada. setLanguage() inicial chamado com o idioma padrão do config.');
});
