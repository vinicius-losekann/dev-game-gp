// js/gameLogic.js

let allQuestions = [];
let currentQuestion = null;
let selectedOption = null;
let currentLanguage = AppConfig.defaultLanguage; 
let gameTranslations = {}; 

// Variáveis Firebase (serão inicializadas após o firebaseInitializedPromise)
let db;
let firestore;
let currentUserId;
let currentSessionId;
let currentSessionLanguage;
let currentUserName; // Variável para armazenar o nome do usuário

// Variável para armazenar a função de desinscrição do listener do Firestore
let sessionPlayersUnsubscribe = null; 

// Elementos DOM - Declarações para serem atribuídas em initGameLogic
let displaySessionIdElement;
let playerListElement;
let gameAreaSelectorElement;
let gameCardElement;
let questionAreaElement; 
let currentQuestionDisplayElement; 
let optionsContainerElement;
let answerButton;
let nextCardButton;
let feedbackContainer;
let backToHomeButton;
let randomCardButton;
let messageBox;
let loadingOverlay; 
let gameContainer; 

// Função para exibir mensagens ao usuário
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
async function loadGameTranslations(lang) {
    let success = false;
    try {
        const response = await fetch(`/dev-game-gp/translations/game_translations.json`);
        if (!response.ok) {
            throw new Error(`Erro de rede ou arquivo não encontrado: ${response.status} ${response.statusText}`);
        }
        const allTranslations = await response.json();
        
        if (!allTranslations[lang]) {
            console.warn(`Idioma '${lang}' não encontrado no arquivo de traduções do jogo. Usando pt-BR como fallback.`);
            gameTranslations = allTranslations['pt-BR']; 
            currentLanguage = 'pt-BR'; 
        } else {
            gameTranslations = allTranslations[lang];
            currentLanguage = lang; 
        }
        document.documentElement.lang = currentLanguage; 
        applyGameTranslations(); 

        console.log(`Traduções para ${currentLanguage} carregadas com sucesso.`);
        success = true;
    } catch (error) {
        console.error("Erro ao carregar ou aplicar traduções do jogo:", error);
        showMessage(gameTranslations['error_loading_questions'] || "Erro ao carregar as traduções do jogo.", 'error');
    }
    return success;
}

// Função para aplicar as traduções na página do jogo
function applyGameTranslations() {
    const pageTitleElement = document.querySelector('title');
    if (pageTitleElement) {
        const baseTitle = gameTranslations['game_page_base_title'] || "Jogo de Gerenciamento de Projetos - Sessão";
        pageTitleElement.textContent = `${baseTitle} ${currentSessionId ? `- ${currentSessionId}` : ''}`;
    }

    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.dataset.langKey;
        if (gameTranslations[key]) {
            element.textContent = gameTranslations[key];
        }
    });

    if (gameAreaSelectorElement) { 
        gameAreaSelectorElement.querySelectorAll('.area-select-button').forEach(button => {
            const area = button.getAttribute('data-area'); 
            if (gameTranslations[`area_${area.toLowerCase()}`]) {
                button.textContent = gameTranslations[`area_${area.toLowerCase()}`];
            }
        });
    }
}

// Função para carregar perguntas do Firestore
async function loadQuestions() {
    if (!db || !firestore) {
        console.error("Firebase Firestore não está inicializado para carregar perguntas.");
        showMessage(gameTranslations['error_loading_questions'] || "Erro ao carregar as perguntas. Firebase não inicializado.", 'error');
        return [];
    }
    try {
        console.log("DEBUG: Tentando carregar perguntas da coleção:", `artifacts/${window.appId}/public/data/questions`);
        console.log("DEBUG: Filtrando perguntas pelo idioma:", currentLanguage);

        const questionsCollection = firestore.collection(db, `artifacts/${window.appId}/public/data/questions`);
        const q = firestore.query(questionsCollection, firestore.where("language", "==", currentLanguage));
        const querySnapshot = await firestore.getDocs(q);
        
        allQuestions = [];
        if (querySnapshot.empty) {
            console.warn("DEBUG: QuerySnapshot está vazio. Nenhuma pergunta encontrada para o idioma:", currentLanguage);
            showMessage(gameTranslations['no_questions_for_language'] || `Nenhuma pergunta encontrada para o idioma "${currentLanguage}".`, 'info');
        }

        querySnapshot.forEach((doc) => {
            allQuestions.push(doc.data());
        });
        console.log("DEBUG: Perguntas carregadas. Total:", allQuestions.length, "Perguntas:", allQuestions);
        return allQuestions; 
    } catch (error) {
        console.error("Erro ao carregar perguntas do Firestore:", error);
        showMessage(gameTranslations['error_loading_questions'] || "Erro ao carregar as perguntas. Por favor, recarregue a página.", 'error');
        return [];
    }
}

// Função para pegar uma pergunta aleatória ou por área
function getRandomQuestion(area = null) {
    let availableQuestions = allQuestions;
    if (area) {
        availableQuestions = availableQuestions.filter(q => q.area.toLowerCase() === area.toLowerCase()); 
    }

    if (availableQuestions.length === 0) {
        showMessage(gameTranslations.no_more_questions || `Não há cartas disponíveis para a área '${area || "aleatória"}'.`, 'info');
        return null;
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex];
}

// Função para exibir a pergunta atual
function displayQuestion(question) {
    if (!question) {
        currentQuestionDisplayElement.textContent = gameTranslations['error_loading_questions'] || "Erro ao carregar a pergunta.";
        optionsContainerElement.innerHTML = '';
        answerButton.classList.add('hidden');
        nextCardButton.classList.add('hidden');
        feedbackContainer.innerHTML = '';
        return;
    }

    currentQuestion = question;
    questionAreaElement.textContent = `${gameTranslations['label_area'] || 'Área'}: ${gameTranslations[`area_${question.area.toLowerCase()}`] || question.area}`;
    currentQuestionDisplayElement.textContent = question.question;
    optionsContainerElement.innerHTML = ''; 
    feedbackContainer.innerHTML = ''; 
    nextCardButton.classList.add('hidden'); 
    answerButton.classList.remove('hidden'); 
    answerButton.disabled = false; 
    selectedOption = null; 

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.classList.add('option-button');
        button.textContent = option;
        button.dataset.index = index;
        button.addEventListener('click', () => {
            document.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedOption = option;
            console.log("Opção selecionada:", selectedOption);
        });
        optionsContainerElement.appendChild(button);
    });

    gameAreaSelectorElement.classList.add('hidden'); 
    gameCardElement.classList.remove('hidden'); 
}

// Função para verificar a resposta
function checkAnswer() {
    if (selectedOption === null) {
        showMessage("Por favor, selecione uma opção antes de verificar a resposta.", 'info');
        return;
    }

    document.querySelectorAll('.option-button').forEach(button => {
        button.disabled = true;
        if (button.textContent === currentQuestion.correctAnswer) {
            button.classList.add('correct-answer-highlight'); 
        }
    });

    answerButton.disabled = true; 
    nextCardButton.classList.remove('hidden'); 

    if (selectedOption === currentQuestion.correctAnswer) {
        feedbackContainer.innerHTML = `<div class="feedback correct">${gameTranslations['feedback_correct'] || "Parabéns! Resposta Correta!"}</div>`;
    } else {
        feedbackContainer.innerHTML = `
            <div class="feedback incorrect">${gameTranslations['feedback_incorrect_prefix'] || "Ops! Resposta Incorreta. A resposta correta é "} <span class="font-bold">${currentQuestion.correctAnswer}</span>.</div>
            <div class="explanation">${gameTranslations['explanation_prefix'] || "Explicação: "} ${currentQuestion.explanation}</div>
        `;
    }
}

// Inicia o jogo ou exibe o seletor de área
async function startGameLogicFlow(area = null) { 
    loadingOverlay.classList.add('hidden'); 
    gameContainer.classList.remove('hidden'); 

    if (allQuestions.length === 0) {
        showMessage(gameTranslations['error_loading_questions'] || "Erro: Nenhuma pergunta carregada. Recarregue a página.", 'error');
        return;
    }

    const questionToShow = getRandomQuestion(area);
    if (questionToShow) {
        displayQuestion(questionToShow);
    } else {
        gameCardElement.classList.add('hidden');
        gameAreaSelectorElement.classList.remove('hidden');
        showMessage(gameTranslations.no_more_questions || `Nenhuma carta encontrada para a área "${gameTranslations[`area_${area.toLowerCase()}`] || area}". Por favor, escolha outra área ou "Carta Aleatória".`, 'info');
    }
}

// Função para remover o jogador da sessão
async function removePlayerFromSession(sessionId, userId) {
    if (!db || !firestore) {
        console.error("Firebase Firestore não está inicializado para remover jogador.");
        return;
    }
    const sessionDocRef = firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, sessionId);
    try {
        const docSnap = await firestore.getDoc(sessionDocRef);
        if (docSnap.exists()) {
            const sessionData = docSnap.data();
            const players = sessionData.currentPlayers || [];
            const playerToRemove = players.find(player => player.userId === userId);

            if (playerToRemove) {
                await firestore.updateDoc(sessionDocRef, {
                    currentPlayers: firestore.arrayRemove(playerToRemove)
                });
                console.log(`Usuário ${userId} (${currentUserName}) removido da sessão.`);
            }
        }
    } catch (error) {
        console.error("Erro ao remover usuário da sessão:", error);
    }
}

// Função para adicionar o jogador à sessão no Firestore (usado ao entrar na game.html)
async function addPlayerToSession(sessionId, userId, userName) {
    if (!db || !firestore || !userId) {
        console.error("Firebase não inicializado ou userId ausente ao tentar adicionar jogador à sessão.");
        return;
    }
    const sessionDocRef = firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, sessionId);
    try {
        const docSnap = await firestore.getDoc(sessionDocRef);
        if (docSnap.exists()) {
            const sessionData = docSnap.data();
            const players = sessionData.currentPlayers || [];
            const playerExists = players.some(player => player.userId === userId);

            if (!playerExists) {
                await firestore.updateDoc(sessionDocRef, {
                    currentPlayers: firestore.arrayUnion({ userId: userId, name: userName, joinedAt: new Date() }) 
                });
                console.log(`Usuário ${userId} (${userName}) adicionado à sessão.`);
            } else {
                console.log(`Usuário ${userId} (${userName}) já está na sessão.`);
                const playerIndex = players.findIndex(player => player.userId === userId);
                if (playerIndex > -1 && players[playerIndex].name !== userName) {
                    players[playerIndex].name = userName;
                    await firestore.updateDoc(sessionDocRef, { currentPlayers: players });
                    console.log(`Nome do usuário ${userId} atualizado para ${userName}.`);
                }
            }
        } else {
            console.warn(`Sessão ${sessionId} não encontrada ao tentar adicionar jogador.`);
        }
    } catch (error) {
        console.error("Erro ao adicionar usuário à sessão:", error);
    }
}

// Adiciona event listeners
function addEventListeners() {
    answerButton.addEventListener('click', checkAnswer);
    nextCardButton.addEventListener('click', () => {
        gameCardElement.classList.add('hidden'); 
        gameAreaSelectorElement.classList.remove('hidden'); 
        feedbackContainer.innerHTML = ''; 
    });

    document.querySelectorAll('.area-select-button').forEach(button => {
        button.addEventListener('click', () => {
            const area = button.dataset.area;
            startGameLogicFlow(area); 
        });
    });

    randomCardButton.addEventListener('click', () => startGameLogicFlow()); 

    backToHomeButton.addEventListener('click', async () => {
        if (sessionPlayersUnsubscribe) {
            sessionPlayersUnsubscribe();
            console.log("Listener de jogadores desinscrito.");
        }
        if (currentSessionId && currentUserId) {
            await removePlayerFromSession(currentSessionId, currentUserId);
        }
        window.location.href = 'index.html';
    });
}

// Função para atualizar a lista de jogadores na UI
function updatePlayerList(players) {
    if (playerListElement) { 
        playerListElement.innerHTML = ''; 
        if (players && players.length > 0) {
            players.forEach(player => {
                const li = document.createElement('li');
                li.textContent = player.name || player.userId; 
                playerListElement.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = gameTranslations['no_players_yet'] || "Nenhum jogador ainda...";
            playerListElement.appendChild(li);
        }
    }
}


// Inicializa a lógica do jogo
async function initGameLogic() {
    // Atribui as referências dos elementos DOM aqui
    displaySessionIdElement = document.getElementById('displaySessionId');
    playerListElement = document.getElementById('playerList');
    gameAreaSelectorElement = document.getElementById('gameAreaSelector');
    gameCardElement = document.getElementById('gameCard');
    questionAreaElement = document.getElementById('questionArea');
    currentQuestionDisplayElement = document.getElementById('currentQuestionDisplay');
    optionsContainerElement = document.getElementById('optionsContainer');
    answerButton = document.getElementById('answerButton');
    nextCardButton = document.getElementById('nextCardButton');
    feedbackContainer = document.getElementById('feedbackContainer');
    backToHomeButton = document.getElementById('backToHomeButton');
    randomCardButton = document.getElementById('randomCardButton');
    messageBox = document.getElementById('messageBox');
    loadingOverlay = document.getElementById('loadingOverlay'); 
    gameContainer = document.getElementById('gameContainer'); 

    // Atribui as instâncias do Firebase ao iniciar gameLogic
    db = window.db;
    firestore = window.firestore;
    currentUserId = window.currentUserId;

    console.log("DEBUG - Dentro de initGameLogic:");
    console.log("DEBUG - db (local):", db);
    console.log("DEBUG - firestore (local):", firestore);
    console.log("DEBUG - currentUserId (local):", currentUserId);
    console.log("DEBUG - typeof firestore.onSnapshot:", typeof firestore.onSnapshot);


    const urlParams = new URLSearchParams(window.location.search);
    currentSessionId = urlParams.get('session');
    let langFromUrl = urlParams.get('lang');
    currentUserName = decodeURIComponent(urlParams.get('playerName') || 'Jogador Anônimo'); 

    if (!currentSessionId) {
        showMessage(gameTranslations['error_no_session_id'] || "Nenhum ID de sessão encontrado. Redirecionando para a página inicial.", 'error');
        console.error("Nenhum ID de sessão encontrado. Redirecionando para a página inicial.");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        return;
    }

    if (displaySessionIdElement) { 
        displaySessionIdElement.textContent = currentSessionId;
    }
    console.log(`ID da Sessão: ${currentSessionId}`);
    console.log(`Idioma da URL: ${langFromUrl}`);
    console.log(`Nome do Jogador: ${currentUserName}`); 

    const translationsLoaded = await loadGameTranslations(langFromUrl || AppConfig.defaultLanguage);
    if (!translationsLoaded) {
        console.error("Falha ao carregar traduções. Não é possível prosseguir com o jogo.");
        return;
    }
    console.log(`Idioma do jogo definido para: ${currentLanguage}`);

    // Adiciona o jogador à sessão no Firestore, passando o nome
    await addPlayerToSession(currentSessionId, currentUserId, currentUserName);


    if (db && firestore && typeof firestore.onSnapshot === 'function') { 
        const sessionDocRef = firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, currentSessionId);
        sessionPlayersUnsubscribe = firestore.onSnapshot(sessionDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const sessionData = docSnap.data();
                const players = sessionData.currentPlayers || [];
                updatePlayerList(players);
            } else {
                console.log("Sessão não encontrada ou removida.");
                showMessage(gameTranslations.session_deleted_message || "Sesión finalizada o no encontrada. Redireccionando.", 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            }
        }, (error) => {
            console.error("Erro ao ouvir por jogadores da sessão:", error);
            showMessage("Erro ao carregar jogadores da sessão.", 'error');
        });
        console.log("DEBUG: onSnapshot listener configurado com sucesso.");
    } else {
        console.error("Firebase Firestore não está inicializado para listeners de jogadores ou onSnapshot não é uma função.");
        showMessage("Erro ao inicializar listeners de sessão. Alguns recursos podem não funcionar.", 'error');
    }

    await loadQuestions();
    addEventListeners(); 
    startGameLogicFlow(); 
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded disparado em gameLogic.js. Verificando AppConfig.defaultLanguage...");
    
    await window.firebaseInitializedPromise; 
    console.log("Firebase inicializado. Iniciando a lógica do jogo...");
    
    await initGameLogic(); 
});

window.addEventListener('beforeunload', async () => {
    if (currentSessionId && currentUserId && db) { 
        if (sessionPlayersUnsubscribe) {
            sessionPlayersUnsubscribe();
            console.log("Listener de jogadores desinscrito em beforeunload.");
        }
        await removePlayerFromSession(currentSessionId, currentUserId);
    }
});
