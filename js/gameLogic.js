// js/gameLogic.js

let allQuestions = [];
let currentQuestion = null;
let selectedOption = null;
let currentLanguage = AppConfig.defaultLanguage; // AppConfig deve ser definido em config.js
let gameTranslations = {};

// Elementos DOM
const displaySessionIdElement = document.getElementById('displaySessionId');
const playerListElement = document.getElementById('playerList');
const gameAreaSelectorElement = document.getElementById('gameAreaSelector');
const gameCardElement = document.getElementById('gameCard');
const questionAreaElement = document.getElementById('questionArea');
const currentQuestionDisplayElement = document.getElementById('currentQuestionDisplay');
const optionsContainerElement = document.getElementById('optionsContainer');
const answerButton = document.getElementById('answerButton');
const nextCardButton = document.getElementById('nextCardButton');
const feedbackContainer = document.getElementById('feedbackContainer');
const backToHomeButton = document.getElementById('backToHomeButton');
const randomCardButton = document.getElementById('randomCardButton');
const messageBox = document.getElementById('messageBox');
const loadingOverlay = document.getElementById('loadingOverlay');
const gameContainer = document.getElementById('gameContainer');

let currentSessionId = null;
let sessionPlayersUnsubscribe = null; // Para unsubscribing do listener de jogadores
let currentUsername = null; // Definido ao entrar na sessão ou carregar do localStorage

// Função para mostrar mensagens na tela (similar à de index.js, mas para esta página)
function showMessage(message, type = 'info') {
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`;
        messageBox.classList.remove('hidden');
        setTimeout(() => {
            hideMessage();
        }, 5000);
    } else {
        console.warn('Elemento messageBox não encontrado em gameLogic.js.');
    }
}

// Função para esconder a caixa de mensagem
function hideMessage() {
    if (messageBox) {
        messageBox.classList.add('hidden');
        messageBox.textContent = '';
    }
}

// Função para esconder o overlay de carregamento
function hideLoadingOverlay() {
    if (loadingOverlay) {
        console.log("hideLoadingOverlay (gameLogic): Escondendo overlay de carregamento.");
        loadingOverlay.classList.add('hidden');
    }
}

// Função para carregar traduções específicas do jogo
async function loadGameTranslations(lang) {
    try {
        const response = await fetch(`game_translations.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        gameTranslations = data[lang];
        if (!gameTranslations) {
            console.warn(`No translations found for language: ${lang}`);
            gameTranslations = data[AppConfig.defaultLanguage]; // Fallback to default
        }
        console.log(`Traduções do jogo para ${lang} carregadas.`, gameTranslations);
        return true;
    } catch (error) {
        console.error("Erro ao carregar traduções do jogo:", error);
        showMessage("Erro ao carregar traduções do jogo.", 'error');
        return false;
    }
}

// Função para atualizar o conteúdo da página com base no idioma atual
function updateGameContentLanguage() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (gameTranslations[key]) {
            element.textContent = gameTranslations[key];
        } else {
            console.warn(`Chave de tradução "${key}" não encontrada para o idioma "${currentLanguage}" no jogo.`);
        }
    });

    // Atualiza o título da página com o ID da sessão
    const pageTitleElement = document.querySelector('title');
    if (pageTitleElement) {
        const baseTitle = gameTranslations['game_page_base_title'] || 'Jogo de Gerenciamento de Projetos - Sessão';
        pageTitleElement.textContent = `${baseTitle} ${currentSessionId}`;
    }
}

// Redireciona para a página inicial (index.html)
function redirectToHome(reason = '') {
    console.log(`Redirecionando para a página inicial. Razão: ${reason}`);
    window.location.href = `index.html?reason=${reason}`;
}

/**
 * Extrai os parâmetros 'session' e 'lang' da URL atual.
 * @returns {{session: string|null, lang: string|null}} Um objeto contendo os valores dos parâmetros.
 */
function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    const langParam = urlParams.get('lang');
    return {
        session: sessionParam,
        lang: langParam
    };
}


// Função para carregar perguntas do Firestore
async function loadQuestions() {
    try {
        const db = window.db;
        const appId = window.appId;
        if (!db || !appId) {
            throw new Error("Firestore ou AppId não estão inicializados.");
        }
        const questionsColRef = window.firestore.collection(db, `artifacts/${appId}/public/data/questions`);
        const qSnap = await window.firestore.getDocs(questionsColRef);
        allQuestions = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Perguntas carregadas:", allQuestions.length);
        if (allQuestions.length === 0) {
            showMessage(gameTranslations['error_no_questions'] || "Nenhuma pergunta encontrada no banco de dados.", 'warning');
        }
    } catch (error) {
        console.error("Erro ao carregar perguntas:", error);
        showMessage(gameTranslations['error_loading_questions'] || "Erro ao carregar as perguntas. Por favor, recarregue a página.", 'error');
    }
}

// Função para exibir uma nova carta (pergunta)
function displayCard(question) {
    if (!question) {
        showMessage(gameTranslations['error_no_more_questions'] || "Não há mais cartas para exibir nesta área.", 'info');
        // Opcional: Voltar para o seletor de área ou reabilitar o botão "Carta Aleatória"
        gameAreaSelectorElement.classList.remove('hidden');
        gameCardElement.classList.add('hidden');
        return;
    }

    currentQuestion = question;
    selectedOption = null; // Reinicia a opção selecionada
    feedbackContainer.innerHTML = ''; // Limpa feedback anterior
    answerButton.classList.remove('hidden'); // Mostra o botão de resposta
    nextCardButton.classList.add('hidden'); // Esconde o botão da próxima carta

    questionAreaElement.textContent = `${gameTranslations['label_area_title']}: ${question.area}`;
    currentQuestionDisplayElement.textContent = question.question;

    optionsContainerElement.innerHTML = '';
    question.options.forEach((option, index) => {
        const optionButton = document.createElement('button');
        optionButton.textContent = option;
        optionButton.className = 'option-button p-3 mb-2 w-full rounded-lg text-left bg-gray-100 hover:bg-gray-200 transition duration-200 ease-in-out';
        optionButton.addEventListener('click', () => {
            // Remove a seleção de todos os botões e adiciona ao clicado
            document.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected-option', 'bg-blue-200'));
            optionButton.classList.add('selected-option', 'bg-blue-200');
            selectedOption = option;
        });
        optionsContainerElement.appendChild(optionButton);
    });

    gameAreaSelectorElement.classList.add('hidden'); // Esconde o seletor de área
    gameCardElement.classList.remove('hidden'); // Mostra a carta do jogo
}

// Função para verificar a resposta
function checkAnswer() {
    if (!currentQuestion || selectedOption === null) {
        showMessage(gameTranslations['error_select_option'] || "Por favor, selecione uma opção.", 'warning');
        return;
    }

    answerButton.classList.add('hidden'); // Esconde o botão de resposta
    nextCardButton.classList.remove('hidden'); // Mostra o botão da próxima carta

    const optionButtons = document.querySelectorAll('.option-button');
    optionButtons.forEach(button => button.disabled = true); // Desabilita botões após a resposta

    if (selectedOption === currentQuestion.correctAnswer) {
        feedbackContainer.innerHTML = `<p class="text-green-600 font-bold">${gameTranslations['feedback_correct']}</p>`;
    } else {
        feedbackContainer.innerHTML = `
            <p class="text-red-600 font-bold">${gameTranslations['feedback_incorrect_prefix']}${currentQuestion.correctAnswer}</p>
            <p class="mt-2 text-gray-700">${gameTranslations['explanation_prefix']}${currentQuestion.explanation}</p>
        `;
    }
}

// Função para obter uma carta aleatória (da área selecionada ou de todas)
function getRandomCard(area = null) {
    let availableQuestions = allQuestions;
    if (area) {
        availableQuestions = allQuestions.filter(q => q.area === area);
    }

    if (availableQuestions.length === 0) {
        showMessage(gameTranslations['error_no_questions_for_area'] || "Não há perguntas disponíveis para esta área.", 'warning');
        return null;
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex];
}

// Adiciona listeners para os botões do jogo
function addGameEventListeners() {
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', () => redirectToHome('user_exit'));
    }

    if (randomCardButton) {
        randomCardButton.addEventListener('click', () => displayCard(getRandomCard()));
    }

    if (answerButton) {
        answerButton.addEventListener('click', checkAnswer);
    }

    if (nextCardButton) {
        nextCardButton.addEventListener('click', () => {
            gameCardElement.classList.add('hidden'); // Esconde a carta
            gameAreaSelectorElement.classList.remove('hidden'); // Mostra o seletor de área
            feedbackContainer.innerHTML = ''; // Limpa feedback
            // Opcional: resetar estado ou carregar nova carta automaticamente
        });
    }

    // Adiciona listeners para os botões de seleção de área
    document.querySelectorAll('.area-select-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const area = event.target.dataset.area;
            displayCard(getRandomCard(area));
        });
    });
}

// Função para subscrever e exibir jogadores da sessão
function subscribeToSessionPlayers(sessionId) {
    const db = window.db;
    const appId = window.appId;
    if (!db || !appId) {
        console.error("Firestore ou AppId não inicializados para subscrever jogadores.");
        return;
    }

    const sessionRef = window.firestore.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId);

    // Desinscreve qualquer listener anterior para evitar duplicação
    if (sessionPlayersUnsubscribe) {
        sessionPlayersUnsubscribe();
        console.log("Listener de jogadores desinscrito.");
    }

    sessionPlayersUnsubscribe = window.firestore.onSnapshot(sessionRef, (docSnap) => {
        if (docSnap.exists()) {
            const sessionData = docSnap.data();
            const players = sessionData.players || {};
            playerListElement.innerHTML = ''; // Limpa a lista atual

            if (Object.keys(players).length === 0) {
                playerListElement.innerHTML = `<li class="text-gray-600 italic">${gameTranslations['no_players_in_session'] || 'Nenhum jogador ainda.'}</li>`;
            } else {
                for (const userId in players) {
                    const playerName = players[userId];
                    const playerItem = document.createElement('li');
                    playerItem.className = 'text-gray-700 font-medium px-3 py-1 bg-gray-100 rounded-md mb-1 flex items-center justify-between';
                    playerItem.textContent = playerName;
                    if (userId === window.currentUserId) {
                        playerItem.classList.add('bg-blue-200', 'font-bold'); // Destaca o jogador atual
                        playerItem.textContent += ' (Você)';
                    }
                    playerListElement.appendChild(playerItem);
                }
            }

            // Atualiza o ID da sessão exibido e o título da página
            if (displaySessionIdElement) {
                displaySessionIdElement.textContent = sessionId;
                document.title = `${gameTranslations['game_page_base_title'] || 'Jogo de Gerenciamento de Projetos - Sessão'} ${sessionId}`;
            }

            // Define o idioma da sessão, se diferente do atual
            if (sessionData.language && sessionData.language !== currentLanguage) {
                currentLanguage = sessionData.language;
                loadGameTranslations(currentLanguage).then(updateGameContentLanguage);
            }
            updateGameContentLanguage(); // Garante que a UI reflita o idioma

            // Oculta o overlay de carregamento assim que os dados da sessão são carregados
            hideLoadingOverlay();
            gameContainer.classList.remove('hidden'); // Torna o container do jogo visível
        } else {
            console.warn("Sessão não encontrada ou foi excluída:", sessionId);
            showMessage(gameTranslations['session_deleted_message'] || "Sessão finalizada ou não encontrada. Redirecionando para a página inicial.", 'error');
            redirectToHome('session_deleted');
        }
    }, (error) => {
        console.error("Erro no listener de sessão:", error);
        showMessage(gameTranslations['session_load_failed_message'] || "Erro ao carregar dados da sessão. Redirecionando para a página inicial.", 'error');
        redirectToHome('session_load_error');
    });
}

// Remove o jogador da sessão
async function removePlayerFromSession(sessionId, userId) {
    const db = window.db;
    const appId = window.appId;
    if (!db || !userId || !appId) {
        console.warn("Firebase Firestore, ID do utilizador ou ID da aplicação não estão inicializados para remover jogador.");
        return;
    }

    const sessionRef = window.firestore.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId);
    try {
        const sessionSnap = await window.firestore.getDoc(sessionRef);
        if (sessionSnap.exists()) {
            const sessionData = sessionSnap.data();
            const players = { ...sessionData.players }; // Cria uma cópia para modificação
            if (players[userId]) {
                delete players[userId]; // Remove o jogador
                await window.firestore.updateDoc(sessionRef, { players: players });
                console.log(`Jogador ${userId} removido da sessão ${sessionId}.`);

                // Se não houver mais jogadores, opcionalmente exclua a sessão
                if (Object.keys(players).length === 0) {
                    await window.firestore.deleteDoc(sessionRef);
                    console.log(`Sessão ${sessionId} excluída por não ter mais jogadores.`);
                }
            }
        }
    } catch (error) {
        console.error("Erro ao remover jogador da sessão:", error);
    }
}


// Função principal de inicialização da lógica do jogo
async function initGameLogic() {
    console.log("initGameLogic: Iniciando...");

    const { session, lang } = getQueryParams();
    currentSessionId = session;
    if (lang) {
        currentLanguage = lang;
    }

    if (!currentSessionId) {
        showMessage(gameTranslations['error_no_session_id'] || "Nenhum ID de sessão encontrado. Redirecionando para a página inicial.", 'error');
        redirectToHome('no_session_id');
        return;
    }

    // Tenta pegar o nome de utilizador do localStorage novamente para garantir que está atualizado
    currentUsername = localStorage.getItem('pm_game_username') || 'Utilizador Anónimo';

    const translationsLoaded = await loadGameTranslations(currentLanguage);
    if (!translationsLoaded) {
        redirectToHome('translations_load_failed');
        return;
    }

    updateGameContentLanguage(); // Atualiza a UI com as traduções iniciais

    addGameEventListeners(); // Adiciona os listeners para os botões do jogo

    await loadQuestions(); // Carrega todas as perguntas do Firestore
    subscribeToSessionPlayers(currentSessionId); // Inicia o listener de jogadores
    // O `hideLoadingOverlay()` e `gameContainer.classList.remove('hidden')` são chamados dentro de `subscribeToSessionPlayers`
    // uma vez que os dados da sessão são carregados.
}


// Listener principal para iniciar a lógica do jogo APÓS o DOM e o Firebase estarem prontos.
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded disparado em gameLogic.js.");
    try {
        await window.firebaseInitializedPromise;
        console.log("Firebase inicializado e autenticado. Iniciando a lógica do jogo...");
        await initGameLogic();
    } catch (error) {
        console.error("Erro na inicialização do Firebase em gameLogic.js, pulando a lógica do jogo:", error);
        showMessage(gameTranslations['error_firebase_init'] || "Erro fatal ao iniciar o jogo. Por favor, tente novamente. " + error.message, 'error');
        hideLoadingOverlay(); // Garante que o overlay seja escondido mesmo em caso de erro
        gameContainer.innerHTML = `<div class="text-red-500 text-center text-lg p-4">Ocorreu um erro crítico ao carregar o jogo. Por favor, recarregue a página.</div>`;
        gameContainer.classList.remove('hidden');
    }
});

// Remove o jogador da sessão quando a página é fechada ou navegada.
window.addEventListener('beforeunload', async (event) => {
    console.log("beforeunload disparado. Tentando remover jogador da sessão.");
    // Desinscreve o listener antes de tentar remover o jogador
    if (sessionPlayersUnsubscribe) {
        sessionPlayersUnsubscribe();
        console.log("Listener de jogadores desinscrito em beforeunload.");
    }
    // Verifica se window.currentUserId está definido antes de tentar remover
    if (currentSessionId && window.currentUserId) {
        await removePlayerFromSession(currentSessionId, window.currentUserId);
    } else {
        console.warn("Não foi possível remover o jogador no beforeunload: currentSessionId ou window.currentUserId indefinidos.");
    }
});
