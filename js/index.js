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
        applyTranslations();
        success = true;
        console.log(`Traduções para ${lang} carregadas com sucesso.`);
    } catch (error) {
        console.error("Erro ao carregar traduções:", error);
        showMessage(`Erro ao carregar traduções para ${lang}: ${error.message}`, 'error');
    }
    return success;
}

// Função para aplicar as traduções aos elementos HTML
function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (pageTranslations[key]) {
            // Especialmente para placeholders de input
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.setAttribute('placeholder', pageTranslations[key]);
            } else {
                element.textContent = pageTranslations[key];
            }
        }
    });
    // Atualiza o título da página
    document.title = pageTranslations.main_page_title || "Jogo de Gerenciamento de Projetos";
}

// Função para definir o idioma
async function setLanguage(lang) {
    // Valida se o idioma é suportado antes de tentar carregá-lo
    const supported = AppConfig.supportedLanguages.some(l => l.code === lang);
    if (!supported) {
        console.error(`Idioma '${lang}' não é suportado.`);
        showMessage(`Idioma '${lang}' não é suportado. Usando o idioma padrão.`, 'error');
        lang = AppConfig.defaultLanguage; // Volta para o idioma padrão
    }

    currentLanguage = lang;
    document.documentElement.lang = currentLanguage;
    console.log(`Idioma definido para: ${currentLanguage}`);

    // Remove a classe 'selected' de todos os botões de idioma
    document.querySelectorAll('.language-button').forEach(button => {
        button.classList.remove('selected');
    });

    // Adiciona a classe 'selected' ao botão do idioma atual
    const selectedButtonElement = document.getElementById(`lang${lang.replace('-', '')}Button`);
    if (selectedButtonElement) {
        selectedButtonElement.classList.add('selected');
    } else {
        console.warn(`Botão para o idioma ${lang} não encontrado.`);
    }

    // Carrega as novas traduções
    await loadTranslations(currentLanguage);
}


// Função para criar uma nova sessão
async function createNewSession() {
    hideMessage();
    // Desabilita os botões para evitar cliques múltiplos
    newGameButton.disabled = true;
    accessGameButton.disabled = true;

    showMessage(pageTranslations.creating_session_message || 'Criando nova sessão...', 'info');

    // Assegura que o Firebase esteja inicializado e o usuário autenticado
    if (!window.db || !window.auth || !window.currentUserId) {
        showMessage(pageTranslations.error_firebase_init || "Erro: Firebase não inicializado ou usuário não autenticado. Verifique a configuração.", 'error');
        newGameButton.disabled = false;
        accessGameButton.disabled = false;
        return;
    }

    // Gera um ID de sessão de 4 dígitos aleatórios e a inicial com o código do idioma
    let newSessionId;
    let isUnique = false;
    while (!isUnique) {
        const randomNum = Math.floor(1000 + Math.random() * 9000); // Garante 4 dígitos
        newSessionId = `${randomNum}${currentLanguage.substring(0,2).toUpperCase()}${currentLanguage.substring(3,5).toUpperCase()}`; // Ex: 1234PTBR
        const sessionDocRef = firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);
        const docSnap = await firestore.getDoc(sessionDocRef);
        if (!docSnap.exists()) {
            isUnique = true;
        }
    }

    try {
        const sessionDocRef = firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);
        await firestore.setDoc(sessionDocRef, {
            createdAt: firestore.serverTimestamp(),
            hostId: window.currentUserId,
            language: currentLanguage, // Salva o idioma da sessão
            status: 'waiting',
            currentPlayers: [], // Inicializa com uma lista vazia de jogadores
            // Adicione outros campos iniciais da sessão aqui, se necessário
        });
        showMessage(`${pageTranslations.session_created_message || 'Sessão criada! Seu ID é: '}${newSessionId}. ${pageTranslations.session_id_prompt || 'Insira este ID para acessar seu jogo.'}`, 'success');
        console.log(`Sessão ${newSessionId} criada com sucesso.`);

        // Redireciona para a página do jogo com o ID da sessão e o idioma
        window.location.href = `game.html?session=${newSessionId}&lang=${currentLanguage}`;

    } catch (error) {
        console.error("Erro ao criar sessão no Firestore:", error);
        showMessage(`${pageTranslations.error_creating_session || 'Erro ao criar sessão:'} ${error.message}`, 'error');
        newGameButton.disabled = false;
        accessGameButton.disabled = false;
    }
}

// Função para inicializar a lógica da página após o DOM e Firebase estarem prontos
async function initPageLogic() {
    // Atribuições dos elementos DOM após o DOMContentLoaded
    newGameButton = document.getElementById('newGameButton');
    accessGameButton = document.getElementById('accessGameButton');
    sessionIdInput = document.getElementById('sessionIdInput');
    messageBox = document.getElementById('messageBox');
    sessionInfo = document.getElementById('sessionInfo');
    mainContentContainer = document.getElementById('main-content-container');
    languageSelectorButtonsContainer = document.getElementById('languageSelectorButtons');

    // Verifica se os elementos essenciais foram encontrados
    if (!newGameButton || !accessGameButton || !sessionIdInput || !messageBox || !mainContentContainer) {
        console.error("Um ou mais elementos DOM essenciais não foram encontrados. Verifique o HTML.");
        // Não prossegue se os elementos não existirem
        return;
    }

    console.log('Elementos DOM encontrados e atribuídos.');

    // Adiciona listeners para os botões de idioma, criados dinamicamente
    if (languageSelectorButtonsContainer) {
        // Limpa qualquer conteúdo existente para evitar duplicação em caso de re-render
        languageSelectorButtonsContainer.innerHTML = '';
        AppConfig.supportedLanguages.forEach(lang => {
            const button = document.createElement('button');
            button.id = `lang${lang.code.replace('-', '')}Button`;
            button.className = 'language-button game-button bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow';
            button.setAttribute('data-lang-key', `lang_${lang.code.toLowerCase().replace('-', '_')}`); // ex: lang_pt_br
            button.textContent = lang.name; // Inicialmente usa o nome da config
            button.addEventListener('click', () => setLanguage(lang.code));
            languageSelectorButtonsContainer.appendChild(button);
        });
    } else {
        console.warn('Contêiner de seleção de idioma não encontrado.');
    }

    // Define o idioma padrão e carrega as traduções
    await setLanguage(AppConfig.defaultLanguage);

    // Adiciona event listeners aos botões principais
    newGameButton.addEventListener('click', createNewSession);

    if (accessGameButton) {
        accessGameButton.addEventListener('click', async () => {
            hideMessage();
            const enteredSessionId = sessionIdInput.value.trim();

            // Validação simples do ID da sessão (ajuste conforme necessário, pode ser mais robusta)
            // Agora espera um formato como "1234PTBR", "5678ENUS" etc.
            const sessionRegex = /^\d{4}[A-Z]{4}$/;
            if (!sessionRegex.test(enteredSessionId)) {
                showMessage(pageTranslations.error_invalid_session_id || "Por favor, digite um ID de sessão válido (Ex: 1234PTBR).", 'error');
                return;
            }

            // Desabilita os botões para evitar cliques múltiplos
            newGameButton.disabled = true;
            accessGameButton.disabled = true;
            showMessage(`Verificando sessão ${enteredSessionId}...`, 'info');

            // Assegura que o Firebase esteja inicializado e o usuário autenticado
            if (!window.db || !window.auth || !window.currentUserId) {
                showMessage(pageTranslations.error_firebase_init || "Erro: Firebase não inicializado ou usuário não autenticado. Verifique a configuração.", 'error');
                newGameButton.disabled = false;
                accessGameButton.disabled = false;
                return;
            }

            // Caminho da coleção conforme as regras do Firestore: artifacts/{appId}/public/data/sessions
            const sessionDocRef = firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, enteredSessionId);

            try {
                const docSnap = await firestore.getDoc(sessionDocRef);
                if (docSnap.exists()) {
                    const sessionData = docSnap.data();
                    const sessionLanguage = sessionData.language || 'pt-BR'; // Pega o idioma da sessão existente
                    showMessage(pageTranslations.joining_session_message + ` ${enteredSessionId}...`, 'success'); // Usa a tradução
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

    // REMOVENDO O OVERLAY DE CARREGAMENTO E EXIBINDO O CONTEÚDO PRINCIPAL
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden'); // Esconde o overlay
        console.log("Loading overlay escondido.");
    } else {
        console.warn("Elemento 'loadingOverlay' não encontrado.");
    }

    // Agora, exibe o main content container.
    if (mainContentContainer) {
        mainContentContainer.classList.remove('opacity-0', 'invisible');
        mainContentContainer.classList.add('opacity-100', 'visible');
        console.log("main-content-container tornado visível.");
    } else {
        console.error("Elemento 'main-content-container' não encontrado para exibição.");
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
