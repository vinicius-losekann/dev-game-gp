// js/gameLogic.js

let allQuestions = [];
let currentQuestion = null;
let selectedOption = null;
let currentLanguage = AppConfig.defaultLanguage; // currentLanguage é inicializado com um valor padrão de AppConfig
let gameTranslations = {}; // Objeto para armazenar as traduções carregadas do jogo

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
const loadingOverlay = document.getElementById('loadingOverlay'); // Referência ao overlay de carregamento
const gameContainer = document.getElementById('gameContainer'); // Referência ao container principal do jogo

let currentSessionId = null;
let sessionPlayersUnsubscribe = null; // Para guardar a função de unsubscribe do listener de players

// Função para exibir mensagens ao usuário
function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`; // Define a classe com base no tipo
    messageBox.classList.remove('hidden'); // Garante que a mensagem seja visível

    // Oculta a mensagem após 5 segundos
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 5000);
}

// Função para carregar as traduções do arquivo JSON
async function loadGameTranslations(lang) {
    try {
        const response = await fetch('game_translations.json');
        if (!response.ok) {
            throw new Error(`Erro de rede ou arquivo não encontrado: ${response.status} ${response.statusText}`);
        }
        const allTranslations = await response.json();
        
        if (!allTranslations[lang]) {
            console.warn(`Idioma '${lang}' não encontrado no arquivo de traduções. Usando pt-BR como fallback.`);
            gameTranslations = allTranslations['pt-BR']; // Fallback para pt-BR
            currentLanguage = 'pt-BR';
        } else {
            gameTranslations = allTranslations[lang];
            currentLanguage = lang; // Define o idioma atual para o carregado
        }
        document.documentElement.lang = currentLanguage; // Atualiza o atributo lang do <html>
        applyGameTranslations(); // Aplica as traduções

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
    // Atualiza o título da página com o ID da sessão, se disponível
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
    optionsContainerElement.innerHTML = ''; // Limpa opções anteriores
    feedbackContainer.innerHTML = ''; // Limpa feedback anterior
    nextCardButton.classList.add('hidden'); // Esconde o botão "Próxima Carta"
    answerButton.classList.remove('hidden'); // Mostra o botão "Verificar Resposta"
    answerButton.disabled = false; // Habilita o botão de resposta
    selectedOption = null; // Reseta a opção selecionada

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.classList.add('option-button');
        button.textContent = option;
        button.dataset.index = index;
        button.addEventListener('click', () => {
            // Remove 'selected' de todos os botões e adiciona ao clicado
            document.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedOption = option;
            console.log("Opção selecionada:", selectedOption);
        });
        optionsContainerElement.appendChild(button);
    });

    gameAreaSelectorElement.classList.add('hidden'); // Oculta o seletor de área
    gameCardElement.classList.remove('hidden'); // Mostra o card da pergunta
}

// Função para verificar a resposta
function checkAnswer() {
    if (selectedOption === null) {
        showMessage("Por favor, selecione uma opção antes de verificar a resposta.", 'info');
        return;
    }

    // Desabilita todos os botões de opção
    document.querySelectorAll('.option-button').forEach(button => {
        button.disabled = true;
        if (button.textContent === currentQuestion.correctAnswer) {
            button.classList.add('correct-answer-highlight'); // Adiciona classe para destacar a resposta correta
        }
    });

    answerButton.disabled = true; // Desabilita o botão de verificar
    nextCardButton.classList.remove('hidden'); // Mostra o botão "Próxima Carta"

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
    // Esconde o overlay de carregamento
    loadingOverlay.classList.add('hidden');
    // Torna o container do jogo visível
    gameContainer.classList.add('visible');

    if (allQuestions.length === 0) {
        showMessage(gameTranslations['error_loading_questions'] || "Erro: Nenhuma pergunta carregada. Recarregue a página.", 'error');
        return;
    }

    const questionToShow = getRandomQuestion(area);
    if (questionToShow) {
        displayQuestion(questionToShow);
    } else {
        // Se não houver perguntas na área selecionada, volta para o seletor de área
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
        gameCardElement.classList.add('hidden'); // Esconde o card
        gameAreaSelectorElement.classList.remove('hidden'); // Mostra o seletor de área
        feedbackContainer.innerHTML = ''; // Limpa o feedback
    });

    // Adiciona listener para os botões de seleção de área
    document.querySelectorAll('.area-select-button').forEach(button => {
        button.addEventListener('click', () => {
            const area = button.dataset.area;
            startGame(area); // Inicia o jogo com a área selecionada
        });
    });

    randomCardButton.addEventListener('click', () => startGame()); // Carta aleatória

    backToHomeButton.addEventListener('click', async () => {
        // Remove o listener de players antes de sair
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
    playerListElement.innerHTML = ''; // Limpa a lista atual
    if (players && players.length > 0) {
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.userId; // Exibe o ID completo do usuário
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
    // Analisa a URL para obter o ID da sessão e o idioma
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

    // Carrega as traduções com base no idioma da URL, se disponível, senão usa o padrão
    await loadGameTranslations(langFromUrl || AppConfig.defaultLanguage);
    console.log(`Idioma do jogo definido para: ${currentLanguage}`);

    // Configura o listener de jogadores da sessão
    if (window.db && window.firestore) {
        const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, currentSessionId);
        sessionPlayersUnsubscribe = window.firestore.onSnapshot(sessionDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const sessionData = docSnap.data();
                const players = sessionData.currentPlayers || [];
                updatePlayerList(players);
            } else {
                console.log("Sessão não encontrada ou removida.");
                // Opcional: redirecionar ou mostrar mensagem se a sessão for removida
            }
        }, (error) => {
            console.error("Erro ao ouvir por jogadores da sessão:", error);
            showMessage("Erro ao carregar jogadores da sessão.", 'error');
        });
    } else {
        console.error("Firebase Firestore não está inicializado para listeners de jogadores.");
    }

    // Carrega todas as perguntas ANTES de tentar iniciar o jogo
    await loadQuestions();

    // Adiciona os event listeners depois que as traduções e perguntas são carregadas
    addEventListeners();

    // Inicia o jogo mostrando o seletor de área (ou diretamente uma carta, se houver lógica para isso)
    gameCardElement.classList.add('hidden'); // Garante que o card esteja oculto no início
    gameAreaSelectorElement.classList.remove('hidden'); // Mostra o seletor de área
}

// Listener principal DOMContentLoaded que AGUARDA a inicialização do Firebase
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded disparado em gameLogic.js. Verificando AppConfig.defaultLanguage...");
    
    // Aguarda que a promessa de inicialização do Firebase seja resolvida
    await window.firebaseInitializedPromise;
    console.log("Firebase inicializado. Iniciando a lógica do jogo...");
    
    // Agora que Firebase e AppConfig (via window.AppConfig) estão prontos, inicia a lógica principal do jogo
    await initGameLogic();
});

// Opcional: Lidar com o usuário saindo (por exemplo, fechando a aba)
window.addEventListener('beforeunload', async () => {
    if (currentSessionId && window.currentUserId && window.db) {
        // Desinscreve o listener de jogadores para evitar vazamento de memória ou chamadas desnecessárias
        if (sessionPlayersUnsubscribe) {
            sessionPlayersUnsubscribe();
            console.log("Listener de jogadores desinscrito em beforeunload.");
        }
        await removePlayerFromSession(currentSessionId, window.currentUserId);
    }
});
