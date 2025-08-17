// js/gameLogic.js

// Importa todas as exportações do módulo firebaseExports.js
import * as Firebase from './firebaseExports.js';
// Importa a função showMessage e outras de utils.js
import { showMessage, getQueryParams, getLanguageFromSessionIdString } from './utils.js';

let allQuestions = []; // Todas as perguntas carregadas do Firestore para o idioma da sessão
let currentQuestion = null; // A pergunta atualmente exibida na carta
let selectedOption = null; // A opção selecionada pelo jogador local
let currentLanguage = AppConfig.defaultLanguage; // Idioma padrão (será sobrescrito pelo idioma da sessão)

let translations = {}; // Objeto para armazenar as traduções de textos estáticos da UI em game.html

// Variáveis para o estado da sessão em tempo real
let currentSessionId = null; // O ID da sessão atual
let currentSessionDocRef = null; // Referência ao documento da sessão no Firestore
let answeredQuestionsCache = new Set(); // Cache local dos originalIds das perguntas já respondidas na sessão
let playersInSessionCache = {}; // Cache local dos jogadores e suas pontuações na sessão
let unsubscribeSession = null; // Para gerenciar a "escuta" em tempo real do documento da sessão
let unsubscribeAnsweredQuestions = null; // Para gerenciar a "escuta" em tempo real das perguntas respondidas
let unsubscribePlayers = null; // Para gerenciar a "escuta" em tempo real dos jogadores

// Elementos do DOM
const displaySessionIdElement = document.getElementById('displaySessionId'); // displaySessionId
const playerListElement = document.getElementById('playerList');
const gameAreaSelectorElement = document.getElementById('gameAreaSelector'); // gameAreaSelector
const gameCardElement = document.getElementById('gameCard'); // gameCard
const questionAreaElement = document.getElementById('questionArea'); // questionArea
const currentQuestionDisplayElement = document.getElementById('currentQuestionDisplay'); // currentQuestionDisplay
const optionsContainerElement = document.getElementById('optionsContainer');
const answerButton = document.getElementById('answerButton'); // answerButton
const nextCardButton = document.getElementById('nextCardButton');
const feedbackContainer = document.getElementById('feedbackContainer');
const backToHomeButton = document.getElementById('backToHomeButton');
const randomCardButton = document.getElementById('randomCardButton');
const loadingOverlay = document.getElementById('loadingOverlay');
const gameContainer = document.getElementById('gameContainer'); // gameContainer

// Tenta pegar o username do localStorage ou define um padrão
let currentUsername = localStorage.getItem('pm_game_username') || `Usuário_${Firebase.currentUserId?.substring(0,4) || 'Anônimo'}`;


/**
 * Carrega as traduções para o idioma especificado.
 * @param {string} lang - O código do idioma (ex: 'pt-BR').
 */
async function loadUITranslations(lang) {
    try {
        const response = await fetch(`data/translations/game_translations.json`); 
        if (!response.ok) {
            throw new Error(`Erro de rede ou arquivo de tradução não encontrado: ${response.status} ${response.statusText}`);
        }
        const allGameTranslations = await response.json();
        
        if (!allGameTranslations[lang]) {
            console.warn(`Traduções para o idioma '${lang}' não encontradas em game_translations.json. Usando 'pt-BR' como fallback.`);
            lang = 'pt-BR'; 
            if (!allGameTranslations[lang]) {
                console.error("Erro fatal: Fallback para 'pt-BR' também falhou. Certifique-se de que 'pt-BR' está definido em game_translations.json.");
                translations = {}; 
                return;
            }
        }
        translations = allGameTranslations[lang]; 
        console.log(`Traduções de UI para game.html carregadas para ${lang}:`, translations);
    } catch (error) {
        console.error('Falha ao carregar as traduções da UI para game.html:', error);
        // Fallback de mensagens de erro se as traduções não carregarem
        translations = { 
            game_page_base_title: "Game Session Error",
            label_session: "Session", label_back_to_home: "Back", label_choose_area: "Choose Area:",
            area_integration: "Integration", area_scope: "Scope", area_schedule: "Schedule", area_cost: "Costs", 
            area_quality: "Quality", area_resources: "Resources", area_communications: "Comms", area_risks: "Risks", 
            area_acquisitions: "Acquisitions", area_stakeholders: "Stakeholders",
            button_random_card: "Random Card", button_check_answer: "Check", button_next_card: "Next Card",
            feedback_correct: "Correct!", feedback_incorrect_prefix: "Incorrect. Correct is ", explanation_prefix: "Explanation: ",
            error_no_session_id: "No Session ID. Redirecting.", error_loading_questions: "Error loading questions.",
            label_area_title: "Area" // Adicionado para consistência
        };
    }
    updateUITexts(); 
}

/**
 * Aplica as traduções aos elementos DOM com o atributo data-lang-key.
 */
function updateUITexts() {
    if (Object.keys(translations).length === 0) {
        console.warn("updateUITexts: Objeto de traduções vazio.");
        return;
    }

    document.getElementById('labelSession').textContent = translations.label_session;
    document.getElementById('labelBackToHome').textContent = translations.label_back_to_home;
    document.getElementById('labelChooseArea').textContent = translations.label_choose_area;
    
    document.title = translations.game_page_base_title;

    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (translations[key]) { 
            element.textContent = translations[key];
        } else {
            console.warn(`updateUITexts: Chave de tradução '${key}' não encontrada para o idioma '${currentLanguage}'.`);
        }
    });

    if (currentQuestion) {
        displayQuestionInUI(currentQuestion); 
    }
}


/**
 * Carrega as perguntas do Firestore.
 * @param {string} lang - O código do idioma para filtrar as perguntas.
 */
async function loadQuestionsFromFirestore(lang) {
    const db = Firebase.db; 
    const appId = Firebase.APP_ID;

    if (!db) {
        console.error("Firestore DB não inicializado. Não foi possível carregar as perguntas.");
        showMessage(translations.error_firebase_init || "Firebase não inicializado.", 'error');
        return [];
    }

    try {
        const q = Firebase.query(Firebase.collection(db, `artifacts/${appId}/public/data/questions`), Firebase.where("language", "==", lang));
        const querySnapshot = await Firebase.getDocs(q);
        const questions = [];
        querySnapshot.forEach((doc) => {
            questions.push({ id: doc.id, ...doc.data() }); 
        });
        allQuestions = questions;
        console.log(`Perguntas em ${lang} carregadas com sucesso do Firestore:`, allQuestions.length);

        // Habilita os botões de seleção de área/carta aleatória uma vez que as perguntas estão carregadas
        const areaButtons = document.querySelectorAll('#gameAreaSelector .area-select-button');
        areaButtons.forEach(button => button.disabled = false);
        randomCardButton.disabled = false;
        return questions;
    } catch (error) {
        console.error('Falha ao carregar as perguntas do Firestore:', error);
        showMessage(translations.error_loading_questions || "Erro ao carregar perguntas.", 'error');
        gameAreaSelectorElement.innerHTML = `<p class="text-red-600">${translations.error_loading_questions || "Erro ao carregar perguntas."}</p>`;
        const areaButtons = document.querySelectorAll('#gameAreaSelector .area-select-button');
        areaButtons.forEach(button => button.disabled = true);
        randomCardButton.disabled = true;
        return [];
    }
}


/**
 * Função para filtrar perguntas já respondidas (usando o cache local).
 * @param {string|null} areaFilter - A área para filtrar as perguntas.
 */
function getUnansweredQuestions(areaFilter = null) {
    let availableQuestions = allQuestions;

    if (areaFilter) {
        availableQuestions = availableQuestions.filter(q => q.area === areaFilter); 
    }
    
    // Filtra as perguntas que já foram respondidas na sessão (pelo originalId)
    return availableQuestions.filter(q => !answeredQuestionsCache.has(q.originalId));
}

/**
 * Função para iniciar uma nova pergunta (puxa carta).
 * Esta função ATUALIZA o Firestore, o que acionará o onSnapshot em outros clientes.
 * @param {string|null} areaFilter - A área para filtrar as perguntas.
 */
async function displayNextQuestion(areaFilter = null) {
    // Adicionar aqui lógica de permissão (ex: apenas o host pode puxar carta)
    // if (Firebase.currentUserId !== playersInSessionCache[sessionData.hostId]?.uid) { showMessage("Apenas o host pode puxar a carta.", 'warning'); return; }

    const unansweredQuestions = getUnansweredQuestions(areaFilter);

    if (unansweredQuestions.length === 0) {
        showMessage(translations.no_more_questions || "Não há mais perguntas disponíveis para esta área/idioma!", 'info');
        // Opcional: Marcar a sessão como concluída no Firestore
        await updateSessionState(currentSessionId, { status: "completed" });
        return;
    }

    // Seleciona uma pergunta aleatória das não respondidas
    const randomIndex = Math.floor(Math.random() * unansweredQuestions.length);
    const questionToAsk = unansweredQuestions[randomIndex];

    // Atualiza o estado da sessão no Firestore com a nova pergunta
    await updateSessionState(currentSessionId, { 
        currentQuestion: {
            id: questionToAsk.id, // ID do documento Firestore da pergunta
            originalId: questionToAsk.originalId,
            area: questionToAsk.area,
            questionText: questionToAsk.question, // Texto da pergunta
            options: questionToAsk.options,
            correctAnswer: questionToAsk.correct, // Resposta correta
            explanation: questionToAsk.explanation,
            askedByPlayerId: Firebase.currentUserId, // Quem puxou a carta
            timestampAsked: Firebase.serverTimestamp() // Timestamp do servidor
        }
    });
}

/**
 * Função para exibir a pergunta na UI (chamada pelo listener onSnapshot).
 * @param {object} question - O objeto da pergunta a ser exibida.
 */
function displayQuestionInUI(question) {
    currentQuestion = question;
    selectedOption = null;
    answerButton.disabled = false; 
    answerButton.classList.remove('opacity-50', 'cursor-not-allowed');
    nextCardButton.classList.add('hidden'); 

    questionAreaElement.textContent = `${translations.label_area_title || "Área"}: ${question.area}`;
    currentQuestionDisplayElement.textContent = question.questionText; 
    optionsContainerElement.innerHTML = '';
    feedbackContainer.innerHTML = '';

    const options = question.options;

    // Converte o objeto de opções em um array para iterar
    const optionKeys = Object.keys(options).sort(); // Garante ordem A, B, C...
    for (const key of optionKeys) {
        const optionButton = document.createElement('button');
        optionButton.className = 'option-button bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-5 rounded-lg text-left w-full shadow';
        optionButton.innerHTML = `<span class="font-bold mr-2">${key})</span> ${options[key]}`;
        optionButton.setAttribute('data-option', key);

        optionButton.addEventListener('click', () => {
            document.querySelectorAll('.option-button').forEach(btn => {
                btn.classList.remove('selected');
            });
            optionButton.classList.add('selected');
            selectedOption = key;
            answerButton.disabled = false; 
            answerButton.classList.remove('opacity-50', 'cursor-not-allowed');
        });
        optionsContainerElement.appendChild(optionButton);
    }

    gameAreaSelectorElement.classList.add('hidden');
    gameCardElement.classList.remove('hidden');
}

/**
 * Verifica a resposta selecionada e exibe feedback.
 */
answerButton.addEventListener('click', async () => {
    if (!currentQuestion || selectedOption === null) { // Mudado para checar selectedOption === null
        showMessage('Por favor, selecione uma opção antes de verificar a resposta.', 'warning');
        return;
    }

    // Desabilita os botões para evitar cliques múltiplos
    document.querySelectorAll('.option-button').forEach(btn => { btn.disabled = true; });
    answerButton.disabled = true;
    answerButton.classList.add('opacity-50', 'cursor-not-allowed');

    feedbackContainer.innerHTML = '';
    const feedbackDiv = document.createElement('div');
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'explanation text-left';

    const isCorrect = (selectedOption === currentQuestion.correctAnswer);

    if (isCorrect) {
        feedbackDiv.className = 'feedback correct';
        feedbackDiv.textContent = translations.feedback_correct;
    } else {
        feedbackDiv.className = 'feedback incorrect';
        feedbackDiv.textContent = (translations.feedback_incorrect_prefix || "Ops! Resposta Incorreta. A resposta correta é ") + `${currentQuestion.correctAnswer}).`;
    }
    explanationDiv.textContent = (translations.explanation_prefix || "Explicação: ") + currentQuestion.explanation;

    feedbackContainer.appendChild(feedbackDiv);
    feedbackContainer.appendChild(explanationDiv);

    // Atualiza o estado da pergunta respondida na subcoleção answeredQuestions do Firestore
    const answeredQuestionDocRef = Firebase.doc(Firebase.db, `artifacts/${Firebase.APP_ID}/public/data/sessions/${currentSessionId}/answeredQuestions`, currentQuestion.originalId);

    try {
        await Firebase.setDoc(answeredQuestionDocRef, {
            originalQuestionId: currentQuestion.originalId,
            area: currentQuestion.area,
            answeredCorrectlyBy: isCorrect ? Firebase.arrayUnion(Firebase.currentUserId) : Firebase.arrayRemove(Firebase.currentUserId), 
            answeredByAnyPlayer: true,
            timestampAnswered: Firebase.serverTimestamp()
        }, { merge: true }); 
        console.log(`Pergunta ${currentQuestion.originalId} marcada como respondida no Firestore.`);

        // Atualiza a pontuação do jogador no Firestore
        const playerDocRef = Firebase.doc(Firebase.db, `artifacts/${Firebase.APP_ID}/public/data/sessions/${currentSessionId}/players`, Firebase.currentUserId);
        if (isCorrect) {
            await Firebase.updateDoc(playerDocRef, {
                score: (playersInSessionCache[Firebase.currentUserId]?.score || 0) + 1, 
                lastActive: Firebase.serverTimestamp()
            });
            console.log(`Pontuação de ${Firebase.currentUserId} atualizada.`);
        } else {
            await Firebase.updateDoc(playerDocRef, {
                lastActive: Firebase.serverTimestamp()
            });
        }

    } catch (error) {
        console.error("Erro ao atualizar pergunta respondida ou pontuação no Firestore:", error);
    }
    
    nextCardButton.classList.remove('hidden');
});

// Event listeners para os botões de seleção de área (do seletor inicial)
document.querySelectorAll('.area-select-button').forEach(button => {
    button.addEventListener('click', () => {
        const area = button.getAttribute('data-area'); 
        displayNextQuestion(area); 
    });
});

// Event listener para o botão de carta aleatória no seletor inicial
randomCardButton.addEventListener('click', () => {
    displayNextQuestion(); 
});

// Event listener para o botão "Próxima Carta" (após responder)
nextCardButton.addEventListener('click', async () => {
    // Ao clicar em "Próxima Carta", limpamos a currentQuestion no Firestore
    // Isso fará com que todos os clientes voltem para o seletor de área
    await updateSessionState(currentSessionId, { currentQuestion: null });

    gameCardElement.classList.add('hidden');
    gameAreaSelectorElement.classList.remove('hidden');
    feedbackContainer.innerHTML = '';
    nextCardButton.classList.add('hidden');
    currentQuestion = null; 
});

// Event listener para o botão de voltar para a home
backToHomeButton.addEventListener('click', async () => {
    console.log('Botão "Voltar para o Início" clicado!');
    // Desinscrever todos os listeners do Firestore antes de sair
    if (unsubscribeSession) {
        unsubscribeSession(); 
        console.log("Firestore session listener unsubscribed.");
    }
    if (unsubscribeAnsweredQuestions) {
        unsubscribeAnsweredQuestions();
        console.log("Firestore answered questions listener unsubscribed.");
    }
    if (unsubscribePlayers) {
        unsubscribePlayers();
        console.log("Firestore players listener unsubscribed.");
    }

    // Marca o jogador local como desconectado
    if (currentSessionId && Firebase.currentUserId) {
        await removePlayerFromSession(currentSessionId, Firebase.currentUserId);
    }
    
    window.location.href = 'index.html';
});

// ==============================================
// FUNÇÕES DE GERENCIAMENTO DE SESSÃO NO FIRESTORE
// ==============================================

/**
 * Adiciona ou atualiza o status do jogador na sessão.
 * @param {string} sessionId - O ID da sessão.
 * @param {string} userId - O ID do usuário atual.
 */
async function addOrUpdatePlayerToSession(sessionId, userId) {
    const appId = Firebase.APP_ID;
    const db = Firebase.db;
    const playerDocRef = Firebase.doc(db, `artifacts/${appId}/public/data/sessions/${sessionId}/players`, userId);

    try {
        const playerSnap = await Firebase.getDoc(playerDocRef);
        let playerInitialScore = 0;
        if (playerSnap.exists()) {
            playerInitialScore = playerSnap.data().score || 0;
        }

        await Firebase.setDoc(playerDocRef, {
            uid: userId,
            name: currentUsername, // Usa o nome de usuário definido na entrada
            score: playerInitialScore, 
            lastActive: Firebase.serverTimestamp(),
            status: "connected"
        }, { merge: true }); 
        console.log(`Jogador ${userId} (${currentUsername}) adicionado/atualizado na sessão ${sessionId}.`);

        // Adiciona o UID ao array currentPlayers no documento da sessão principal
        await Firebase.updateDoc(Firebase.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId), {
            currentPlayers: Firebase.arrayUnion(userId) 
        });
    } catch (error) {
        console.error("Erro ao adicionar/atualizar jogador na sessão:", error);
        showMessage(translations.error_firebase_init || "Erro de conexão Firebase.", 'error');
    }
}

/**
 * Remove o jogador da sessão (útil ao fechar a página ou navegar).
 * @param {string} sessionId - O ID da sessão.
 * @param {string} userId - O ID do usuário a ser removido.
 */
async function removePlayerFromSession(sessionId, userId) {
    const appId = Firebase.APP_ID;
    const db = Firebase.db;
    const sessionDocRef = Firebase.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId);

    try {
        // Remove o UID do array currentPlayers no documento da sessão principal
        await Firebase.updateDoc(sessionDocRef, {
            currentPlayers: Firebase.arrayRemove(userId) 
        });
        console.log(`Jogador ${userId} removido do array currentPlayers da sessão ${sessionId}.`);

        // Opcional: Se quiser remover o documento do jogador, ou mudar status
        // const playerDocRef = Firebase.doc(db, `artifacts/${appId}/public/data/sessions/${sessionId}/players`, userId);
        // await Firebase.updateDoc(playerDocRef, { status: "disconnected", lastActive: Firebase.serverTimestamp() });

    } catch (error) {
        console.error("Erro ao remover jogador da sessão:", error);
    }
}

/**
 * Atualiza o estado geral da sessão (ex: qual pergunta está ativa).
 * @param {string} sessionId - O ID da sessão.
 * @param {object} data - Os dados a serem atualizados.
 */
async function updateSessionState(sessionId, data) {
    const appId = Firebase.APP_ID;
    const db = Firebase.db;
    const sessionDocRef = Firebase.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId);
    try {
        await Firebase.updateDoc(sessionDocRef, data);
        console.log(`Estado da sessão ${sessionId} atualizado no Firestore.`, data);
    } catch (error) {
        console.error("Erro ao atualizar estado da sessão:", error);
        showMessage(translations.error_firebase_init || "Erro de conexão Firebase.", 'error');
    }
}

/**
 * Escuta por mudanças no documento da sessão e em suas subcoleções (em tempo real).
 * @param {string} sessionId - O ID da sessão a ser escutada.
 */
function listenToSessionChanges(sessionId) {
    const appId = Firebase.APP_ID;
    const db = Firebase.db;

    // 1. Listener para o documento principal da sessão
    const sessionDocRef = Firebase.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId);
    unsubscribeSession = Firebase.onSnapshot(sessionDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const sessionData = docSnap.data();
            console.log("Mudanças na sessão (principal):", sessionData);
            
            // Atualiza a pergunta ativa para todos os jogadores
            if (sessionData.currentQuestion) {
                if (sessionData.currentQuestion.id !== currentQuestion?.id || gameCardElement.classList.contains('hidden')) {
                    console.log("Nova pergunta ativa detectada ou carta precisa ser exibida:", sessionData.currentQuestion.questionText);
                    displayQuestionInUI(sessionData.currentQuestion);
                }
            } else {
                // Se currentQuestion for nula (significa que o host clicou "Próxima Carta")
                // Volta para o seletor de área para todos
                gameCardElement.classList.add('hidden');
                gameAreaSelectorElement.classList.remove('hidden');
                feedbackContainer.innerHTML = ''; 
                nextCardButton.classList.add('hidden'); 
                currentQuestion = null; 
            }

        } else {
            console.error(`Sessão ${sessionId} não existe ou foi excluída.`);
            showMessage(translations.session_deleted_message || "Sessão encerrada ou não encontrada. Redirecionando para a página inicial.", 'error');
            setTimeout(() => window.location.href = 'index.html', 3000); // Redireciona após 3 segundos
        }
    }, (error) => {
        console.error("Erro no listener onSnapshot da sessão principal:", error);
        showMessage(translations.error_firebase_init || "Erro ao conectar com a sessão.", 'error');
        setTimeout(() => window.location.href = 'index.html', 3000);
    });

    // 2. Listener para as perguntas já respondidas na sessão
    const answeredQuestionsColRef = Firebase.collection(db, `artifacts/${appId}/public/data/sessions/${sessionId}/answeredQuestions`);
    unsubscribeAnsweredQuestions = Firebase.onSnapshot(answeredQuestionsColRef, (snapshot) => {
        answeredQuestionsCache.clear();
        snapshot.forEach((doc) => {
            answeredQuestionsCache.add(doc.data().originalQuestionId);
        });
        console.log("Perguntas respondidas atualizadas (cache):", Array.from(answeredQuestionsCache));
    }, (error) => {
        console.error("Erro no listener onSnapshot de answeredQuestions:", error);
    });

    // 3. Listener para os players na sessão (para atualizar a lista de jogadores na UI)
    const playersColRef = Firebase.collection(db, `artifacts/${appId}/public/data/sessions/${sessionId}/players`);
    unsubscribePlayers = Firebase.onSnapshot(playersColRef, (snapshot) => {
        playersInSessionCache = {}; 
        const currentPlayersData = [];
        snapshot.forEach((doc) => {
            const playerData = doc.data();
            playersInSessionCache[doc.id] = playerData;
            currentPlayersData.push(playerData);
        });
        console.log("Detalhes dos jogadores atualizados (cache):", playersInSessionCache);
        updatePlayerList(currentPlayersData); // Atualiza a UI com a lista de jogadores
    }, (error) => {
        console.error("Erro no listener onSnapshot de players:", error);
    });
}


// Inicializa a lógica do jogo APÓS o DOM e o Firebase estarem prontos.
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded disparado em gameLogic.js. Aguardando Firebase...");

    // Espera até que o Firebase esteja totalmente inicializado e autenticado
    try {
        await Firebase.firebaseInitializedPromise;
        console.log("Firebase inicializado e autenticado. Iniciando a lógica do jogo...");
    } catch (error) {
        console.error("Erro na inicialização do Firebase, jogo não pode iniciar:", error);
        showMessage(translations.error_firebase_init || "Erro crítico de Firebase. Recarregue a página.", 'error');
        // Redireciona se o Firebase não pôde ser inicializado
        setTimeout(() => window.location.href = 'index.html', 3000); 
        return;
    }

    const queryParams = getQueryParams();
    currentSessionId = queryParams.session;
    const sessionLang = queryParams.lang;

    // Define o idioma da sessão ou o padrão (usando AppConfig.defaultLanguage)
    if (sessionLang && AppConfig.supportedLanguages.some(l => l.code === sessionLang)) {
        currentLanguage = sessionLang;
    } else {
        currentLanguage = AppConfig.defaultLanguage;
    }

    // Carrega as traduções da UI primeiro para ter mensagens de erro no idioma correto
    await loadUITranslations(currentLanguage);

    if (!currentSessionId) {
        console.error("Nenhum ID de sessão encontrado na URL.");
        showMessage(translations.no_session_id_message || "Nenhum ID de sessão fornecido.", 'error');
        setTimeout(() => window.location.href = 'index.html', 3000);
        return;
    }

    displaySessionIdElement.textContent = currentSessionId; // Exibe o ID da sessão na UI
    
    // Assegura que o Firebase.APP_ID e Firebase.currentUserId estão disponíveis
    if (!Firebase.db || !Firebase.APP_ID || !Firebase.currentUserId) {
        console.error("Dependências Firebase não estão prontas para initGameLogic.");
        showMessage(translations.error_firebase_init || "Erro crítico de Firebase. Recarregue a página.", 'error');
        setTimeout(() => window.location.href = 'index.html', 3000);
        return;
    }

    // Tenta carregar os dados da sessão e iniciar os listeners
    try {
        currentSessionDocRef = Firebase.doc(Firebase.db, `artifacts/${Firebase.APP_ID}/public/data/sessions`, currentSessionId);
        const sessionSnap = await Firebase.getDoc(currentSessionDocRef);

        if (sessionSnap.exists()) {
            const sessionData = sessionSnap.data();
            console.log(`Sessão ${currentSessionId} encontrada. Iniciando jogo.`);
            
            // Adiciona o jogador atual à sessão
            await addOrUpdatePlayerToSession(currentSessionId, Firebase.currentUserId);

            // Inicia a escuta em tempo real para a sessão e subcoleções
            listenToSessionChanges(currentSessionId);
            
            // Carrega todas as perguntas do Firestore para o idioma determinado
            await loadQuestionsFromFirestore(currentLanguage);

            // Se houver uma pergunta ativa na sessão, exibe-a imediatamente
            if (sessionData.currentQuestion) {
                displayQuestionInUI(sessionData.currentQuestion);
            } else {
                // Se não houver pergunta ativa, exibe o seletor de área
                gameAreaSelectorElement.classList.remove('hidden');
                gameCardElement.classList.add('hidden');
            }
            addEventListeners(); // Adiciona os event listeners
            
            // Esconde o overlay de carregamento e mostra o conteúdo do jogo
            loadingOverlay.classList.add('hidden');
            gameContainer.classList.remove('hidden'); 

        } else {
            console.error(`Sessão ${currentSessionId} não encontrada no Firestore. Redirecionando para a página inicial.`);
            showMessage(translations.session_not_found_message || "Sessão não encontrada.", 'error');
            setTimeout(() => window.location.href = 'index.html', 3000);
            return;
        }
    } catch (error) {
        console.error("Erro ao carregar ou ingressar na sessão Firestore:", error);
        showMessage(translations.session_load_failed_message || "Erro ao carregar dados da sessão.", 'error');
        setTimeout(() => window.location.href = 'index.html', 3000);
        return;
    }

    // Remove o jogador da sessão ao fechar a aba/navegador
    window.addEventListener('beforeunload', async () => {
        if (currentSessionId && Firebase.currentUserId) {
            await removePlayerFromSession(currentSessionId, Firebase.currentUserId);
        }
        // Os listeners onSnapshot serão automaticamente desinscritos quando a página for descarregada
    });
});
