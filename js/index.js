// js/index.js

// Idioma padrão lido do arquivo de configuração
let currentLanguage = AppConfig.defaultLanguage; 
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

// Elementos DOM (serão atribuídos em initPageLogic)
let newGameButton;
let accessGameButton;
let sessionIdInput; // Input para o ID da sessão
let accessPlayerNameInput; // Campo para o nome do jogador ao acessar (usado para novo e existente)
let messageBox; 
let sessionInfo; 
let displayCreatedSessionId; // Elemento para exibir o ID da sessão criada
let mainContentContainer; 
let languageSelectorButtonsContainer; 
let langPtBrButton;
let langEnUsButton;
let langEsEsButton;
// Removido: copySessionIdButton; 

// Função para mostrar mensagens na tela
function showMessage(message, type = 'info') {
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`; 
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
            throw new Error(`Erro de rede ou arquivo não encontrado: ${response.status} ${response.statusText}`);
        }
        const allTranslations = await response.json();
        
        if (!allTranslations[lang]) {
            console.warn(`Idioma '${lang}' não encontrado no arquivo de traduções. Usando pt-BR como fallback.`);
            pageTranslations = allTranslations['pt-BR']; 
            currentLanguage = 'pt-BR'; // Define o idioma atual como o fallback
        } else {
            pageTranslations = allTranslations[lang];
            currentLanguage = lang; 
        }
        document.documentElement.lang = currentLanguage; 
        applyTranslations(); 

        console.log(`Traduções para ${currentLanguage} carregadas com sucesso.`);
        success = true;
    } catch (error) {
        console.error("Erro ao carregar ou aplicar traduções:", error);
        showMessage("Erro ao carregar as traduções da página. Por favor, recarregue.", 'error');
    }
    return success;
}

// Função para aplicar as traduções nos elementos da página
function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.dataset.langKey;
        if (pageTranslations[key]) {
            element.textContent = pageTranslations[key];
        }
    });

    // Atualiza placeholders manualmente
    if (accessPlayerNameInput) accessPlayerNameInput.placeholder = pageTranslations.input_player_name_placeholder || "Seu nome de identificação (Ex: João)";
    if (sessionIdInput) sessionIdInput.placeholder = pageTranslations.input_session_placeholder || "Digite o ID da Sessão (Ex: 1234)";
}

// Função para definir o idioma
async function setLanguage(lang) {
    hideMessage();
    currentLanguage = lang;
    document.documentElement.lang = currentLanguage; // Atualiza o atributo lang do <html>
    await loadTranslations(currentLanguage); // Recarrega e aplica as traduções
    
    // Remove a classe 'selected' de todos os botões de idioma
    document.querySelectorAll('.lang-button').forEach(button => {
        button.classList.remove('selected');
    });

    // Adiciona a classe 'selected' ao botão do idioma atual
    let selectedButtonElement = null;
    if (lang === 'pt-BR') selectedButtonElement = langPtBrButton;
    else if (lang === 'en-US') selectedButtonElement = langEnUsButton;
    else if (lang === 'es-ES') selectedButtonElement = langEsEsButton;
    
    if (selectedButtonElement) {
        selectedButtonElement.classList.add('selected');
        console.log('Botão de idioma selecionado:', selectedButtonElement.id);
    } else {
        console.error(`Elemento para idioma '${lang}' não encontrado. Não foi possível adicionar a classe 'selected'.`);
    }
}

// Função para gerar um ID de sessão de 4 dígitos numéricos
function generateSessionId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Função para criar uma nova sessão
async function createNewSession() {
    hideMessage();
    newGameButton.disabled = true; // Desabilita o botão para evitar cliques múltiplos

    if (!window.db || !window.auth || !window.currentUserId) {
        showMessage(pageTranslations.error_firebase_init || "Erro: Firebase não inicializado ou usuário não autenticado. Verifique a configuração.", 'error');
        newGameButton.disabled = false;
        return;
    }

    showMessage(pageTranslations.creating_session_message || "Criando nova sessão...", 'info');

    let newSessionId = generateSessionId();
    const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);

    try {
        const docSnap = await window.firestore.getDoc(sessionDocRef);
        if (docSnap.exists()) {
            // Se o ID já existir, tenta gerar outro
            console.warn(`ID de sessão ${newSessionId} já existe, tentando outro.`);
            newSessionId = generateSessionId(); 
            const newSessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);
            const newDocSnap = await window.firestore.getDoc(newSessionDocRef);
            if (newDocSnap.exists()) {
                showMessage(pageTranslations.error_session_id_collision || "Não foi possível gerar um ID de sessão único. Por favor, tente novamente.", 'error');
                newGameButton.disabled = false;
                return;
            }
        }

        // Cria a nova sessão (sem adicionar o jogador ainda)
        await window.firestore.setDoc(sessionDocRef, {
            createdAt: window.firestore.serverTimestamp(),
            language: currentLanguage,
            currentPlayers: [], // Inicia com array vazio de jogadores
            status: 'waiting'
        });

        console.log(`Nova sessão criada com ID: ${newSessionId}`);
        showMessage(pageTranslations.session_created_message + newSessionId, 'success');
        
        // Preenche o campo de ID e exibe a seção de informações da sessão
        if (displayCreatedSessionId) {
            displayCreatedSessionId.textContent = newSessionId;
        }
        if (sessionIdInput) {
            sessionIdInput.value = newSessionId; // Preenche o input de ID da sessão
        }
        if (accessPlayerNameInput) {
            accessPlayerNameInput.value = ''; // Limpa o campo de nome para o usuário digitar
        }
        if (sessionInfo) {
            sessionInfo.classList.remove('hidden'); // Mostra a seção que contém o input de ID e nome
        }
        
        newGameButton.disabled = false; // Reabilita o botão "Novo Jogo"

    } catch (error) {
        console.error("Erro ao criar nova sessão no Firestore:", error);
        showMessage(pageTranslations.error_creating_session + `: ${error.message}`, 'error');
        newGameButton.disabled = false;
    }
}

// Função para acessar uma sessão existente (agora também usada para recém-criada)
async function accessExistingSession() {
    hideMessage();
    accessGameButton.disabled = true; // Desabilita o botão para evitar cliques múltiplos

    if (!window.db || !window.auth || !window.currentUserId) {
        showMessage(pageTranslations.error_firebase_init || "Erro: Firebase não inicializado ou usuário não autenticado. Verifique a configuração.", 'error');
        accessGameButton.disabled = false;
        return;
    }

    const enteredSessionId = sessionIdInput.value.trim();
    const enteredPlayerName = accessPlayerNameInput.value.trim();

    // Validação do ID da sessão: 4 dígitos numéricos
    if (!/^\d{4}$/.test(enteredSessionId)) {
        showMessage(pageTranslations.error_invalid_session_id || "Por favor, digite um ID de sessão válido (4 dígitos numéricos).", 'error');
        accessGameButton.disabled = false;
        return;
    }

    if (!enteredPlayerName) {
        showMessage(pageTranslations.error_player_name_required || "Por favor, digite seu nome para acessar o jogo.", 'error');
        accessGameButton.disabled = false;
        return;
    }

    showMessage(pageTranslations.accessing_session_message || `Acessando sessão ${enteredSessionId}...`, 'info');

    const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, enteredSessionId);

    try {
        const docSnap = await window.firestore.getDoc(sessionDocRef);
        if (docSnap.exists()) {
            const sessionData = docSnap.data();
            const sessionLanguage = sessionData.language || AppConfig.defaultLanguage; 
            
            // Adiciona o jogador à lista de jogadores da sessão no Firestore
            const players = sessionData.currentPlayers || [];
            const playerExists = players.some(player => player.userId === window.currentUserId);

            if (!playerExists) {
                await window.firestore.updateDoc(sessionDocRef, {
                    currentPlayers: window.firestore.arrayUnion({ userId: window.currentUserId, name: enteredPlayerName, joinedAt: new Date() }) 
                });
                console.log(`Usuário ${window.currentUserId} (${enteredPlayerName}) adicionado à sessão ${enteredSessionId}.`);
            } else {
                console.log(`Usuário ${window.currentUserId} já está na sessão ${enteredSessionId}.`);
                // Opcional: Atualizar o nome do jogador se ele mudou
                const playerIndex = players.findIndex(player => player.userId === window.currentUserId);
                if (playerIndex > -1 && players[playerIndex].name !== enteredPlayerName) {
                    players[playerIndex].name = enteredPlayerName;
                    await window.firestore.updateDoc(sessionDocRef, { currentPlayers: players });
                    console.log(`Nome do usuário ${window.currentUserId} atualizado para ${enteredPlayerName}.`);
                }
            }

            showMessage(pageTranslations.joining_session_message || `Entrando na sessão ${enteredSessionId}...`, 'success');
            console.log(`Entrando na sessão ${enteredSessionId}.`);
            // Redireciona para a página do jogo com o ID da sessão e o idioma da sessão
            window.location.href = `game.html?session=${enteredSessionId}&lang=${sessionLanguage}&playerName=${encodeURIComponent(enteredPlayerName)}`;
        } else {
            showMessage(pageTranslations.session_not_found_error || `Sessão "${enteredSessionId}" não encontrada.`, 'error');
            accessGameButton.disabled = false;
        }
    } catch (error) {
        console.error("Erro ao verificar ou acessar sessão no Firestore:", error);
        showMessage(pageTranslations.error_checking_session + `: ${error.message}`, 'error');
        accessGameButton.disabled = false;
    }
}

// Removido: copySessionIdToClipboard
// Função para copiar o ID da sessão para a área de transferência
// function copySessionIdToClipboard() { /* ... */ }

// Inicializa a lógica da página (chamada após o Firebase ser inicializado)
async function initPageLogic() {
    // Atribui as referências dos elementos DOM aqui
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    accessPlayerNameInput = document.getElementById('accessPlayerNameInput');
    messageBox = document.getElementById('messageBox');
    sessionInfo = document.getElementById('sessionInfo');
    displayCreatedSessionId = document.getElementById('displayCreatedSessionId');
    mainContentContainer = document.getElementById('main-content-container');
    languageSelectorButtonsContainer = document.getElementById('languageSelectorButtonsContainer');
    langPtBrButton = document.getElementById('langPtBrButton');
    langEnUsButton = document.getElementById('langEnUsButton');
    langEsEsButton = document.getElementById('langEsEsButton');
    // Removido: copySessionIdButton = document.getElementById('copySessionIdButton');

    // Adiciona event listeners
    if (newGameButton) newGameButton.addEventListener('click', createNewSession);
    if (accessGameButton) accessGameButton.addEventListener('click', accessExistingSession);
    
    // Adiciona listeners para os botões de idioma
    if (langPtBrButton) langPtBrButton.addEventListener('click', () => setLanguage('pt-BR'));
    if (langEnUsButton) langEnUsButton.addEventListener('click', () => setLanguage('en-US'));
    if (langEsEsButton) langEsEsButton.addEventListener('click', () => setLanguage('es-ES'));

    // Removido: if (copySessionIdButton) copySessionIdButton.addEventListener('click', copySessionIdToClipboard);

    // Define o idioma padrão e carrega as traduções (AppConfig.defaultLanguage já está disponível)
    // Isso garante que o botão do idioma padrão seja selecionado na inicialização
    await setLanguage(AppConfig.defaultLanguage); 
    console.log('Página carregada. setLanguage() inicial chamado com o idioma padrão.');

    // Remove o overlay de carregamento
    if (mainContentContainer) {
        mainContentContainer.style.opacity = '1';
        mainContentContainer.style.visibility = 'visible';
    } else {
        console.warn('mainContentContainer não encontrado. A transição de visibilidade não será aplicada.');
    }

    // Garante que a seção de informações da sessão esteja oculta ao carregar a página
    // Será exibida apenas após "Iniciar Novo Jogo" ou quando necessário.
    if (sessionInfo) {
        sessionInfo.classList.add('hidden');
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
