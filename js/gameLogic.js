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
let sessionPlayersUnsubscribe = null; // Para unsubscribing do listener de jogadores

// Adiciona um listener para o parâmetro 'username' na URL
let currentUsername = localStorage.getItem('pm_game_username') || 'Usuário Anônimo'; // Tenta pegar do localStorage

// Função para exibir mensagens ao usuário
function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.classList.remove('hidden');
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 5000); // Esconde a mensagem após 5 segundos
}

// Função para carregar as traduções
async function loadTranslations(lang) {
    try {
        const response = await fetch(`/dev-game-gp/translations/game_translations.json`);
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status} ao carregar game_translations.json`);
            showMessage('Erro ao carregar traduções do jogo. Por favor, recarregue a página.', 'error');
            return false;
        }
        const translations = await response.json();
        if (translations[lang]) {
            gameTranslations = translations[lang];
            applyTranslations();
            currentLanguage = lang; // Atualiza o idioma atual
            return true;
        } else {
            console.error(`Idioma '${lang}' não encontrado nas traduções do jogo.`);
            return false;
        }
    } catch (error) {
        console.error("Erro ao carregar ou processar traduções do jogo:", error);
        showMessage('Erro ao carregar traduções do jogo. Verifique o console para detalhes.', 'error');
        return false;
    }
}

// Função para aplicar as traduções
function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.dataset.langKey;
        if (gameTranslations[key]) {
            element.textContent = gameTranslations[key];
        }
    });
}

// Função para analisar os parâmetros da URL
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        session: params.get('session'),
        lang: params.get('lang')
    };
}

// Função para redirecionar para a página inicial
function redirectToHome(messageKey = 'no_session_id_message') {
    const message = gameTranslations[messageKey] || 'Redirecionando para a página inicial.';
    showMessage(message, 'error');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 3000);
}

// Função para carregar as perguntas (simulando um fetch)
async function loadQuestions() {
    // Por enquanto, as perguntas são mockadas. No futuro, podem vir do Firestore ou de um arquivo JSON.
    allQuestions = [
        {
            id: 'q1',
            area: 'integration',
            question: 'Qual é o objetivo principal do Gerenciamento da Integração do Projeto?',
            options: [
                { text: 'Garantir que os recursos do projeto sejam utilizados de forma eficiente.', isCorrect: false },
                { text: 'Assegurar que os vários elementos do projeto sejam coordenados de forma coesa.', isCorrect: true },
                { text: 'Minimizar os riscos do projeto através de análises de probabilidade.', isCorrect: false },
                { text: 'Controlar o orçamento do projeto para evitar estouros de custo.', isCorrect: false }
            ],
            explanation: 'O Gerenciamento da Integração do Projeto envolve os processos e atividades necessários para identificar, definir, combinar, unificar e coordenar os vários processos e atividades de gerenciamento de projetos dentro dos grupos de processos de gerenciamento de projetos.'
        },
        {
            id: 'q2',
            area: 'scope',
            question: 'O que é a Declaração de Escopo do Projeto?',
            options: [
                { text: 'Um documento que descreve as qualificações da equipe do projeto.', isCorrect: false },
                { text: 'Um documento que detalha os prazos e marcos do projeto.', isCorrect: false },
                { text: 'Uma descrição do escopo do projeto, suas principais entregas, premissas e restrições.', isCorrect: true },
                { text: 'O plano de comunicação para os stakeholders do projeto.', isCorrect: false }
            ],
            explanation: 'A Declaração de Escopo do Projeto é a descrição do escopo, das entregas principais, premissas e restrições do projeto, servindo como uma base para futuras decisões do projeto.'
        },
        {
            id: 'q3',
            area: 'schedule',
            question: 'Qual técnica é usada para estimar a duração de uma atividade com base em três estimativas (otimista, pessimista e mais provável)?',
            options: [
                { text: 'Análise de Valor Agregado', isCorrect: false },
                { text: 'Método do Caminho Crítico', isCorrect: false },
                { text: 'Estimativa de Três Pontos', isCorrect: true },
                { text: 'Diagrama de Rede', isCorrect: false }
            ],
            explanation: 'A Estimativa de Três Pontos é uma técnica utilizada para estimar a duração de atividades, considerando as estimativas mais otimista, pessimista e mais provável, o que ajuda a reduzir a incerteza.'
        },
        {
            id: 'q4',
            area: 'cost',
            question: 'O que representa o Custo Real (AC - Actual Cost) no gerenciamento de custos?',
            options: [
                { text: 'O custo orçado do trabalho programado.', isCorrect: false },
                { text: 'O valor orçado do trabalho realizado.', isCorrect: false },
                { text: 'O custo total real incorrido para o trabalho realizado até uma data específica.', isCorrect: true },
                { text: 'O desvio do cronograma do projeto.', isCorrect: false }
            ],
            explanation: 'O Custo Real (AC) é o custo total efetivamente incorrido para o trabalho realizado em uma atividade durante um período específico. É a quantia de dinheiro gasta para realizar as tarefas.'
        },
        {
            id: 'q5',
            area: 'quality',
            question: 'Qual é o principal foco do Gerenciamento da Qualidade do Projeto?',
            options: [
                { text: 'Garantir que o projeto seja concluído dentro do prazo e orçamento.', isCorrect: false },
                { text: 'Assegurar que os requisitos e os objetivos da qualidade do projeto sejam satisfeitos.', isCorrect: true },
                { text: 'Identificar e mitigar riscos de qualidade.', isCorrect: false },
                { text: 'Gerenciar as expectativas dos stakeholders em relação à qualidade.', isCorrect: false }
            ],
            explanation: 'O Gerenciamento da Qualidade do Projeto foca em garantir que o projeto e suas entregas satisfaçam os requisitos de qualidade definidos, através de políticas, processos e procedimentos.'
        },
        {
            id: 'q6',
            area: 'resources',
            question: 'O que é um Gráfico de Recursos no gerenciamento de recursos?',
            options: [
                { text: 'Uma ferramenta para alocar fundos financeiros ao projeto.', isCorrect: false },
                { text: 'Uma representação visual da alocação de recursos ao longo do tempo.', isCorrect: true },
                { text: 'Um plano para adquirir novos membros para a equipe.', isCorrect: false },
                { text: 'Um relatório sobre o desempenho de custo dos recursos.', isCorrect: false }
            ],
            explanation: 'Um Gráfico de Recursos é uma ferramenta visual que mostra a quantidade de recursos (pessoas, equipamentos, materiais) que serão utilizados em diferentes períodos do projeto, ajudando a identificar sobrecarga ou subutilização.'
        },
        {
            id: 'q7',
            area: 'communications',
            question: 'Qual é o propósito de um Plano de Gerenciamento das Comunicações?',
            options: [
                { text: 'Documentar a estrutura da equipe do projeto.', isCorrect: false },
                { text: 'Detalhar como as informações do projeto serão planejadas, coletadas, criadas, distribuídas, armazenadas e controladas.', isCorrect: true },
                { text: 'Estabelecer os métodos para resolver conflitos entre os membros da equipe.', isCorrect: false },
                { text: 'Definir as métricas de desempenho para as comunicações.', isCorrect: false }
            ],
            explanation: 'O Plano de Gerenciamento das Comunicações detalha como, quando, por quem e para quem as informações do projeto serão comunicadas, garantindo que os stakeholders recebam as informações corretas no momento certo.'
        },
        {
            id: 'q8',
            area: 'risks',
            question: 'O que é um gatilho de risco (risk trigger)?',
            options: [
                { text: 'Uma resposta planejada para um risco negativo.', isCorrect: false },
                { text: 'Um evento ou condição que indica que um risco está para ocorrer ou já ocorreu.', isCorrect: true },
                { text: 'Uma análise da probabilidade de um risco acontecer.', isCorrect: false },
                { text: 'Um plano de contingência para riscos de alto impacto.', isCorrect: false }
            ],
            explanation: 'Um gatilho de risco é um sinal ou indicador que mostra que um risco identificado está se materializando ou está prestes a se materializar, exigindo a execução de uma resposta ao risco.'
        },
        {
            id: 'q9',
            area: 'acquisitions',
            question: 'Qual documento formaliza o acordo entre o comprador e o vendedor no gerenciamento de aquisições?',
            options: [
                { text: 'Plano de Gerenciamento de Aquisições', isCorrect: false },
                { text: 'Declaração de Trabalho da Aquisição', isCorrect: false },
                { text: 'Contrato', isCorrect: true },
                { text: 'Propostas de Fornecedores', isCorrect: false }
            ],
            explanation: 'O Contrato é um acordo formal e legalmente vinculativo entre as partes envolvidas, estabelecendo os termos e condições da aquisição, incluindo escopo, cronograma, custos e penalidades.'
        },
        {
            id: 'q10',
            area: 'stakeholders',
            question: 'Qual é o objetivo da Análise de Stakeholders?',
            options: [
                { text: 'Determinar o orçamento disponível para engajar os stakeholders.', isCorrect: false },
                { text: 'Identificar todos os indivíduos ou organizações que podem ser afetados pelo projeto e analisar seu impacto e interesse.', isCorrect: true },
                { text: 'Priorizar os requisitos técnicos do projeto.', isCorrect: false },
                { text: 'Criar um cronograma detalhado para as reuniões com os stakeholders.', isCorrect: false }
            ],
            explanation: 'A Análise de Stakeholders é o processo de identificar os stakeholders do projeto, determinar seus interesses, expectativas, influência e impacto, para gerenciar efetivamente o engajamento e as comunicações.'
        }
    ];
}


// Função para exibir uma pergunta
function displayQuestion(question) {
    currentQuestion = question;
    currentQuestionDisplayElement.textContent = question.question;
    optionsContainerElement.innerHTML = ''; // Limpa opções anteriores
    selectedOption = null; // Reseta a opção selecionada
    feedbackContainer.classList.add('hidden'); // Esconde feedback anterior
    answerButton.disabled = false;
    nextCardButton.disabled = true;

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = option.text;
        button.className = 'option-button game-button'; // Tailwind classes for styling
        button.dataset.index = index;
        button.addEventListener('click', () => selectOption(button, index));
        optionsContainerElement.appendChild(button);
    });
}

// Função para selecionar uma opção de resposta
function selectOption(button, index) {
    // Remove 'selected' de todas as opções
    document.querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    // Adiciona 'selected' à opção clicada
    button.classList.add('selected');
    selectedOption = index;
    answerButton.disabled = false; // Habilita o botão de verificar resposta
}

// Função para verificar a resposta
function checkAnswer() {
    if (selectedOption === null || currentQuestion === null) {
        showMessage('Por favor, selecione uma opção antes de verificar a resposta.', 'warning');
        return;
    }

    const correctOptionIndex = currentQuestion.options.findIndex(opt => opt.isCorrect);
    const selectedOptionButton = optionsContainerElement.querySelector(`[data-index="${selectedOption}"]`);

    feedbackContainer.classList.remove('hidden'); // Mostra o contêiner de feedback

    if (selectedOption === correctOptionIndex) {
        feedbackContainer.className = 'feedback correct'; // Estilo para resposta correta
        feedbackContainer.innerHTML = `<p>${gameTranslations.feedback_correct}</p>`;
    } else {
        feedbackContainer.className = 'feedback incorrect'; // Estilo para resposta incorreta
        feedbackContainer.innerHTML = `<p>${gameTranslations.feedback_incorrect_prefix}${currentQuestion.options[correctOptionIndex].text}.</p>`;
    }

    // Exibir explicação
    feedbackContainer.innerHTML += `<p class="explanation mt-2">${gameTranslations.explanation_prefix}${currentQuestion.explanation}</p>`;

    // Desabilitar botões de opção e o botão de resposta
    document.querySelectorAll('.option-button').forEach(btn => btn.disabled = true);
    answerButton.disabled = true;
    nextCardButton.disabled = false; // Habilita o botão para próxima carta
}

// Função para avançar para a próxima carta
function nextCard(area = null) {
    feedbackContainer.classList.add('hidden'); // Esconde o feedback
    selectedOption = null; // Reseta a opção selecionada
    nextCardButton.disabled = true; // Desabilita o botão de próxima carta

    let questionsToChooseFrom = [];
    if (area && area !== 'random') {
        questionsToChooseFrom = allQuestions.filter(q => q.area === area);
    } else {
        questionsToChooseFrom = allQuestions;
    }

    if (questionsToChooseFrom.length > 0) {
        const randomIndex = Math.floor(Math.random() * questionsToChooseFrom.length);
        displayQuestion(questionsToChooseFrom[randomIndex]);
        gameCardElement.classList.remove('hidden'); // Mostra a carta do jogo
        gameAreaSelectorElement.classList.add('hidden'); // Esconde o seletor de área
    } else {
        showMessage('Não há perguntas disponíveis para esta área ou o jogo acabou!', 'info');
        gameCardElement.classList.add('hidden'); // Esconde a carta do jogo
        gameAreaSelectorElement.classList.remove('hidden'); // Mostra o seletor de área
    }
}

// Atualiza a lista de jogadores na UI
function updatePlayerList(players) {
    if (playerListElement) {
        playerListElement.innerHTML = ''; // Limpa a lista existente
        if (players && players.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'list-disc list-inside text-gray-700';
            players.forEach(player => {
                const li = document.createElement('li');
                li.textContent = `${player.username} (ID: ${player.id})`;
                if (player.id === window.currentUserId) {
                    li.classList.add('font-bold', 'text-teal-700'); // Destaca o jogador atual
                }
                ul.appendChild(li);
            });
            playerListElement.appendChild(ul);
        } else {
            playerListElement.textContent = gameTranslations.no_players_in_session || 'Nenhum jogador na sessão ainda.';
        }
    }
}

// Função para remover o jogador da sessão
async function removePlayerFromSession(sessionId, userId) {
    if (window.db && window.firestore && sessionId && userId) {
        const sessionRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, sessionId);
        try {
            await window.firestore.updateDoc(sessionRef, {
                currentPlayers: window.firestore.arrayRemove({ id: userId, username: currentUsername, joinedAt: window.firestore.serverTimestamp() })
            });
            console.log(`Jogador ${userId} removido da sessão ${sessionId}.`);
        } catch (error) {
            console.error("Erro ao remover jogador da sessão:", error);
        }
    }
}

// Adicionar event listeners para os botões e seletores de área
function addEventListeners() {
    if (answerButton) {
        answerButton.addEventListener('click', checkAnswer);
    }
    if (nextCardButton) {
        nextCardButton.addEventListener('click', () => {
            gameCardElement.classList.add('hidden'); // Esconde a carta
            gameAreaSelectorElement.classList.remove('hidden'); // Mostra o seletor de área
            feedbackContainer.classList.add('hidden'); // Esconde o feedback ao voltar para o seletor
        });
    }
    if (randomCardButton) {
        randomCardButton.addEventListener('click', () => nextCard('random'));
    }
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', async () => {
            if (currentSessionId && window.currentUserId) {
                await removePlayerFromSession(currentSessionId, window.currentUserId);
            }
            window.location.href = 'index.html'; // Redireciona para a página inicial
        });
    }

    // Adicionar listeners para os botões de área
    document.querySelectorAll('.area-button').forEach(button => {
        button.addEventListener('click', () => {
            const area = button.dataset.area;
            nextCard(area);
        });
    });
}

// Inicialização da lógica do jogo
async function initGameLogic() {
    loadingOverlay.classList.remove('hidden'); // Mostrar overlay no início

    const queryParams = getQueryParams();
    currentSessionId = queryParams.session;
    const sessionLang = queryParams.lang;

    if (!currentSessionId) {
        redirectToHome('error_no_session_id');
        return;
    }

    if (sessionLang) {
        currentLanguage = sessionLang; // Usa o idioma da sessão se disponível
    } else {
        // Tenta pegar o idioma salvo do localStorage, se não, usa o padrão
        const savedLanguage = localStorage.getItem('pm_game_language');
        if (savedLanguage && AppConfig.supportedLanguages.some(l => l.code === savedLanguage)) {
            currentLanguage = savedLanguage;
        } else {
            currentLanguage = AppConfig.defaultLanguage;
        }
    }

    const translationsLoaded = await loadTranslations(currentLanguage);
    if (!translationsLoaded) {
        console.error("Falha ao carregar as traduções do jogo. A interface pode não estar traduzida.");
    }

    displaySessionIdElement.textContent = currentSessionId;
    document.title = `${gameTranslations.game_page_base_title} - ${currentSessionId}`; // Atualiza o título da página

    // Escuta por mudanças na sessão (para jogadores)
    if (window.db && window.firestore && window.appId) {
        const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, currentSessionId);

        sessionPlayersUnsubscribe = window.firestore.onSnapshot(sessionDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const sessionData = docSnap.data();
                const players = sessionData.currentPlayers || [];
                updatePlayerList(players);
            } else {
                console.log("Sessão não encontrada ou removida.");
                redirectToHome('session_deleted_message'); // Redireciona se a sessão for removida
            }
        }, (error) => {
            console.error("Erro ao ouvir por jogadores da sessão:", error);
            showMessage("Erro ao carregar jogadores da sessão.", 'error');
        });
    } else {
        console.error("Firebase Firestore não está inicializado para listeners de jogadores.");
        redirectToHome('error_firebase_init');
        return;
    }

    await loadQuestions(); // Carrega as perguntas do jogo

    addEventListeners(); // Adiciona os event listeners

    // Esconde o overlay de carregamento e mostra o conteúdo do jogo
    loadingOverlay.classList.add('hidden');
    gameContainer.classList.remove('opacity-0', 'invisible'); // Remove classes que escondem o container
    gameAreaSelectorElement.classList.remove('hidden'); // Garante que o seletor de área esteja visível inicialmente
}


document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded disparado em gameLogic.js. Verificando AppConfig.defaultLanguage...");

    // Aguarda a inicialização do Firebase antes de iniciar a lógica do jogo
    await window.firebaseInitializedPromise;
    console.log("Firebase inicializado. Iniciando a lógica do jogo...");

    await initGameLogic();
});

// Remove o jogador da sessão quando a página é fechada ou navegada
window.addEventListener('beforeunload', async () => {
    if (currentSessionId && window.currentUserId && window.db) {
        if (sessionPlayersUnsubscribe) {
            sessionPlayersUnsubscribe(); // Desinscreve o listener
            console.log("Listener de jogadores desinscrito em beforeunload.");
        }
        await removePlayerFromSession(currentSessionId, window.currentUserId);
    }
});

