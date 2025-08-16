// js/game.js

let allQuestions = [];
let currentQuestion = null;
let selectedOption = null;
let currentLanguage = AppConfig.defaultLanguage; 

const translations = {
    "pt-BR": {
        game_page_base_title: "Jogo de Gerenciamento de Projetos - Sessão",
        label_session: "Sessão",
        label_back_to_home: "Voltar para o Início",
        label_choose_area: "Escolha a Área da Próxima Carta:",
        area_integration: "Integração",
        area_scope: "Escopo",
        area_schedule: "Cronograma",
        area_cost: "Custos",
        area_quality: "Qualidade",
        area_resources: "Recursos",
        area_communications: "Comunicações",
        area_risks: "Riscos",
        area_acquisitions: "Aquisições",
        area_stakeholders: "Partes Interessadas",
        button_random_card: "Carta Aleatória",
        button_check_answer: "Verificar Resposta",
        button_next_card: "Próxima Carta",
        feedback_correct: "Parabéns! Resposta Correta!",
        feedback_incorrect_prefix: "Ops! Resposta Incorreta. A resposta correta é ",
        explanation_prefix: "Explicação: ",
        error_no_session_id: "Nenhum ID de sessão encontrado. Redirecionando para a página inicial.",
        error_loading_questions: "Erro ao carregar as perguntas. Por favor, recarregue a página.",
        session_deleted_message: "Sessão encerrada ou não encontrada. Redirecionando para a página inicial.",
        session_not_found_message: "Sessão não encontrada. Redirecionando para a página inicial.",
        session_load_failed_message: "Erro ao carregar dados da sessão. Redirecionando para a página inicial.",
        no_session_id_message: "Nenhum ID de sessão fornecido. Redirecionando para a página inicial.",
        no_more_questions: "Não há mais perguntas disponíveis para esta área/idioma!"
    },
    "en-US": {
        game_page_base_title: "Project Management Game - Session",
        label_session: "Session",
        label_back_to_home: "Back to Home",
        label_choose_area: "Choose the Area for the Next Card:",
        area_integration: "Integration",
        area_scope: "Scope",
        area_schedule: "Schedule",
        area_cost: "Cost",
        area_quality: "Quality",
        area_resources: "Resource",
        area_communications: "Communications",
        area_risks: "Risk",
        area_acquisitions: "Procurement",
        area_stakeholders: "Stakeholder",
        button_random_card: "Random Card",
        button_check_answer: "Check Answer",
        button_next_card: "Next Card",
        feedback_correct: "Congratulations! Correct Answer!",
        feedback_incorrect_prefix: "Oops! Incorrect Answer. The correct answer is ",
        explanation_prefix: "Explanation: ",
        error_no_session_id: "No session ID found. Redirecting to home page.",
        error_loading_questions: "Error loading questions. Please reload the page.",
        session_deleted_message: "Session ended or not found. Redirecting to home page.",
        session_not_found_message: "Session not found. Redirecting to home page.",
        session_load_failed_message: "Error loading session data. Redirecting to home page.",
        no_session_id_message: "No session ID provided. Redirecting to home page.",
        no_more_questions: "No more questions available for this area/language!"
    },
    "es-ES": {
        game_page_base_title: "Juego de Gestión de Proyectos - Sesión",
        label_session: "Sesión",
        label_back_to_home: "Volver al Inicio",
        label_choose_area: "Elige el Área para la Siguiente Tarjeta:",
        area_integration: "Integración",
        area_scope: "Alcance",
        area_schedule: "Cronograma",
        area_cost: "Costos",
        area_quality: "Calidad",
        area_resources: "Recursos",
        area_communications: "Comunicaciones",
        area_risks: "Riesgos",
        area_acquisitions: "Adquisiciones",
        area_stakeholders: "Interesados",
        button_random_card: "Tarjeta Aleatoria",
        button_check_answer: "Verificar Respuesta",
        button_next_card: "Siguiente Tarjeta",
        feedback_correct: "¡Felicidades! ¡Respuesta Correcta!",
        feedback_incorrect_prefix: "¡Uy! Respuesta Incorrecta. La respuesta correcta es ",
        explanation_prefix: "Explicación: ",
        error_no_session_id: "No se encontró ID de sesión. Redireccionando a la página de inicio.",
        error_loading_questions: "Error al cargar las preguntas. Por favor, recargue la página.",
        session_deleted_message: "Sesión finalizada o no encontrada. Redireccionando a la página de inicio.",
        session_not_found_message: "Sesión no encontrada. Redireccionando a la página de inicio.",
        session_load_failed_message: "Error al cargar datos de la sesión. Redireccionando a la página de inicio.",
        no_session_id_message: "No se proporcionó ID de sesión. Redireccionando a la página de inicio.",
        no_more_questions: "¡No hay más preguntas disponibles para esta área/idioma!"
    }
};

// Elementos do DOM
const sessionIdDisplay = document.getElementById('sessionIdDisplay');
const backToHomeButton = document.getElementById('backToHomeButton');

const areaSelector = document.getElementById('areaSelector');
const areaSelectButtons = document.querySelectorAll('#areaSelector .area-select-button');
const randomAreaButtonSelector = document.getElementById('randomAreaButtonSelector');

const gameCard = document.getElementById('gameCard');
const questionArea = document.getElementById('questionArea');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const submitAnswerButton = document.getElementById('submitAnswerButton');
const feedbackContainer = document.getElementById('feedbackContainer');
const nextCardButton = document.getElementById('nextCardButton');

// Variáveis para o estado da sessão em tempo real
let currentSessionId = null;
let currentSessionDocRef = null;
let answeredQuestionsCache = new Set();
let playersInSessionCache = {};
let unsubscribeSession = null;
let unsubscribeAnsweredQuestions = null;
let unsubscribePlayers = null;

// Função para extrair o idioma de um ID de sessão como "1234PTBR"
function getLanguageFromSessionIdString(sessionId) {
    const languageCodeToLangMap = {
        'PTBR': 'pt-BR',
        'ESES': 'es-ES',
        'ENUS': 'en-US'
    };
    if (sessionId && sessionId.length === 8) {
        const code = sessionId.substring(4).toUpperCase();
        return languageCodeToLangMap[code] || null;
    }
    return null;
}

// Função para atualizar os textos da UI com base no idioma
function updateUITexts() {
    const currentLangTranslations = translations[currentLanguage];
    if (!currentLangTranslations) {
        console.warn(`Traduções para o idioma '${currentLanguage}' não encontradas. Usando 'pt-BR' como fallback.`);
        currentLanguage = 'pt-BR';
        if (!translations[currentLanguage]) {
            console.error("Erro fatal: Fallback para 'pt-BR' também falhou. Certifique-se de que 'pt-BR' está definido.");
            return;
        }
    }

    // Atualiza o título da página
    document.title = translations[currentLanguage].game_page_base_title;

    // Atualiza textos com data-lang-key
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });

    // Atualiza elementos específicos que não usam data-lang-key mas precisam de tradução
    if (document.getElementById('labelSession')) document.getElementById('labelSession').textContent = translations[currentLanguage].label_session;
    if (document.getElementById('labelBackToHome')) document.getElementById('labelBackToHome').textContent = translations[currentLanguage].label_back_to_home;
    if (document.getElementById('labelChooseArea')) document.getElementById('labelChooseArea').textContent = translations[currentLanguage].label_choose_area;

    if (currentQuestion) {
        questionArea.textContent = currentQuestion.area; 
        questionText.textContent = currentQuestion.questionText;

        optionsContainer.innerHTML = '';
        const options = currentQuestion.options;
        for (const key in options) {
            const optionButton = document.createElement('button');
            optionButton.className = 'option-button bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-5 rounded-lg text-left w-full shadow';
            optionButton.innerHTML = `<span class="font-bold mr-2">${key})</span> ${options[key]}`;
            optionButton.setAttribute('data-option', key);
            optionButton.addEventListener('click', () => {
                document.querySelectorAll('.option-button').forEach(btn => { btn.classList.remove('selected'); });
                optionButton.classList.add('selected');
                selectedOption = key;
                submitAnswerButton.disabled = false;
                submitAnswerButton.classList.remove('opacity-50', 'cursor-not-allowed');
            });
            optionsContainer.appendChild(optionButton);
        }
        
        if (feedbackContainer.innerHTML) {
            const isCorrect = (selectedOption === currentQuestion.correctAnswer);
            feedbackContainer.innerHTML = ''; 
            const feedbackDiv = document.createElement('div');
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'explanation text-left';

            if (isCorrect) {
                feedbackDiv.className = 'feedback correct';
                feedbackDiv.textContent = translations[currentLanguage].feedback_correct;
            } else {
                feedbackDiv.className = 'feedback incorrect';
                feedbackDiv.textContent = translations[currentLanguage].feedback_incorrect_prefix + `${currentQuestion.correctAnswer}).`;
            }
            explanationDiv.textContent = translations[currentLanguage].explanation_prefix + currentQuestion.explanation;

            feedbackContainer.appendChild(feedbackDiv);
            feedbackContainer.appendChild(explanationDiv);
        }
    }
}

// Função para carregar as perguntas do Firestore com base no idioma
async function loadQuestions(lang) {
    try {
        if (!window.db || !window.appId || !window.firestore) {
            throw new Error("Objetos Firebase não inicializados.");
        }

        const questionsCollectionRef = window.firestore.collection(window.db, `artifacts/${window.appId}/public/data/questions`);
        
        const querySnapshot = await window.firestore.getDocs(window.firestore.query(questionsCollectionRef, window.firestore.where('language', '==', lang)));
        
        allQuestions = querySnapshot.docs.map(docSnapshot => ({
            id: docSnapshot.id,
            ...docSnapshot.data()
        }));

        console.log(`Perguntas em ${lang} carregadas com sucesso do Firestore da coleção 'questions':`, allQuestions.length);

        areaSelectButtons.forEach(button => button.disabled = false);
        randomAreaButtonSelector.disabled = false;

    } catch (error) {
        console.error('Falha ao carregar as perguntas do Firestore:', error);
        if (areaSelector) { // Verifica se o elemento existe antes de tentar manipular
            areaSelector.innerHTML = `<p class="text-red-600">${translations[currentLanguage].error_loading_questions}: ${error.message}</p>`;
        }
        areaSelectButtons.forEach(button => button.disabled = true);
        randomAreaButtonSelector.disabled = true;
    }
}

// Função para obter o ID da sessão e o idioma da URL
function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        session: urlParams.get('session'),
        lang: urlParams.get('lang') || AppConfig.defaultLanguage 
    };
}

// Função para filtrar perguntas já respondidas (usando o cache local)
function getUnansweredQuestions(areaFilter = null) {
    let availableQuestions = allQuestions;

    if (areaFilter) {
        availableQuestions = availableQuestions.filter(q => q.area === areaFilter); 
    }
    
    return availableQuestions.filter(q => !answeredQuestionsCache.has(q.originalId));
}

// Função para iniciar uma nova pergunta (puxa carta) - Apenas o HOST (ou quem pode puxar a carta) deve chamar isso
async function displayNextQuestion(areaFilter = null) {
    const unansweredQuestions = getUnansweredQuestions(areaFilter);

    if (unansweredQuestions.length === 0) {
        alert(translations[currentLanguage].no_more_questions);
        // Atualiza o status da sessão para "completed" se não houver mais perguntas
        await updateSessionState(currentSessionId, { status: "completed" });
        return;
    }

    const randomIndex = Math.floor(Math.random() * unansweredQuestions.length);
    const questionToAsk = unansweredQuestions[randomIndex];

    await updateSessionState(currentSessionId, { 
        currentQuestion: {
            id: questionToAsk.id,
            originalId: questionToAsk.originalId,
            area: questionToAsk.area,
            questionText: questionToAsk.question,
            options: questionToAsk.options,
            correctAnswer: questionToAsk.correct,
            explanation: questionToAsk.explanation,
            askedByPlayerId: window.currentUserId,
            timestampAsked: window.firestore.serverTimestamp()
        }
    });
}

// Função para exibir a pergunta na UI (chamada pelo listener onSnapshot)
function displayQuestionInUI(question) {
    currentQuestion = question;
    selectedOption = null;
    submitAnswerButton.disabled = false;
    submitAnswerButton.classList.remove('opacity-50', 'cursor-not-allowed');
    nextCardButton.classList.add('hidden');

    questionArea.textContent = question.area;
    questionText.textContent = question.questionText;
    optionsContainer.innerHTML = '';
    feedbackContainer.innerHTML = '';

    const options = question.options;

    for (const key in options) {
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
            submitAnswerButton.disabled = false;
            submitAnswerButton.classList.remove('opacity-50', 'cursor-not-allowed');
        });
        optionsContainer.appendChild(optionButton);
    }

    areaSelector.classList.add('hidden');
    gameCard.classList.remove('hidden');
}

// Event Listeners
submitAnswerButton.addEventListener('click', async () => {
    if (!currentQuestion || !selectedOption) return;

    document.querySelectorAll('.option-button').forEach(btn => { btn.disabled = true; });
    submitAnswerButton.disabled = true;
    submitAnswerButton.classList.add('opacity-50', 'cursor-not-allowed');

    feedbackContainer.innerHTML = '';
    const feedbackDiv = document.createElement('div');
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'explanation text-left';

    const isCorrect = (selectedOption === currentQuestion.correctAnswer);

    if (isCorrect) {
        feedbackDiv.className = 'feedback correct';
        feedbackDiv.textContent = translations[currentLanguage].feedback_correct;
    } else {
        feedbackDiv.className = 'feedback incorrect';
        feedbackDiv.textContent = translations[currentLanguage].feedback_incorrect_prefix + `${currentQuestion.correctAnswer}).`;
    }
    explanationDiv.textContent = translations[currentLanguage].explanation_prefix + currentQuestion.explanation;

    feedbackContainer.appendChild(feedbackDiv);
    feedbackContainer.appendChild(explanationDiv);

    const appId = window.appId;
    const db = window.db;
    const firestore = window.firestore;

    const answeredQuestionDocRef = firestore.doc(db, `artifacts/${appId}/public/data/sessions/${currentSessionId}/answeredQuestions`, currentQuestion.originalId);

    try {
        await firestore.setDoc(answeredQuestionDocRef, {
            originalQuestionId: currentQuestion.originalId,
            area: currentQuestion.area,
            answeredCorrectlyBy: isCorrect ? firestore.arrayUnion(window.currentUserId) : firestore.arrayRemove(window.currentUserId),
            answeredByAnyPlayer: true,
            timestampAnswered: firestore.serverTimestamp()
        }, { merge: true });
        console.log(`Pergunta ${currentQuestion.originalId} marcada como respondida no Firestore.`);

        const playerDocRef = firestore.doc(db, `artifacts/${appId}/public/data/sessions/${currentSessionId}/players`, window.currentUserId);
        if (isCorrect) {
            await firestore.updateDoc(playerDocRef, {
                score: (playersInSessionCache[window.currentUserId]?.score || 0) + 1,
                lastActive: firestore.serverTimestamp()
            });
            console.log(`Pontuação de ${window.currentUserId} atualizada.`);
        } else {
            await firestore.updateDoc(playerDocRef, {
                lastActive: firestore.serverTimestamp()
            });
        }

    } catch (error) {
        console.error("Erro ao atualizar pergunta respondida ou pontuação no Firestore:", error);
    }
    
    nextCardButton.classList.remove('hidden');
});

areaSelectButtons.forEach(button => {
    button.addEventListener('click', () => {
        const areaName = button.getAttribute('data-area'); 
        displayNextQuestion(areaName);
    });
});

randomAreaButtonSelector.addEventListener('click', () => {
    if (allQuestions.length === 0) {
        console.warn(translations[currentLanguage].error_loading_questions);
        return;
    }
    displayNextQuestion();
});

nextCardButton.addEventListener('click', async () => {
    await updateSessionState(currentSessionId, { currentQuestion: null });

    gameCard.classList.add('hidden');
    areaSelector.classList.remove('hidden');
    feedbackContainer.innerHTML = '';
    nextCardButton.classList.add('hidden');
    currentQuestion = null;
});

backToHomeButton.addEventListener('click', async () => {
    console.log('Botão "Voltar para o Início" clicado!');
    if (unsubscribeSession) { unsubscribeSession(); }
    if (unsubscribeAnsweredQuestions) { unsubscribeAnsweredQuestions(); }
    if (unsubscribePlayers) { unsubscribePlayers(); }

    if (currentSessionId && window.currentUserId) {
        await removePlayerFromSession(currentSessionId, window.currentUserId);
    }
    window.location.href = 'index.html';
});

// ==============================================
// FUNÇÕES DE GERENCIAMENTO DE SESSÃO NO FIRESTORE
// ==============================================

async function addOrUpdatePlayerToSession(sessionId, userId, userName = `Jogador_${userId.substring(0,4)}`) {
    const appId = window.appId;
    const db = window.db;
    const firestore = window.firestore;
    const playerDocRef = firestore.doc(db, `artifacts/${appId}/public/data/sessions/${sessionId}/players`, userId);

    try {
        const playerSnap = await firestore.getDoc(playerDocRef);
        let playerInitialScore = 0;
        if (playerSnap.exists()) {
            playerInitialScore = playerSnap.data().score || 0;
        }

        await firestore.setDoc(playerDocRef, {
            uid: userId,
            name: userName, 
            score: playerInitialScore,
            lastActive: firestore.serverTimestamp(),
            status: "connected"
        }, { merge: true }); 
        console.log(`Jogador ${userId} adicionado/atualizado na sessão ${sessionId}.`);

        await firestore.updateDoc(firestore.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId), {
            currentPlayers: firestore.arrayUnion(userId)
        });
    } catch (error) {
        console.error("Erro ao adicionar/atualizar jogador na sessão:", error);
    }
}

async function removePlayerFromSession(sessionId, userId) {
    const appId = window.appId;
    const db = window.db;
    const firestore = window.firestore;
    const playerDocRef = firestore.doc(db, `artifacts/${appId}/public/data/sessions/${sessionId}/players`, userId);

    try {
        await firestore.updateDoc(playerDocRef, {
            status: "disconnected",
            lastActive: firestore.serverTimestamp()
        });
        console.log(`Jogador ${userId} marcado como desconectado na sessão ${sessionId}.`);

        await firestore.updateDoc(firestore.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId), {
            currentPlayers: firestore.arrayRemove(userId)
        });
    } catch (error) {
        console.error("Erro ao remover jogador da sessão:", error);
    }
}

async function updateSessionState(sessionId, data) {
    const appId = window.appId;
    const db = window.db;
    const firestore = window.firestore;
    const sessionDocRef = firestore.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId);
    try {
        await firestore.updateDoc(sessionDocRef, data);
        console.log(`Estado da sessão ${sessionId} atualizado no Firestore.`, data);
    } catch (error) {
        console.error("Erro ao atualizar estado da sessão:", error);
    }
}

function listenToSessionChanges(sessionId) {
    const appId = window.appId;
    const db = window.db;
    const firestore = window.firestore;

    const sessionDocRef = firestore.doc(db, `artifacts/${appId}/public/data/sessions`, sessionId);
    unsubscribeSession = firestore.onSnapshot(sessionDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const sessionData = docSnap.data();
            console.log("Mudanças na sessão (principal):", sessionData);
            
            if (sessionData.currentQuestion) {
                if (sessionData.currentQuestion.id !== currentQuestion?.id || gameCard.classList.contains('hidden')) {
                    console.log("Nova pergunta ativa detectada ou carta precisa ser exibida:", sessionData.currentQuestion.questionText);
                    displayQuestionInUI(sessionData.currentQuestion);
                }
            } else {
                gameCard.classList.add('hidden');
                areaSelector.classList.remove('hidden');
                feedbackContainer.innerHTML = '';
                nextCardButton.classList.add('hidden');
                currentQuestion = null;
            }

        } else {
            console.error(`Sessão ${sessionId} não existe ou foi excluída.`);
            alert(translations[currentLanguage].session_deleted_message);
            window.location.href = 'index.html?error=session_deleted';
        }
    });

    const answeredQuestionsColRef = firestore.collection(db, `artifacts/${appId}/public/data/sessions/${sessionId}/answeredQuestions`);
    unsubscribeAnsweredQuestions = firestore.onSnapshot(answeredQuestionsColRef, (snapshot) => {
        answeredQuestionsCache.clear();
        snapshot.forEach((doc) => {
            answeredQuestionsCache.add(doc.data().originalQuestionId);
        });
        console.log("Perguntas respondidas atualizadas (cache):", Array.from(answeredQuestionsCache));
    });

    const playersColRef = firestore.collection(db, `artifacts/${appId}/public/data/sessions/${sessionId}/players`);
    unsubscribePlayers = firestore.onSnapshot(playersColRef, (snapshot) => {
        playersInSessionCache = {}; 
        snapshot.forEach((doc) => {
            playersInSessionCache[doc.id] = doc.data();
        });
        console.log("Detalhes dos jogadores atualizados (cache):", playersInSessionCache);
    });
}

// ===========================================
// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO DO JOGO
// Chamada por game.html depois que o Firebase está pronto
// ===========================================
window.initGame = async () => {
    const params = getQueryParams();
    currentSessionId = params.session;
    let langFromUrl = params.lang; 

    if (currentSessionId) {
        sessionIdDisplay.textContent = currentSessionId;

        let determinedLanguage = getLanguageFromSessionIdString(currentSessionId);

        if (!determinedLanguage) {
            console.error(`Não foi possível determinar o idioma a partir do ID da sessão '${currentSessionId}'. Redirecionando.`);
            // Precisamos garantir que as traduções estejam carregadas para o alert
            await loadUITranslations(AppConfig.defaultLanguage); 
            alert(translations[AppConfig.defaultLanguage].no_session_id_message); 
            window.location.href = 'index.html?error=invalid_session_id_format';
            return;
        } 
        
        if (determinedLanguage !== langFromUrl) {
            console.warn(`Idioma da URL ('${langFromUrl}') não corresponde ao idioma do ID ('${determinedLanguage}'). Priorizando idioma do ID.`);
        }
        
        currentLanguage = determinedLanguage;
        document.documentElement.lang = currentLanguage;

        // Carrega as traduções da UI para o idioma determinado
        await loadUITranslations(currentLanguage);

        const appId = window.appId;
        const db = window.db; 
        const firestore = window.firestore; // Instância firestore com métodos expostos
        currentSessionDocRef = firestore.doc(db, `artifacts/${appId}/public/data/sessions`, currentSessionId);

        try {
            const docSnap = await firestore.getDoc(currentSessionDocRef);

            if (docSnap.exists()) {
                const sessionData = docSnap.data();
                if (sessionData.language !== currentLanguage) {
                    console.warn(`Idioma da sessão no Firestore ('${sessionData.language}') difere do idioma do ID ('${currentLanguage}'). Priorizando idioma do ID.`);
                }

                await addOrUpdatePlayerToSession(currentSessionId, window.currentUserId);

                listenToSessionChanges(currentSessionId);
                
                await loadQuestions(currentLanguage); // Carrega as perguntas do Firestore

                if (sessionData.currentQuestion) {
                    displayQuestionInUI(sessionData.currentQuestion);
                } else {
                    areaSelector.classList.remove('hidden');
                    gameCard.classList.add('hidden');
                }

            } else {
                console.error(`Sessão ${currentSessionId} não encontrada no Firestore. Redirecionando para a página inicial.`);
                alert(translations[currentLanguage].session_not_found_message);
                window.location.href = 'index.html?error=session_not_found';
                return;
            }
        } catch (e) {
            console.error("Erro ao carregar ou ingressar na sessão Firestore: ", e);
            alert(translations[currentLanguage].session_load_failed_message);
            window.location.href = 'index.html?error=session_load_failed';
            return;
        }

    } else {
        sessionIdDisplay.textContent = 'N/A';
        await loadUITranslations(AppConfig.defaultLanguage); 
        console.error(translations[AppConfig.defaultLanguage].error_no_session_id);
        alert(translations[AppConfig.defaultLanguage].no_session_id_message);
        window.location.href = 'index.html?error=no_session_id';
    }

    // Adiciona listener para remover jogador ao fechar/navegar
    window.addEventListener('beforeunload', async () => {
        if (currentSessionId && window.currentUserId) {
            await removePlayerFromSession(currentSessionId, window.currentUserId);
        }
    });
};

// ===========================================
// Nova função para carregar traduções da UI para `updateUITexts`
// Isso é necessário para que os alerts e mensagens de erro iniciais usem o idioma correto
// ===========================================
async function loadUITranslations(lang) {
    // Para simplificar, estamos usando o objeto `translations` hardcoded.
    // Se você estivesse carregando traduções de um arquivo JSON externo, faria o fetch aqui.
    // Por enquanto, apenas garante que `currentLanguage` está definido e chama `updateUITexts`
    currentLanguage = lang;
    document.documentElement.lang = currentLanguage;
    updateUITexts(); // Atualiza a UI imediatamente com o idioma carregado
}
