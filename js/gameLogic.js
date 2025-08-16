// js/gameLogic.js

// Importa funções utilitárias de 'utils.js'
import { showMessage, getQueryParams, getLanguageFromSessionIdString } from './utils.js';

// Variáveis de estado globais para o jogo
let allQuestions = []; // Todas as perguntas carregadas do Firestore
let currentQuestionData = null; // Objeto completo da pergunta atualmente exibida
let selectedOption = null; // Opção selecionada pelo usuário
let currentLanguage = 'pt-BR'; // Idioma atual do jogo (será determinado pela URL/sessão)

// Variáveis para o estado da sessão em tempo real
let currentSessionId = null;
let currentUserId = null;
let playersInSessionCache = {}; // Cache dos jogadores na sessão (para exibição)
let answeredQuestionsCache = new Set(); // Cache de IDs de perguntas já respondidas na sessão

// Instâncias do Firebase (acessadas via 'window' pois são inicializadas em game.html)
let db = null;
let firestore = null;
let currentAppId = null;
let auth = null; // Instância de autenticação

// Variáveis para as funções de unsubscribe dos listeners do Firestore
let unsubscribeSession = null;
let unsubscribePlayers = null;
let unsubscribeAnsweredQuestions = null;

// Referências aos elementos DOM que serão manipulados
const loadingOverlay = document.getElementById('loadingOverlay');
const gameContainer = document.getElementById('gameContainer');
const displayAppId = document.getElementById('displayAppId');
const displaySessionId = document.getElementById('displaySessionId');
const displayLanguage = document.getElementById('displayLanguage');
const playerList = document.getElementById('playerList');
const currentUserIdDisplay = document.getElementById('currentUserIdDisplay');
const currentQuestionDisplay = document.getElementById('currentQuestionDisplay');
const optionsContainer = document.getElementById('optionsContainer');
const answerButton = document.getElementById('answerButton');
const backToHomeButton = document.getElementById('backToHomeButton');
const gameAreaSelector = document.getElementById('gameAreaSelector'); // O div que contém os botões de área
const gameCard = document.getElementById('gameCard'); // O div que contém a pergunta e opções
const feedbackContainer = document.getElementById('feedbackContainer'); // Onde feedback e explicação são mostrados
const nextCardButton = document.getElementById('nextCardButton'); // Botão para a próxima carta/pergunta

// Objeto para armazenar as traduções carregadas dinamicamente
let gamePageTranslations = {};

/**
 * Carrega as traduções para a página do jogo do arquivo JSON.
 * @param {string} lang - O código do idioma a ser carregado (ex: 'pt-BR').
 */
async function loadGamePageTranslations(lang) {
    try {
        const response = await fetch(`./translations/game_translations.json`); // Caminho atualizado
        if (!response.ok) {
            throw new Error(`Erro de rede ou arquivo não encontrado: ${response.status} ${response.statusText}`);
        }
        const allTranslations = await response.json();

        if (!allTranslations[lang]) {
            throw new Error(`Idioma '${lang}' não encontrado no arquivo de traduções de jogo.`);
        }
        gamePageTranslations = allTranslations[lang];
        console.log('Traduções do jogo carregadas para', lang, ':', gamePageTranslations);
        updateUITexts(); // Atualiza os textos da UI imediatamente
    } catch (error) {
        console.error('Falha ao carregar ou processar as traduções do jogo:', error);
        // Fallback para traduções básicas em caso de erro
        gamePageTranslations = {
            game_page_base_title: "Project Management Game - Session (Error)",
            label_session: "Session (Error)",
            label_back_to_home: "Back to Home (Error)",
            label_choose_area: "Choose Area (Error):",
            area_integration: "Integration (Error)",
            area_scope: "Scope (Error)",
            area_schedule: "Schedule (Error)",
            area_cost: "Cost (Error)",
            area_quality: "Quality (Error)",
            area_resources: "Resources (Error)",
            area_communications: "Communications (Error)",
            area_risks: "Risks (Error)",
            area_acquisitions: "Procurement (Error)",
            area_stakeholders: "Stakeholders (Error)",
            button_random_card: "Random Card (Error)",
            button_check_answer: "Check Answer (Error)",
            button_next_card: "Next Card (Error)",
            feedback_correct: "Correct! (Error)",
            feedback_incorrect_prefix: "Incorrect. Correct is ",
            explanation_prefix: "Explanation: ",
            error_no_session_id: "No session ID. Redirecting.",
            error_loading_questions: "Error loading questions.",
            session_deleted_message: "Session deleted. Redirecting.",
            session_not_found_message: "Session not found. Redirecting.",
            session_load_failed_message: "Error loading session data. Redirecting.",
            no_session_id_message: "No session ID provided. Redirecting.",
            no_more_questions: "No more questions!"
        };
        updateUITexts(); // Atualiza os textos da UI com os fallbacks
    }
}

/**
 * Atualiza os textos da interface do usuário com base no idioma atual.
 * Garante que os elementos DOM existam antes de tentar atualizá-los.
 */
function updateUITexts() {
    // Garante que gamePageTranslations tem um valor válido
    if (!currentLanguage || !gamePageTranslations || Object.keys(gamePageTranslations).length === 0) {
        console.warn(`[updateUITexts] Traduções do jogo não carregadas ou idioma '${currentLanguage}' inválido.`);
        return; // Sai se as traduções não estiverem prontas
    }

    // Atualiza o título da página
    if (document.title) document.title = gamePageTranslations.game_page_base_title;

    // Atualiza textos com data-lang-key
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (gamePageTranslations[key]) {
            element.textContent = gamePageTranslations[key];
        }
    });

    // Atualiza elementos específicos (não usando data-lang-key para flexibilidade)
    if (displaySessionId) displaySessionId.textContent = currentSessionId || 'N/A';
    if (displayLanguage) displayLanguage.textContent = currentLanguage;
    if (displayAppId) displayAppId.textContent = currentAppId || 'N/A';
    if (currentUserIdDisplay) currentUserIdDisplay.textContent = currentUserId || 'N/A';

    // Atualiza o texto do botão de resposta
    if (answerButton) answerButton.textContent = gamePageTranslations.button_check_answer || "Verificar Resposta";
    if (nextCardButton) nextCardButton.textContent = gamePageTranslations.button_next_card || "Próxima Carta";

    // Re-renderiza a pergunta se houver uma ativa para garantir que as opções reflitam o idioma
    if (currentQuestionData) {
        displayQuestionInUI(currentQuestionData);
    }

    // Atualiza os textos dos botões de seleção de área (se existirem e tiverem data-area)
    document.querySelectorAll('.area-select-button').forEach(button => {
        const areaKey = `area_${button.getAttribute('data-area').toLowerCase()}`; // Ex: 'area_integration'
        if (gamePageTranslations[areaKey]) {
            button.textContent = gamePageTranslations[areaKey];
        }
    });
    // Atualiza o botão de carta aleatória
    const randomCardButton = document.getElementById('randomCardButton');
    if (randomCardButton) {
        randomCardButton.textContent = gamePageTranslations.button_random_card || "Carta Aleatória";
    }
}

/**
 * Carrega as perguntas do Firestore com base no idioma da sessão.
 */
async function loadQuestions() {
    try {
        if (!db || !currentAppId || !firestore) {
            throw new Error("Objetos Firebase não inicializados para carregar perguntas.");
        }

        const questionsColRef = firestore.collection(db, `artifacts/${currentAppId}/public/data/questions`);
        const q = firestore.query(questionsColRef, firestore.where('language', '==', currentLanguage));
        const querySnapshot = await firestore.getDocs(q);

        allQuestions = []; // Limpa perguntas anteriores
        querySnapshot.forEach((doc) => {
            allQuestions.push({ id: doc.id, ...doc.data() }); // Inclui o ID do documento
        });

        if (allQuestions.length === 0) {
            console.warn("Nenhuma pergunta encontrada para o idioma:", currentLanguage);
            showMessage(gamePageTranslations.no_more_questions, 'info');
            answerButton.disabled = true;
            if (currentQuestionDisplay) currentQuestionDisplay.textContent = gamePageTranslations.no_more_questions;
        } else {
            console.log(`Perguntas em ${currentLanguage} carregadas com sucesso: ${allQuestions.length} perguntas.`);
            // A exibição da primeira pergunta será controlada pela sessão ou pelo usuário
        }
    } catch (error) {
        console.error("Erro ao carregar perguntas:", error);
        showMessage(`${gamePageTranslations.error_loading_questions}: ${error.message}`, 'error');
        if (currentQuestionDisplay) currentQuestionDisplay.textContent = gamePageTranslations.error_loading_questions;
        answerButton.disabled = true;
    }
}

/**
 * Adiciona ou atualiza um jogador na subcoleção 'players' da sessão e no array 'currentPlayers'.
 * @param {string} sessionId - O ID da sessão.
 * @param {string} userId - O ID do usuário.
 * @param {string} [userName] - O nome do usuário (opcional, padrão gerado).
 */
async function addOrUpdatePlayerToSession(sessionId, userId, userName = `Jogador_${userId.substring(0,4)}`) {
    if (!db || !firestore || !currentAppId) {
        console.error("Firebase não está pronto para adicionar/atualizar jogador.");
        return;
    }
    const playerDocRef = firestore.doc(db, `artifacts/${currentAppId}/public/data/sessions/${sessionId}/players`, userId);
    const sessionDocRef = firestore.doc(db, `artifacts/${currentAppId}/public/data/sessions`, sessionId);

    try {
        let playerInitialScore = 0;
        const playerSnap = await firestore.getDoc(playerDocRef);
        if (playerSnap.exists()) {
            playerInitialScore = playerSnap.data().score || 0;
        }

        // Atualiza o documento do jogador na subcoleção 'players'
        await firestore.setDoc(playerDocRef, {
            uid: userId,
            name: userName,
            score: playerInitialScore,
            lastActive: firestore.serverTimestamp(),
            status: "connected"
        }, { merge: true });

        // Tenta adicionar o userId ao array currentPlayers no documento principal da sessão
        // arrayUnion só adiciona se o elemento ainda não existe, evitando duplicatas.
        await firestore.updateDoc(sessionDocRef, {
            currentPlayers: firestore.arrayUnion(userId) // Apenas o ID do usuário
        });

        console.log(`Jogador ${userId} adicionado/atualizado na sessão ${sessionId}.`);

    } catch (error) {
        console.error("Erro ao adicionar/atualizar jogador na sessão:", error);
    }
}

/**
 * Remove um jogador da sessão no Firestore (marca como desconectado e remove do array).
 * @param {string} sessionId - O ID da sessão.
 * @param {string} userId - O ID do usuário a ser removido.
 */
async function removePlayerFromSession(sessionId, userId) {
    if (!db || !firestore || !currentAppId) {
        console.error("Firebase não está pronto para remover jogador.");
        return;
    }
    const sessionDocRef = firestore.doc(db, `artifacts/${currentAppId}/public/data/sessions`, sessionId);
    const playerDocRef = firestore.doc(db, `artifacts/${currentAppId}/public/data/sessions/${sessionId}/players`, userId);

    try {
        // Marca o jogador como desconectado na subcoleção 'players'
        await firestore.updateDoc(playerDocRef, {
            status: "disconnected",
            lastActive: firestore.serverTimestamp()
        });
        console.log(`Jogador ${userId} marcado como desconectado na subcoleção 'players'.`);

        // Remove o userId do array 'currentPlayers' no documento principal da sessão
        await firestore.updateDoc(sessionDocRef, {
            currentPlayers: firestore.arrayRemove(userId)
        });
        console.log(`Usuário ${userId} removido do array 'currentPlayers' da sessão.`);

    } catch (error) {
        console.error("Erro ao remover jogador da sessão:", error);
    }
}

/**
 * Atualiza o estado de um documento de sessão no Firestore.
 * @param {string} sessionId - O ID da sessão a ser atualizada.
 * @param {object} data - Os dados a serem atualizados no documento da sessão.
 */
async function updateSessionState(sessionId, data) {
    if (!db || !firestore || !currentAppId) {
        console.error("Firebase não está pronto para atualizar estado da sessão.");
        return;
    }
    const sessionDocRef = firestore.doc(db, `artifacts/${currentAppId}/public/data/sessions`, sessionId);
    try {
        await firestore.updateDoc(sessionDocRef, data);
        console.log(`Estado da sessão ${sessionId} atualizado no Firestore.`, data);
    } catch (error) {
        console.error("Erro ao atualizar estado da sessão:", error);
    }
}

/**
 * Configura os listeners em tempo real para as mudanças na sessão do Firestore.
 * @param {string} sessionId - O ID da sessão a ser ouvida.
 */
function listenToSessionChanges(sessionId) {
    if (!db || !firestore || !currentAppId) {
        console.error("Firebase não está pronto para ouvir mudanças na sessão.");
        return;
    }
    const sessionDocRef = firestore.doc(db, `artifacts/${currentAppId}/public/data/sessions`, sessionId);

    // Listener principal para o documento da sessão
    unsubscribeSession = firestore.onSnapshot(sessionDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const sessionData = docSnap.data();
            console.log("Dados da sessão atualizados (onSnapshot):", sessionData);

            // Se houver uma nova pergunta ativa na sessão, exibe-a
            if (sessionData.currentQuestion) {
                // Só atualiza se a pergunta for diferente ou se a carta estiver escondida
                if (sessionData.currentQuestion.id !== currentQuestionData?.id || gameCard.classList.contains('hidden')) {
                    console.log("Nova pergunta ativa detectada ou carta precisa ser exibida:", sessionData.currentQuestion.questionText);
                    displayQuestionInUI(sessionData.currentQuestion);
                }
            } else {
                // Nenhuma pergunta ativa, retorna para o seletor de área
                if (gameCard) gameCard.classList.add('hidden');
                if (gameAreaSelector) gameAreaSelector.classList.remove('hidden');
                if (feedbackContainer) feedbackContainer.innerHTML = ''; // Limpa feedback anterior
                if (nextCardButton) nextCardButton.classList.add('hidden'); // Esconde botão de próxima carta
                currentQuestionData = null; // Limpa a pergunta atual
            }

        } else {
            // Sessão não existe mais (foi excluída ou nunca existiu)
            console.error(`Sessão ${sessionId} não existe ou foi excluída.`);
            showMessage(gamePageTranslations.session_deleted_message, 'error');
            // Redireciona para a página inicial após um breve atraso
            setTimeout(() => window.location.href = 'index.html', 3000);
        }
    }, (error) => {
        console.error("Erro ao ouvir a sessão:", error);
        showMessage(`${gamePageTranslations.session_load_failed_message}: ${error.message}`, 'error');
    });

    // Listener para a subcoleção de jogadores na sessão
    const playersColRef = firestore.collection(db, `artifacts/${currentAppId}/public/data/sessions/${sessionId}/players`);
    unsubscribePlayers = firestore.onSnapshot(playersColRef, (snapshot) => {
        playerList.innerHTML = ''; // Limpa a lista de jogadores
        playersInSessionCache = {}; // Limpa o cache
        if (snapshot.empty) {
            const li = document.createElement('li');
            li.textContent = 'Nenhum jogador ainda...';
            playerList.appendChild(li);
        } else {
            snapshot.forEach((doc) => {
                const playerData = doc.data();
                playersInSessionCache[doc.id] = playerData; // Adiciona ao cache

                const li = document.createElement('li');
                // Formata a data de última atividade
                const lastActiveDate = playerData.lastActive ? new Date(playerData.lastActive.seconds * 1000).toLocaleString() : 'N/A';
                li.textContent = `${playerData.name || playerData.uid} (Última atividade: ${lastActiveDate}) - Pontuação: ${playerData.score || 0}`;
                playerList.appendChild(li);
            });
        }
    });

    // Listener para as perguntas já respondidas na sessão
    const answeredQuestionsColRef = firestore.collection(db, `artifacts/${currentAppId}/public/data/sessions/${sessionId}/answeredQuestions`);
    unsubscribeAnsweredQuestions = firestore.onSnapshot(answeredQuestionsColRef, (snapshot) => {
        answeredQuestionsCache.clear();
        snapshot.forEach((doc) => {
            answeredQuestionsCache.add(doc.data().originalQuestionId); // Armazena o ID original da pergunta
        });
        console.log("Perguntas respondidas atualizadas (cache):", Array.from(answeredQuestionsCache));
    });
}

/**
 * Filtra as perguntas disponíveis, excluindo as já respondidas e, opcionalmente, por área.
 * @param {string|null} areaFilter - A área para filtrar as perguntas, ou null para todas as áreas.
 * @returns {Array<object>} Um array de perguntas não respondidas.
 */
function getUnansweredQuestions(areaFilter = null) {
    let questionsToConsider = allQuestions;

    if (areaFilter) {
        questionsToConsider = questionsToConsider.filter(q => q.area === areaFilter);
    }
    
    // Filtra as perguntas que não estão no cache de perguntas respondidas
    return questionsToConsider.filter(q => !answeredQuestionsCache.has(q.id)); // Usa q.id que é o originalId
}

/**
 * Seleciona e define uma nova pergunta ativa na sessão do Firestore.
 * Chamada quando um jogador 'puxa' uma carta.
 * @param {string|null} areaFilter - Opcional, a área para filtrar a pergunta.
 */
async function setNextActiveQuestion(areaFilter = null) {
    const unansweredQuestions = getUnansweredQuestions(areaFilter);

    if (unansweredQuestions.length === 0) {
        showMessage(gamePageTranslations.no_more_questions, 'info');
        // Opcional: Marcar sessão como concluída se não houver mais perguntas
        // await updateSessionState(currentSessionId, { status: "completed" });
        return;
    }

    const randomIndex = Math.floor(Math.random() * unansweredQuestions.length);
    const questionToActivate = unansweredQuestions[randomIndex];

    // Atualiza o documento da sessão com a nova pergunta ativa
    await updateSessionState(currentSessionId, {
        currentQuestion: {
            id: questionToActivate.id, // O ID do documento da pergunta no Firestore
            area: questionToActivate.area,
            questionText: questionToActivate.question,
            options: questionToActivate.options,
            correctAnswer: questionToActivate.correct,
            explanation: questionToActivate.explanation,
            askedByPlayerId: currentUserId,
            timestampAsked: firestore.serverTimestamp()
        }
    });
    console.log(`Nova pergunta ativa definida na sessão: ${questionToActivate.question}`);
}

/**
 * Exibe a pergunta na interface do usuário (UI).
 * Esta função é chamada quando o 'currentQuestion' da sessão muda.
 * @param {object} question - O objeto da pergunta a ser exibida.
 */
function displayQuestionInUI(question) {
    currentQuestionData = question; // Armazena a pergunta atual
    selectedOption = null; // Reseta a opção selecionada
    
    // Habilita o botão de resposta e remove classes de desabilitação
    if (answerButton) {
        answerButton.disabled = false;
        answerButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if (nextCardButton) nextCardButton.classList.add('hidden'); // Esconde o botão de próxima carta

    // Limpa feedback e opções anteriores
    if (feedbackContainer) feedbackContainer.innerHTML = '';
    if (optionsContainer) optionsContainer.innerHTML = '';

    // Esconde o seletor de área e mostra a carta do jogo
    if (gameAreaSelector) gameAreaSelector.classList.add('hidden');
    if (gameCard) gameCard.classList.remove('hidden');

    // Atualiza o texto da pergunta e da área
    if (document.getElementById('questionArea')) document.getElementById('questionArea').textContent = question.area;
    if (currentQuestionDisplay) currentQuestionDisplay.textContent = question.questionText;

    // Cria os botões de opção
    if (question.options) {
        const optionEntries = Object.entries(question.options).sort(); // Garante ordem A, B, C, D
        optionEntries.forEach(([key, value]) => {
            const optionButton = document.createElement('button');
            optionButton.className = 'option-button bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-5 rounded-lg text-left w-full shadow';
            optionButton.innerHTML = `<span class="font-bold mr-2">${key})</span> ${value}`;
            optionButton.setAttribute('data-option', key);

            optionButton.addEventListener('click', () => {
                document.querySelectorAll('.option-button').forEach(btn => { btn.classList.remove('selected'); });
                optionButton.classList.add('selected');
                selectedOption = key; // Armazena a opção selecionada
                if (answerButton) {
                    answerButton.disabled = false;
                    answerButton.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            });
            optionsContainer.appendChild(optionButton);
        });
    }
}

/**
 * Função para lidar com a submissão de uma resposta pelo usuário.
 */
async function handleSubmitAnswer() {
    if (!currentQuestionData || !selectedOption) {
        showMessage('Por favor, selecione uma opção antes de responder.', 'info');
        return;
    }

    // Desabilita as opções e o botão de resposta para evitar múltiplas submissões
    document.querySelectorAll('.option-button').forEach(btn => { btn.disabled = true; });
    if (answerButton) {
        answerButton.disabled = true;
        answerButton.classList.add('opacity-50', 'cursor-not-allowed');
    }

    const isCorrect = (selectedOption === currentQuestionData.correctAnswer);

    // Limpa feedback anterior
    if (feedbackContainer) feedbackContainer.innerHTML = '';

    const feedbackDiv = document.createElement('div');
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'explanation'; // Estilo definido em style.css

    if (isCorrect) {
        feedbackDiv.className = 'feedback correct';
        feedbackDiv.textContent = gamePageTranslations.feedback_correct;
    } else {
        feedbackDiv.className = 'feedback incorrect';
        feedbackDiv.textContent = `${gamePageTranslations.feedback_incorrect_prefix}${currentQuestionData.correctAnswer}) ${currentQuestionData.options[currentQuestionData.correctAnswer]}`;
    }
    explanationDiv.textContent = `${gamePageTranslations.explanation_prefix}${currentQuestionData.explanation}`;

    feedbackContainer.appendChild(feedbackDiv);
    feedbackContainer.appendChild(explanationDiv);

    // Atualiza o Firestore com a resposta e pontuação
    const answeredQuestionDocRef = firestore.doc(db, `artifacts/${currentAppId}/public/data/sessions/${currentSessionId}/answeredQuestions`, currentQuestionData.id);
    const playerDocRef = firestore.doc(db, `artifacts/${currentAppId}/public/data/sessions/${currentSessionId}/players`, currentUserId);

    try {
        // Atualiza a pergunta como respondida
        await firestore.setDoc(answeredQuestionDocRef, {
            originalQuestionId: currentQuestionData.id,
            area: currentQuestionData.area,
            answeredByAnyPlayer: true, // Marca que foi respondida por alguém na sessão
            timestampAnswered: firestore.serverTimestamp(),
            // Adiciona/remove o usuário da lista de quem acertou
            answeredCorrectlyBy: isCorrect ? firestore.arrayUnion(currentUserId) : firestore.arrayRemove(currentUserId)
        }, { merge: true });

        // Atualiza a pontuação do jogador se a resposta estiver correta
        if (isCorrect) {
            await firestore.updateDoc(playerDocRef, {
                score: (playersInSessionCache[currentUserId]?.score || 0) + 1,
                lastActive: firestore.serverTimestamp()
            });
            console.log(`Pontuação de ${currentUserId} atualizada.`);
        } else {
            // Apenas atualiza o 'lastActive' se a resposta for incorreta
            await firestore.updateDoc(playerDocRef, {
                lastActive: firestore.serverTimestamp()
            });
        }
        console.log(`Pergunta ${currentQuestionData.id} respondida e pontuação/status atualizados.`);

    } catch (error) {
        console.error("Erro ao atualizar pergunta respondida ou pontuação no Firestore:", error);
        showMessage("Erro ao registrar sua resposta.", 'error');
    }

    if (nextCardButton) nextCardButton.classList.remove('hidden'); // Mostra o botão de próxima carta
}

/**
 * Função principal para inicializar e iniciar a lógica do jogo.
 * É chamada após o Firebase ser inicializado e autenticado.
 */
export async function startGame() {
    // Garante que o Firebase e as variáveis globais estão disponíveis
    await window.firebaseInitializedPromise; // Aguarda a promessa de inicialização do Firebase

    // Atribui as instâncias globais do Firebase às variáveis locais para facilitar o uso
    db = window.db;
    firestore = window.firestore;
    currentAppId = window.appId;
    auth = window.auth; // Acessa a instância de autenticação
    currentUserId = window.currentUserId;

    // Obtém os parâmetros da URL para o ID da sessão e idioma
    const params = getQueryParams();
    currentSessionId = params.session;
    let langFromUrl = params.lang;

    console.log(`[startGame] Parâmetros da URL: session='${currentSessionId}', lang='${langFromUrl}'`);
    console.log(`[startGame] App ID (do window.appId): ${currentAppId}`);
    console.log(`[startGame] User ID (do window.currentUserId): ${currentUserId}`);

    if (!currentSessionId) {
        // Se não houver ID de sessão na URL, redireciona para a página inicial
        console.error(`[startGame] Nenhum ID de sessão encontrado no parâmetro 'session' da URL.`);
        // Garante que o idioma padrão seja carregado para a mensagem de erro antes do redirect
        await loadGamePageTranslations(window.AppConfig.defaultLanguage);
        showMessage(gamePageTranslations.no_session_id_message, 'error');
        setTimeout(() => window.location.href = 'index.html', 3000);
        return;
    }

    // Exibe o ID do usuário, ID da sessão e o App ID na UI (inicialmente)
    if (currentUserIdDisplay) currentUserIdDisplay.textContent = currentUserId;
    if (displaySessionId) displaySessionId.textContent = currentSessionId;
    if (displayAppId) displayAppId.textContent = currentAppId;

    // Lógica de determinação do idioma:
    // 1. Prioridade: idioma do parâmetro 'lang' da URL
    if (langFromUrl && window.AppConfig.supportedLanguages.includes(langFromUrl)) { // Supondo uma lista de idiomas suportados no AppConfig
        currentLanguage = langFromUrl;
        console.log(`[startGame] Idioma definido a partir da URL: ${currentLanguage}`);
    } else {
        // 2. Prioridade: idioma inferido do ID da sessão (se o formato for "XXXXLLLL")
        let langFromSessionId = getLanguageFromSessionIdString(currentSessionId);
        if (langFromSessionId && window.AppConfig.supportedLanguages.includes(langFromSessionId)) {
            currentLanguage = langFromSessionId;
            console.log(`[startGame] Idioma definido a partir do ID da sessão: ${currentLanguage}`);
        } else {
            // 3. Prioridade: idioma padrão do AppConfig (fallback)
            currentLanguage = window.AppConfig.defaultLanguage;
            console.warn(`[startGame] Idioma não determinado pela URL ou ID da sessão. Usando '${currentLanguage}' como padrão.`);
        }
    }
    // Carrega as traduções para a página do jogo com o idioma final determinado
    document.documentElement.lang = currentLanguage; // Define o atributo lang do HTML
    await loadGamePageTranslations(currentLanguage);


    // Referência ao documento da sessão no Firestore
    const sessionDocRef = firestore.doc(db, `artifacts/${currentAppId}/public/data/sessions`, currentSessionId);

    try {
        const docSnap = await firestore.getDoc(sessionDocRef);

        if (docSnap.exists()) {
            const sessionData = docSnap.data();
            console.log(`[startGame] Sessão '${currentSessionId}' encontrada no Firestore.`, sessionData);

            // Adiciona o jogador atual à sessão ou o atualiza (lastActive, score)
            await addOrUpdatePlayerToSession(currentSessionId, currentUserId);

            // Inicia os listeners em tempo real para as mudanças na sessão
            listenToSessionChanges(currentSessionId);

            // Carrega TODAS as perguntas para o jogo no idioma determinado
            await loadQuestions();

            // Exibe a pergunta ativa se houver, ou o seletor de área
            if (sessionData.currentQuestion) {
                displayQuestionInUI(sessionData.currentQuestion);
            } else {
                if (gameAreaSelector) gameAreaSelector.classList.remove('hidden');
                if (gameCard) gameCard.classList.add('hidden');
            }

        } else {
            // Sessão não encontrada no Firestore
            console.error(`[startGame] Sessão '${currentSessionId}' não encontrada no Firestore. Redirecionando para a página inicial.`);
            showMessage(gamePageTranslations.session_not_found_message, 'error');
            setTimeout(() => window.location.href = 'index.html', 3000);
            return;
        }
    } catch (e) {
        // Erro ao carregar ou ingressar na sessão Firestore
        console.error("[startGame] Erro ao carregar ou ingressar na sessão Firestore: ", e);
        showMessage(`${gamePageTranslations.session_load_failed_message}: ${e.message}`, 'error');
        setTimeout(() => window.location.href = 'index.html', 3000);
        return;
    }

    // Esconde o overlay de carregamento e mostra o conteúdo do jogo
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    if (gameContainer) gameContainer.classList.remove('hidden');


    // ===========================================
    // CONFIGURAÇÃO DOS EVENT LISTENERS DO JOGO
    // ===========================================

    // Botão de Resposta
    if (answerButton) {
        answerButton.addEventListener('click', handleSubmitAnswer);
    }

    // Botões de Seleção de Área (Integração, Escopo, etc.)
    document.querySelectorAll('.area-select-button').forEach(button => {
        button.addEventListener('click', () => {
            const areaName = button.getAttribute('data-area'); // Ex: 'Integration'
            setNextActiveQuestion(areaName);
        });
    });

    // Botão de Carta Aleatória
    const randomCardButton = document.getElementById('randomCardButton');
    if (randomCardButton) {
        randomCardButton.addEventListener('click', () => {
            if (allQuestions.length === 0) {
                showMessage(gamePageTranslations.error_loading_questions, 'warning');
                return;
            }
            setNextActiveQuestion(null); // Puxa uma carta aleatória de qualquer área
        });
    }

    // Botão de Próxima Carta (aparece após responder)
    if (nextCardButton) {
        nextCardButton.addEventListener('click', async () => {
            // Limpa a pergunta ativa na sessão, o que acionará o onSnapshot para mudar a UI
            await updateSessionState(currentSessionId, { currentQuestion: null });
            // A UI será atualizada pelo onSnapshot que detectará currentQuestion = null
        });
    }

    // Botão "Voltar para o Início"
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', async () => {
            console.log('Botão "Voltar para o Início" clicado!');
            // Desinscreve-se de todos os listeners do Firestore antes de sair
            if (unsubscribeSession) unsubscribeSession();
            if (unsubscribePlayers) unsubscribePlayers();
            if (unsubscribeAnsweredQuestions) unsubscribeAnsweredQuestions();

            // Remove o jogador da sessão ao sair (marca como desconectado)
            if (currentSessionId && currentUserId) {
                await removePlayerFromSession(currentSessionId, currentUserId);
            }
            window.location.href = 'index.html'; // Redireciona
        });
    }

    // Lida com o usuário saindo (fechando a aba/navegador)
    window.addEventListener('beforeunload', async () => {
        // Verifica se os objetos Firebase estão definidos antes de tentar remover o jogador
        if (currentSessionId && currentUserId && db && firestore) {
            await removePlayerFromSession(currentSessionId, currentUserId);
        }
    });
}

// O ponto de entrada principal após o DOM estar carregado
document.addEventListener('DOMContentLoaded', async () => {
    // Mostra o overlay de carregamento no início
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    if (gameContainer) gameContainer.classList.add('hidden');

    console.log("DOMContentLoaded disparado no game.js. Aguardando inicialização do Firebase...");

    // Inicia a lógica do jogo. Ele aguardará internamente a inicialização do Firebase.
    await startGame();
});
