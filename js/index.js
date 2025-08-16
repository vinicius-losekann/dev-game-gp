// js/index.js

// Idioma padrão lido do arquivo de configuração
let currentLanguage = AppConfig.defaultLanguage;
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

let newGameButton;
let accessGameButton;
let sessionIdInput;
let usernameInput; // Adicionado: Referência ao campo de nome de usuário
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

        pageTranslations = allTranslations[lang]; // Armazena as traduções para o idioma selecionado
        applyTranslations(); // Aplica as traduções aos elementos HTML
        success = true;
        console.log(`Traduções para ${lang} carregadas com sucesso.`);
    } catch (error) {
        console.error("Erro ao carregar ou processar traduções:", error);
        showMessage(`Erro ao carregar traduções: ${error.message}`, 'error');
    }
    return success;
}

// Função para aplicar as traduções aos elementos HTML
function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (pageTranslations[key]) {
            // Para inputs, use o atributo placeholder
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = pageTranslations[key];
            } else {
                element.textContent = pageTranslations[key];
            }
        }
    });
    // Atualiza o placeholder do campo de nome de usuário
    if (usernameInput && pageTranslations.input_username_placeholder) {
        usernameInput.placeholder = pageTranslations.input_username_placeholder;
    }
}

// Função para definir o idioma
async function setLanguage(lang) {
    currentLanguage = lang;
    document.documentElement.lang = currentLanguage; // Define o atributo lang da tag <html>

    // Salva o idioma preferido do usuário no localStorage
    localStorage.setItem('preferredLanguage', lang);

    // Carrega e aplica as novas traduções
    const translationsLoaded = await loadTranslations(currentLanguage);

    // Atualiza a seleção visual dos botões de idioma
    updateLanguageButtonsSelection();

    // Mostra o conteúdo principal após o carregamento inicial (se ainda não estiver visível)
    if (mainContentContainer && mainContentContainer.style.opacity === '0') {
        mainContentContainer.style.opacity = '1';
        mainContentContainer.style.visibility = 'visible';
    }
}

// NOVO: Função para atualizar a seleção visual dos botões de idioma
function updateLanguageButtonsSelection() {
    // Remove a classe 'selected' de todos os botões de idioma
    document.querySelectorAll('.lang-button').forEach(button => {
        button.classList.remove('selected');
    });
    // Adiciona a classe 'selected' ao botão do idioma atual
    const selectedButton = document.querySelector(`.lang-button[data-lang-code="${currentLanguage}"]`);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
}

// NOVO: Função para gerar dinamicamente os botões de seleção de idioma
function createLanguageButtons() {
    if (languageSelectorButtonsContainer && AppConfig.supportedLanguages) {
        languageSelectorButtonsContainer.innerHTML = ''; // Limpa os botões existentes
        AppConfig.supportedLanguages.forEach(lang => {
            const button = document.createElement('button');
            button.type = 'button';
            button.id = `lang${lang.code.replace('-', '')}Button`; // Ex: langPtBRButton
            button.className = `game-button lang-button py-2 px-4 rounded-lg font-semibold`;
            button.setAttribute('data-lang-key', `lang_${lang.code.toLowerCase().replace('-', '_')}`); // lang_pt_br
            button.setAttribute('data-lang-code', lang.code); // pt-BR
            button.textContent = lang.name; // Texto inicial, será substituído pelas traduções

            button.addEventListener('click', () => setLanguage(lang.code));
            languageSelectorButtonsContainer.appendChild(button);
        });
        updateLanguageButtonsSelection(); // Define o botão inicialmente selecionado
    }
}


// Função para inicializar a lógica da página e adicionar event listeners
async function initPageLogic() {
    // Obtenha referências aos elementos DOM
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    usernameInput = document.getElementById('usernameInput'); // Obtenha a referência ao campo de nome de usuário
    messageBox = document.getElementById('messageBox');
    sessionInfo = document.getElementById('sessionInfo');
    mainContentContainer = document.getElementById('main-content-container');
    languageSelectorButtonsContainer = document.getElementById('languageSelectorButtonsContainer');

    // Recupera o idioma preferido do localStorage, se existir
    const preferredLanguage = localStorage.getItem('preferredLanguage');
    if (preferredLanguage && AppConfig.supportedLanguages.some(lang => lang.code === preferredLanguage)) {
        currentLanguage = preferredLanguage;
    } else {
        currentLanguage = AppConfig.defaultLanguage;
    }

    // Cria os botões de idioma dinamicamente antes de carregar as traduções
    createLanguageButtons();

    // Define o idioma e carrega as traduções iniciais
    await setLanguage(currentLanguage);


    if (newGameButton) {
        newGameButton.addEventListener('click', async () => {
            showMessage(pageTranslations.creating_session_message || 'Criando nova sessão...', 'info');
            newGameButton.disabled = true;
            accessGameButton.disabled = true;

            try {
                // Obtenha a referência da coleção 'sessions'
                // Caminho da coleção conforme as regras do Firestore: artifacts/{appId}/public/data/sessions
                const sessionsCollectionRef = window.firestore.collection(window.db, `artifacts/${window.appId}/public/data/sessions`);

                // Gera um ID de sessão de 4 dígitos aleatórios e a sigla do idioma
                let newSessionId;
                let isUnique = false;
                let attempts = 0;
                while (!isUnique && attempts < 10) { // Tenta algumas vezes para garantir unicidade
                    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 dígitos
                    newSessionId = `${randomDigits}${currentLanguage.substring(0,2).toUpperCase()}`; // Ex: 1234PT
                    const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);
                    const docSnap = await window.firestore.getDoc(sessionDocRef);
                    if (!docSnap.exists()) {
                        isUnique = true;
                    }
                    attempts++;
                }

                if (!isUnique) {
                    throw new Error("Não foi possível gerar um ID de sessão único após várias tentativas.");
                }

                const sessionData = {
                    createdAt: window.firestore.serverTimestamp(),
                    language: currentLanguage, // Salva o idioma da sessão
                    currentPlayers: [], // Inicializa com uma lista vazia de jogadores
                    // Adicione outras propriedades iniciais da sessão aqui, se necessário
                };

                const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);
                await window.firestore.setDoc(sessionDocRef, sessionData);

                // Mostra o ID da sessão para o usuário
                sessionInfo.innerHTML = `${pageTranslations.session_created_message || 'Sessão criada! Seu ID é:'} <span class="font-bold text-blue-700">${newSessionId}</span>. <br> ${pageTranslations.session_id_prompt || 'Insira este ID para acessar seu jogo.'}`;
                sessionInfo.classList.remove('hidden');
                showMessage('', 'hidden'); // Limpa a mensagem de "Criando sessão..."

                console.log(`Nova sessão criada com ID: ${newSessionId}`);
                // Opcional: Redirecionar automaticamente para a página do jogo após um pequeno atraso
                // setTimeout(() => {
                //     window.location.href = `game.html?session=${newSessionId}&lang=${currentLanguage}`;
                // }, 3000);

            } catch (error) {
                console.error("Erro ao criar sessão no Firestore:", error);
                showMessage(pageTranslations.error_creating_session + ` ${error.message}`, 'error');
            } finally {
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
            const enteredUsername = usernameInput.value.trim(); // Pega o nome de usuário

            // Validação simples do ID da sessão (4 dígitos + 2 letras do idioma) e do nome de usuário
            const sessionIdPattern = /^\d{4}[A-Z]{2}$/;
            if (!sessionIdPattern.test(enteredSessionId)) {
                showMessage(pageTranslations.error_invalid_session_id || "Por favor, digite um ID de sessão válido (Ex: 1234PTBR).", 'error');
                return;
            }
            if (!enteredUsername) {
                showMessage(pageTranslations.error_empty_username || "Por favor, digite seu nome de usuário.", 'error');
                return;
            }


            showMessage(pageTranslations.accessing_session_message || `Acessando sessão ${enteredSessionId}...`, 'info');
            newGameButton.disabled = true;
            accessGameButton.disabled = true;

            // Caminho da coleção conforme as regras do Firestore: artifacts/{appId}/public/data/sessions
            const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, enteredSessionId);

            try {
                const docSnap = await window.firestore.getDoc(sessionDocRef);
                if (docSnap.exists()) {
                    const sessionData = docSnap.data();
                    const sessionLanguage = sessionData.language || 'pt-BR'; // Pega o idioma da sessão existente

                    // Adiciona o jogador à lista currentPlayers da sessão
                    const playerToAdd = { userId: window.currentUserId, username: enteredUsername };
                    // Verifica se o usuário já está na lista
                    if (!sessionData.currentPlayers.some(player => player.userId === window.currentUserId)) {
                        await window.firestore.updateDoc(sessionDocRef, {
                            currentPlayers: window.firestore.arrayUnion(playerToAdd)
                        });
                        console.log(`Usuário ${window.currentUserId} (${enteredUsername}) adicionado à sessão.`);
                    } else {
                        console.log(`Usuário ${window.currentUserId} (${enteredUsername}) já está na sessão.`);
                    }

                    showMessage(pageTranslations.entering_session_message || `Entrando na sessão ${enteredSessionId}...`, 'success');
                    console.log(`Entrando na sessão ${enteredSessionId}.`);
                    // Redireciona para a página do jogo com o ID da sessão e o idioma da sessão
                    window.location.href = `game.html?session=${enteredSessionId}&lang=${sessionLanguage}`;
                } else {
                    showMessage(pageTranslations.session_not_found_error || `Sessão \"${enteredSessionId}\" não encontrada.`, 'error');
                }
            } catch (error) {
                console.error("Erro ao verificar sessão no Firestore:", error);
                showMessage(pageTranslations.error_checking_session + `: ${error.message}`, 'error');
            } finally {
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
