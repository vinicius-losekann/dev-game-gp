// js/gameLogic.js

let allQuestions = [];
let currentQuestion = null;
let selectedOption = null;
let currentLanguage = AppConfig.defaultLanguage; 
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
let sessionPlayersUnsubscribe = null; 

// Função para exibir mensagens ao usuário
function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`; 
    messageBox.classList.remove('hidden'); 

    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 5000);
}

// Função para carregar as traduções do arquivo JSON
async function loadGameTranslations(lang) {
    try {
        // CORRIGIDO: Caminho relativo correto para o arquivo de traduções do jogo
        const response = await fetch('../translations/game_translations.json');
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
    } catch (error) {
        console.error("Erro ao carregar ou aplicar traduções do jogo:", error);
        showMessage(gameTranslations['error_loading_questions'] || "Erro ao carregar as traduções do jogo.", 'error');
    }
}

// Função para aplicar as traduções na página do jogo
function applyGameTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (gameTranslations[key]) {
            element.textContent = gameTranslations[key];
        }
    });
    const baseTitle = gameTranslations['game_page_base_title'] || "Jogo de Gerenciamento de Projetos - Sessão";
    document.title = `${baseTitle} ${currentSessionId ? `- ${currentSessionId}` : ''}`;
}


// Função para carregar perguntas do Firestore
async function loadQuestions() {
    if (!window.db || !window.firestore) {
        console.error("Firebase Firestore não está inicializado para carregar perguntas.");
        showMessage(gameTranslations['error_loading_questions'] || "Erro ao carregar as perguntas. Firebase não inicializado.", 'error');
        return [];
    }
    try {
        const questionsCollection = window.firestore.collection(window.db, `artifacts/${window.appId}/public/data/questions`);
        const querySnapshot = await window.firestore.getDocs(questionsCollection);
        const questions = [];
        querySnapshot.forEach((doc) => {
            questions.push(doc.data());
        });
        allQuestions = questions;
        console.log("Perguntas carregadas:", allQuestions.length);
        return questions;
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
        availableQuestions = allQuestions.filter(q => q.area === area);
    }

    if (availableQuestions.length === 0) {
        showMessage(`Não há cartas disponíveis para a área '${area || "aleatória"}'.`, 'info');
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
async function startGame(area = null) {
    loadingOverlay.classList.add('hidden');
    gameContainer.classList.add('visible');

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
        showMessage(`Nenhuma carta encontrada para a área "${gameTranslations[`area_${area.toLowerCase()}`] || area}". Por favor, escolha outra área ou "Carta Aleatória".`, 'info');
    }
}

// Função para remover o jogador da sessão
async function removePlayerFromSession(sessionId, userId) {
    if (!window.db || !window.firestore) {
        console.error("Firebase Firestore não está inicializado para remover jogador.");
        return;
    }
    const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, sessionId);
    try {
        const docSnap = await window.firestore.getDoc(sessionDocRef);
        if (docSnap.exists()) {
            const sessionData = docSnap.data();
            const players = sessionData.currentPlayers || [];
            const playerToRemove = players.find(player => player.userId === userId);

            if (playerToRemove) {
                await window.firestore.updateDoc(sessionDocRef, {
                    currentPlayers: window.firestore.arrayRemove(playerToRemove)
                });
                console.log(`Usuário ${userId} removido da sessão.`);
            }
        }
    } catch (error) {
        console.error("Erro ao remover usuário da sessão:", error);
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
            startGame(area); 
        });
    });

    randomCardButton.addEventListener('click', () => startGame()); 

    backToHomeButton.addEventListener('click', async () => {
        if (sessionPlayersUnsubscribe) {
            sessionPlayersUnsubscribe();
            console.log("Listener de jogadores desinscrito.");
        }
        if (currentSessionId && window.currentUserId) {
            await removePlayerFromSession(currentSessionId, window.currentUserId);
        }
        window.location.href = 'index.html';
    });
}

// Função para atualizar a lista de jogadores na UI
function updatePlayerList(players) {
    playerListElement.innerHTML = ''; 
    if (players && players.length > 0) {
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.userId; 
            playerListElement.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = gameTranslations['no_players_yet'] || "Nenhum jogador ainda...";
        playerListElement.appendChild(li);
    }
}


// Inicializa a lógica do jogo
async function initGameLogic() {
    const urlParams = new URLSearchParams(window.location.search);
    currentSessionId = urlParams.get('session');
    let langFromUrl = urlParams.get('lang');

    if (!currentSessionId) {
        showMessage(gameTranslations['error_no_session_id'] || "Nenhum ID de sessão encontrado. Redirecionando para a página inicial.", 'error');
        console.error("Nenhum ID de sessão encontrado. Redirecionando para a página inicial.");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        return;
    }

    displaySessionIdElement.textContent = currentSessionId;
    console.log(`ID da Sessão: ${currentSessionId}`);
    console.log(`Idioma da URL: ${langFromUrl}`);

    await loadGameTranslations(langFromUrl || AppConfig.defaultLanguage);
    console.log(`Idioma do jogo definido para: ${currentLanguage}`);

    if (window.db && window.firestore) {
        const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, currentSessionId);
        sessionPlayersUnsubscribe = window.firestore.onSnapshot(sessionDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const sessionData = docSnap.data();
                const players = sessionData.currentPlayers || [];
                updatePlayerList(players);
            } else {
                console.log("Sessão não encontrada ou removida.");
            }
        }, (error) => {
            console.error("Erro ao ouvir por jogadores da sessão:", error);
            showMessage("Erro ao carregar jogadores da sessão.", 'error');
        });
    } else {
        console.error("Firebase Firestore não está inicializado para listeners de jogadores.");
    }

    await loadQuestions();

    addEventListeners();

    gameCardElement.classList.add('hidden'); 
    gameAreaSelectorElement.classList.remove('hidden'); 
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded disparado em gameLogic.js. Verificando AppConfig.defaultLanguage...");
    
    await window.firebaseInitializedPromise;
    console.log("Firebase inicializado. Iniciando a lógica do jogo...");
    
    await initGameLogic();
});

window.addEventListener('beforeunload', async () => {
    if (currentSessionId && window.currentUserId && window.db) {
        if (sessionPlayersUnsubscribe) {
            sessionPlayersUnsubscribe();
            console.log("Listener de jogadores desinscrito em beforeunload.");
        }
        await removePlayerFromSession(currentSessionId, window.currentUserId);
    }
});
