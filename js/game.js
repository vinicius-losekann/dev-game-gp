// js/game.js

// Variável para armazenar todas as perguntas carregadas do JSON
let allQuestions = [];
let currentQuestion = null;
let selectedOption = null;
// Idioma padrão lido do arquivo de configuração, mas será sobrescrito pela URL
let currentLanguage = AppConfig.defaultLanguage; 

// Objeto para armazenar as traduções de textos estáticos da UI em game.html
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
        error_loading_questions: "Erro ao carregar as perguntas. Por favor, recarregue a página."
    },
    "en-US": {
        game_page_base_title: "Project Management Game - Session",
        label_session: "Session",
        label_back_to_home: "Back to Home",
        label_choose_area: "Choose the Area for the Next Card:",
        area_integration: "Integration",
        area_scope: "Scope",
        area_schedule: "Schedule",
        area_cost: "Costs",
        area_quality: "Quality",
        area_resources: "Resources",
        area_communications: "Communications",
        area_risks: "Risks",
        area_acquisitions: "Acquisitions",
        area_stakeholders: "Stakeholders",
        button_random_card: "Random Card",
        button_check_answer: "Check Answer",
        button_next_card: "Next Card",
        feedback_correct: "Congratulations! Correct Answer!",
        feedback_incorrect_prefix: "Oops! Incorrect Answer. The correct answer is ",
        explanation_prefix: "Explanation: ",
        error_no_session_id: "No session ID found. Redirecting to home page.",
        error_loading_questions: "Error loading questions. Please reload the page."
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
        error_loading_questions: "Error al cargar las preguntas. Por favor, recargue la página."
    }
};

// Elementos do DOM
const sessionIdDisplay = document.getElementById('sessionIdDisplay');
const backToHomeButton = document.getElementById('backToHomeButton');

// Elementos do Seletor de Área
const areaSelector = document.getElementById('areaSelector');
const areaSelectButtons = document.querySelectorAll('#areaSelector .area-select-button');
const randomAreaButtonSelector = document.getElementById('randomAreaButtonSelector');

// Elementos da Carta do Jogo
const gameCard = document.getElementById('gameCard');
const questionArea = document.getElementById('questionArea');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const submitAnswerButton = document.getElementById('submitAnswerButton');
const feedbackContainer = document.getElementById('feedbackContainer');
const nextCardButton = document.getElementById('nextCardButton');

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

    document.getElementById('labelSession').textContent = translations[currentLanguage].label_session;
    document.getElementById('labelBackToHome').textContent = translations[currentLanguage].label_back_to_home;
    document.getElementById('labelChooseArea').textContent = translations[currentLanguage].label_choose_area;
    
    // Atualiza o título da página
    document.title = translations[currentLanguage].game_page_base_title;

    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });

    if (currentQuestion) {
        displayQuestion(currentQuestion, false);
    }
}

// Função para carregar as perguntas do arquivo JSON com base no idioma
async function loadQuestions(lang) {
    let filename;
    // Mapeamento explícito de códigos BCP 47 para nomes de arquivo JSON de perguntas
    switch (lang) {
        case 'pt-BR':
            filename = 'questions_pt-BR.json';
            break;
        case 'en-US': // CORRIGIDO: Agora espera questions_en-US.json
            filename = 'questions_en-US.json'; 
            break;
        case 'es-ES': // CORRIGIDO: Agora espera questions_es-ES.json
            filename = 'questions_es-ES.json';
            break;
        default:
            console.warn(`Idioma '${lang}' não reconhecido para carregar perguntas. Carregando questions_pt-BR.json como fallback.`);
            filename = 'questions_pt-BR.json'; // Fallback para português do Brasil
    }

    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(translations[currentLanguage].error_loading_questions + ` (${response.statusText})`);
        }
        allQuestions = await response.json();
        console.log(`Perguntas em ${lang} carregadas com sucesso de ${filename}:`, allQuestions);

        // Habilita os botões de seleção de área após carregar as perguntas
        areaSelectButtons.forEach(button => button.disabled = false);
        randomAreaButtonSelector.disabled = false;

    } catch (error) {
        console.error('Falha ao carregar as perguntas:', error);
        // Exibir uma mensagem de erro na UI
        areaSelector.innerHTML = `<p class="text-red-600">${error.message}</p>`;
        // Desabilita os botões para evitar que o usuário tente jogar sem perguntas
        areaSelectButtons.forEach(button => button.disabled = true);
        randomAreaButtonSelector.disabled = true;
    }
}

// Função para obter o ID da sessão e o idioma da URL
function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        session: urlParams.get('session'),
        lang: urlParams.get('lang') || AppConfig.defaultLanguage // Padrão do config.js
    };
}

// Função para exibir uma nova carta/pergunta
function displayQuestion(question, hideAreaSelector = true) {
    currentQuestion = question;
    selectedOption = null;
    submitAnswerButton.disabled = true;
    submitAnswerButton.classList.add('opacity-50', 'cursor-not-allowed');
    nextCardButton.classList.add('hidden');

    // As chaves no JSON não têm mais o sufixo de idioma, pois o arquivo já é do idioma certo
    // Agora acessamos as propriedades dinamicamente com base no currentLanguage
    const langSuffix = currentLanguage.replace('-', ''); // Remove o hífen, e as chaves no JSON devem ser area_pt, question_pt etc.
    questionArea.textContent = question[`area_${langSuffix.toLowerCase()}`] || question.area_pt; // Fallback para pt
    questionText.textContent = question[`question_${langSuffix.toLowerCase()}`] || question.question_pt;
    
    optionsContainer.innerHTML = '';
    feedbackContainer.innerHTML = '';

    const options = question[`options_${langSuffix.toLowerCase()}`] || question.options_pt; // As opções também são diretas agora

    // Cria os botões de opção
    for (const key in options) {
        const optionButton = document.createElement('button');
        optionButton.className = 'option-button bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-5 rounded-lg text-left w-full shadow';
        optionButton.innerHTML = `<span class="font-bold mr-2">${key})</span> ${options[key]}`;
        optionButton.setAttribute('data-option', key); // Atributo para identificar a opção

        optionButton.addEventListener('click', () => {
            // Remove a seleção de outros botões
            document.querySelectorAll('.option-button').forEach(btn => {
                btn.classList.remove('selected');
            });
            // Adiciona seleção ao botão clicado
            optionButton.classList.add('selected');
            selectedOption = key; // Armazena a opção selecionada
            submitAnswerButton.disabled = false; // Habilita o botão de verificar
            submitAnswerButton.classList.remove('opacity-50', 'cursor-not-allowed');
        });
        optionsContainer.appendChild(optionButton);
    }

    if (hideAreaSelector) {
        // Esconde o seletor de área e mostra a carta do jogo
        areaSelector.classList.add('hidden');
        gameCard.classList.remove('hidden');
    }
}

// Função para verificar a resposta
submitAnswerButton.addEventListener('click', () => {
    if (!currentQuestion || !selectedOption) return;

    feedbackContainer.innerHTML = '';
    const feedbackDiv = document.createElement('div');
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'explanation text-left';

    if (selectedOption === currentQuestion.correct) {
        feedbackDiv.className = 'feedback correct';
        feedbackDiv.textContent = translations[currentLanguage].feedback_correct;
    } else {
        feedbackDiv.className = 'feedback incorrect';
        feedbackDiv.textContent = translations[currentLanguage].feedback_incorrect_prefix + `${currentQuestion.correct}).`;
    }
    const langSuffix = currentLanguage.replace('-', '');
    explanationDiv.textContent = translations[currentLanguage].explanation_prefix + (currentQuestion[`explanation_${langSuffix.toLowerCase()}`] || currentQuestion.explanation_pt); // Explicação direta

    feedbackContainer.appendChild(feedbackDiv);
    feedbackContainer.appendChild(explanationDiv);

    // Após responder, desabilita as opções e o botão de verificar
    document.querySelectorAll('.option-button').forEach(btn => {
        btn.disabled = true;
    });
    submitAnswerButton.disabled = true;
    submitAnswerButton.classList.add('opacity-50', 'cursor-not-allowed');

    // Mostra o botão para ir para a próxima carta
    nextCardButton.classList.remove('hidden');
});

// Event listeners para os botões de seleção de área (do seletor inicial)
areaSelectButtons.forEach(button => {
    button.addEventListener('click', () => {
        const areaName = button.getAttribute('data-area'); // Pega o nome da área (em PT do JSON)
        // Precisamos filtrar as perguntas pela área no idioma *correto*.
        // A 'area' no JSON de perguntas multilíngues agora deve ter um sufixo de idioma, e usaremos 'area_pt' como base para os botões
        const langSuffix = currentLanguage.replace('-', '');
        const questionsInArea = allQuestions.filter(q => {
            // Verifica a área no idioma atual ou fallback para pt_br se não existir
            return (q[`area_${langSuffix.toLowerCase()}`] || q.area_pt) === areaName;
        });

        if (questionsInArea.length > 0) {
            // Para este exemplo, pegaremos a primeira pergunta da área.
            // Para um jogo completo, você precisaria de lógica para embaralhar ou controlar perguntas já vistas.
            displayQuestion(questionsInArea[0]);
        } else {
            console.warn(`Nenhuma pergunta encontrada para a área: ${areaName} no idioma ${currentLanguage}`);
        }
    });
});

// Event listener para o botão de carta aleatória no seletor inicial
randomAreaButtonSelector.addEventListener('click', () => {
    if (allQuestions.length === 0) {
        console.warn(translations[currentLanguage].error_loading_questions);
        return;
    }
    const randomIndex = Math.floor(Math.random() * allQuestions.length);
    displayQuestion(allQuestions[randomIndex]);
});

// Event listener para o botão "Próxima Carta" (após responder)
nextCardButton.addEventListener('click', () => {
    // Esconde a carta atual e mostra o seletor de área novamente
    gameCard.classList.add('hidden');
    areaSelector.classList.remove('hidden');
    feedbackContainer.innerHTML = ''; // Limpa feedback anterior
    nextCardButton.classList.add('hidden'); // Esconde o botão de próxima carta
});

// Event listener para o botão de voltar para a home
backToHomeButton.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Ao carregar a página:
document.addEventListener('DOMContentLoaded', async () => {
    const params = getQueryParams();
    const sessionId = params.session;
    currentLanguage = params.lang; // Define o idioma com base na URL
    document.documentElement.lang = currentLanguage; // Define o atributo lang do HTML

    if (sessionId) {
        sessionIdDisplay.textContent = sessionId;
        // Carrega as perguntas com base no idioma da URL
        await loadQuestions(currentLanguage); // Chame loadQuestions com o idioma
        updateUITexts(); // Atualiza todos os textos estáticos da UI
        // Exibe o seletor de área inicialmente
        areaSelector.classList.remove('hidden');
        gameCard.classList.add('hidden'); // Garante que a carta está oculta inicialmente
    } else {
        sessionIdDisplay.textContent = 'N/A';
        console.error(translations[currentLanguage].error_no_session_id); // Log para depuração
        window.location.href = 'index.html';
    }
});
