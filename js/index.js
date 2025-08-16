// js/index.js

// Idioma padrão lido do arquivo de configuração
let currentLanguage = AppConfig.defaultLanguage; 
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

let newGameButton;
let accessGameButton;
let sessionIdInput;
let messageBox; // Referência à caixa de mensagem
let sessionInfo; // Novo elemento para informações da sessão
let mainContentContainer; // Referência ao contêiner principal
let languageSelectorButtonsContainer; // Referência ao contêiner dos botões de idioma

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
        // CORREÇÃO: Usando caminho absoluto a partir da raiz do repositório
        // Isso garante que o navegador sempre procure o arquivo no local esperado,
        // independentemente da localização do script.
        const response = await fetch(`/dev-game-gp/translations/index_translations.json`); 
        if (!response.ok) {
            throw new Error(`Erro de rede ou arquivo não encontrado: ${response.status} ${response.statusText}`);
        }
        const allTranslations = await response.json();
        
        if (!allTranslations[lang]) {
            throw new Error(`Idioma '${lang}' não encontrado no arquivo de traduções.`);
        }

        pageTranslations = allTranslations[lang];
        console.log(`Traduções para '${lang}' carregadas:`, pageTranslations);
        success = true;

        // Aplica as traduções aos elementos HTML
        applyTranslations();

    } catch (error) {
        console.error("Erro ao carregar ou aplicar traduções:", error);
        showMessage(`Erro ao carregar as traduções: ${error.message}`, 'error');
    }
    return success;
}

// Função para aplicar as traduções aos elementos com data-lang-key
function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.dataset.langKey;
        if (pageTranslations[key]) {
            // Verifica se o elemento é um input com placeholder
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = pageTranslations[key];
            } else {
                element.innerHTML = pageTranslations[key];
            }
        }
    });
}

// Função para definir o idioma
async function setLanguage(lang) {
    currentLanguage = lang;
    document.documentElement.lang = currentLanguage; // Define o atributo lang do HTML
    
    // Remove a classe 'selected' de todos os botões e adiciona ao botão clicado
    document.querySelectorAll('.language-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    const selectedButtonElement = document.getElementById(`lang${lang.replace('-', '')}Button`);
    if (selectedButtonElement) {
        selectedButtonElement.classList.add('selected');
        console.log('Botão de idioma selecionado:', selectedButtonElement.id);
    } else {
        console.error(`Elemento para idioma '${lang}' não encontrado. Não foi possível adicionar a classe 'selected'.`);
    }
    
    // Carrega e aplica as novas traduções
    const translationsLoaded = await loadTranslations(currentLanguage);

    if (translationsLoaded) {
        // Habilita os botões principais APENAS se as traduções foram carregadas com sucesso
        if (newGameButton) newGameButton.disabled = false;
        if (accessGameButton) accessGameButton.disabled = false;
        if (mainContentContainer) {
            mainContentContainer.style.opacity = '1';
            mainContentContainer.style.visibility = 'visible';
        }
    } else {
        // Se as traduções não carregaram, mantenha os botões desabilitados ou mostre um erro crítico
        if (newGameButton) newGameButton.disabled = true;
        if (accessGameButton) accessGameButton.disabled = true;
    }
}


// Função para gerar um ID de sessão aleatório
function generateSessionId(length = 4) {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Função para criar os botões de seleção de idioma dinamicamente
function createLanguageButtons() {
    if (!languageSelectorButtonsContainer) {
        console.error("Elemento 'languageSelectorButtonsContainer' não encontrado.");
        return;
    }

    languageSelectorButtonsContainer.innerHTML = ''; // Limpa botões existentes

    // Usa o AppConfig.supportedLanguages para criar os botões
    if (window.AppConfig && window.AppConfig.supportedLanguages) {
        window.AppConfig.supportedLanguages.forEach(lang => {
            const button = document.createElement('button');
            button.id = `lang${lang.code.replace('-', '')}Button`; // langPtBRButton, langEnUSButton, etc.
            button.className = 'language-button'; // Classe Tailwind para estilização
            button.textContent = lang.name;
            button.addEventListener('click', () => setLanguage(lang.code));
            languageSelectorButtonsContainer.appendChild(button);
        });
        console.log("Botões de idioma criados dinamicamente.");

        // Define o idioma padrão após a criação dos botões
        setLanguage(AppConfig.defaultLanguage); // Chama setLanguage para aplicar o idioma padrão
    } else {
        console.error("AppConfig.supportedLanguages não está definido. Verifique config.js.");
    }
}


// Função principal para inicializar a lógica da página
async function initPageLogic() {
    console.log("Iniciando initPageLogic...");

    // Atribua as referências dos elementos DOM aqui, DENTRO do DOMContentLoaded
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    messageBox = document.getElementById('messageBox');
    sessionInfo = document.getElementById('sessionInfo'); 
    mainContentContainer = document.getElementById('main-content-container');
    languageSelectorButtonsContainer = document.getElementById('languageSelectorButtonsContainer'); 

    // Garante que os botões estão inicialmente desabilitados para evitar interações antes do carregamento
    if (newGameButton) newGameButton.disabled = true;
    if (accessGameButton) accessGameButton.disabled = true;
    
    // Oculta o contêiner principal até que as traduções sejam carregadas
    if (mainContentContainer) {
        mainContentContainer.style.opacity = '0';
        mainContentContainer.style.visibility = 'hidden';
    }

    // Cria os botões de seleção de idioma
    createLanguageButtons();

    // Adiciona event listeners para os botões de jogo
    if (newGameButton) {
        newGameButton.addEventListener('click', async () => {
            newGameButton.disabled = true;
            accessGameButton.disabled = true;
            showMessage(pageTranslations.session_creating_message || "Criando nova sessão...", 'info');
            hideMessage(); // Esconde mensagem anterior para mostrar a nova
            
            // Certifique-se de que o Firestore e o userId estão disponíveis
            if (!window.db || !window.currentUserId) {
                showMessage("Erro: Firebase não inicializado corretamente. Tente recarregar a página.", 'error');
                newGameButton.disabled = false;
                accessGameButton.disabled = false;
                return;
            }

            const db = window.db;
            const firestore = window.firestore; // Instância do firestore com funções utilitárias
            const userId = window.currentUserId;

            let newSessionId = generateSessionId();
            // Adiciona o código do idioma ao ID da sessão
            newSessionId += currentLanguage.substring(0, 4).toUpperCase().replace('-', ''); // Ex: 1234PTBR

            // Caminho da coleção conforme as regras do Firestore: artifacts/{appId}/public/data/sessions
            const sessionDocRef = firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);

            try {
                const docSnap = await firestore.getDoc(sessionDocRef);
                if (docSnap.exists()) {
                    showMessage(pageTranslations.session_id_exists_error || "ID de sessão já existe, tentando novamente...", 'error');
                    // Tenta gerar um novo ID se o atual já existe
                    newSessionId = generateSessionId(); 
                    newSessionId += currentLanguage.substring(0, 4).toUpperCase().replace('-', '');
                    showMessage(pageTranslations.session_creating_message || "Criando nova sessão...", 'info'); // Atualiza a mensagem
                }

                await firestore.setDoc(sessionDocRef, {
                    createdAt: firestore.serverTimestamp(),
                    createdBy: userId,
                    language: currentLanguage, // Salva o idioma da sessão
                    currentPlayers: [{ userId: userId, joinedAt: firestore.serverTimestamp() }] // Adiciona o criador como primeiro jogador
                });
                showMessage(pageTranslations.session_created_message + ` ${newSessionId}. ${pageTranslations.session_id_prompt}`, 'success');
                sessionInfo.innerHTML = `<strong>${pageTranslations.session_created_message}</strong> ${newSessionId}.<br>${pageTranslations.session_id_prompt}`;
                sessionInfo.classList.remove('hidden'); // Mostra a info da sessão
                console.log(`Nova sessão criada: ${newSessionId}`);

                // Redireciona para a página do jogo com o ID da sessão e o idioma
                window.location.href = `game.html?session=${newSessionId}&lang=${currentLanguage}`;

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
            const enteredSessionId = sessionIdInput.value.trim();
            if (!enteredSessionId || enteredSessionId.length !== 8 || !/^\d{4}[A-Z]{4}$/.test(enteredSessionId)) {
                showMessage(pageTranslations.error_invalid_session_id || "Por favor, digite um ID de sessão válido (4 dígitos numéricos seguidos de 4 letras do idioma, ex: 1234PTBR).", 'error');
                return;
            }

            newGameButton.disabled = true;
            accessGameButton.disabled = true;
            showMessage(pageTranslations.session_joining_message || "Acessando sessão...", 'info');

            if (!window.db || !window.currentUserId) {
                showMessage("Erro: Firebase não inicializado corretamente. Tente recarregar a página.", 'error');
                newGameButton.disabled = false;
                accessGameButton.disabled = false;
                return;
            }

            const db = window.db;
            const firestore = window.firestore;
            const userId = window.currentUserId;

            // Caminho da coleção conforme as regras do Firestore: artifacts/{appId}/public/data/sessions
            const sessionDocRef = firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, enteredSessionId);

            try {
                const docSnap = await firestore.getDoc(sessionDocRef);
                if (docSnap.exists()) {
                    const sessionData = docSnap.data();
                    const sessionLanguage = sessionData.language || 'pt-BR'; // Pega o idioma da sessão existente
                    
                    // Adiciona o jogador à lista de jogadores na sessão
                    const players = sessionData.currentPlayers || [];
                    const playerExists = players.some(player => player.userId === userId);

                    if (!playerExists) {
                        await firestore.updateDoc(sessionDocRef, {
                            currentPlayers: firestore.arrayUnion({ userId: userId, joinedAt: firestore.serverTimestamp() })
                        });
                        console.log(`Usuário ${userId} adicionado à sessão.`);
                    } else {
                        console.log(`Usuário ${userId} já está na sessão.`);
                    }

                    showMessage(`Entrando na sessão ${enteredSessionId}...`, 'success');
                    console.log(`Entrando na sessão ${enteredSessionId}.`);
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
