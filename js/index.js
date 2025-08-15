// js/index.js

let currentLanguage = 'pt-BR'; // Idioma padrão: Português do Brasil
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

const newGameButton = document.getElementById('newGameButton');
const accessGameButton = document.getElementById('accessGameButton');
const sessionIdInput = document.getElementById('sessionIdInput');
const errorMessage = document.getElementById('errorMessage');
const sessionInfo = document.getElementById('sessionInfo'); // Novo elemento

// Estas variáveis serão atribuídas dentro de DOMContentLoaded
let langPtBrButton;
let langEnUsButton;
let langEsEsButton;

// Função para carregar as traduções do arquivo JSON
async function loadTranslations(lang) {
    let success = false; // Flag para indicar se o carregamento foi bem-sucedido
    try {
        const response = await fetch('index_translations.json');
        if (!response.ok) {
            throw new Error(`Erro de rede ou arquivo não encontrado: ${response.status} ${response.statusText}`);
        }
        const allTranslations = await response.json();
        
        if (!allTranslations[lang]) {
            throw new Error(`Idioma '${lang}' não encontrado no arquivo de traduções.`);
        }

        pageTranslations = allTranslations[lang];
        console.log('Traduções carregadas para', lang, ':', pageTranslations);
        updateUITexts(); // Atualiza a UI após carregar as traduções
        success = true; // Marca como sucesso
    } catch (error) {
        console.error('Falha ao carregar ou processar as traduções:', error);
        pageTranslations = {
            main_title: "Jogo de Gerenciamento de Projetos (Erro de Carga)",
            description_text: "Ocorreu um erro ao carregar o conteúdo. Por favor, recarregue a página.",
            button_new_game: "Erro",
            access_game_title: "Erro",
            input_session_placeholder: "Erro",
            button_access_game: "Erro",
            error_invalid_session_id: "Erro: ID inválido.",
            language_select_title: "Idioma (Erro)",
            session_created_message: "Erro ao criar sessão: ",
            session_id_prompt: "Tente novamente."
        };
        updateUITexts(); // Tenta atualizar a UI mesmo com erro
    } finally {
        // Habilita ou mantém desabilitado com base no sucesso do carregamento
        newGameButton.disabled = !success;
        accessGameButton.disabled = !success;
        console.log('Botões de Ação re-habilitados após loadTranslations (Sucesso:', success, ')'); // Debug de re-habilitação
    }
}

// Função para atualizar os textos da UI com base no idioma carregado
function updateUITexts() {
    // Garante que pageTranslations está carregado antes de tentar acessar suas propriedades
    const isTranslationsLoaded = Object.keys(pageTranslations).length > 0 && pageTranslations.main_title;

    console.log('updateUITexts chamado. Estado de pageTranslations:', pageTranslations); // Debug
    console.log('isTranslationsLoaded:', isTranslationsLoaded); // Debug

    document.getElementById('mainTitle').textContent = isTranslationsLoaded ? pageTranslations.main_title : "Jogo de Gerenciamento de Projetos";
    document.getElementById('descriptionText').innerHTML = isTranslationsLoaded ? pageTranslations.description_text : "Domine as habilidades essenciais de gerenciamento de projetos neste jogo interativo! Aprenda sobre **planejamento**, **execução**, **monitoramento de progresso** e **resolução de desafios** em cenários simulados para se tornar um gestor de projetos de sucesso. Cada decisão importa!";
    document.querySelector('#newGameButton [data-lang-key="button_new_game"]').textContent = isTranslationsLoaded ? pageTranslations.button_new_game : "Iniciar Novo Jogo";
    document.getElementById('accessGameTitle').textContent = isTranslationsLoaded ? pageTranslations.access_game_title : "Acessar Jogo Existente";
    sessionIdInput.placeholder = isTranslationsLoaded ? pageTranslations.input_session_placeholder : "Digite o ID da Sessão";
    document.querySelector('#accessGameButton [data-lang-key="button_access_game"]').textContent = isTranslationsLoaded ? pageTranslations.button_access_game : "Acessar Jogo";
    document.getElementById('languageSelectTitle').textContent = isTranslationsLoaded ? pageTranslations.language_select_title : "Idioma";
    
    if (!errorMessage.classList.contains('hidden')) {
        errorMessage.textContent = isTranslationsLoaded ? pageTranslations.error_invalid_session_id : "Por favor, digite um ID de sessão válido (4 dígitos numéricos).";
    }
    
    // Lógica para sessionInfo
    if (!sessionInfo.classList.contains('hidden')) {
        const currentSessionId = sessionInfo.getAttribute('data-session-id');
        console.log('sessionInfo está visível. currentSessionId:', currentSessionId); // Debug

        if (isTranslationsLoaded && pageTranslations.session_created_message && pageTranslations.session_id_prompt) {
            console.log('Usando traduções para sessionInfo.'); // Debug
            sessionInfo.innerHTML = `${pageTranslations.session_created_message} <span class="font-bold text-teal-700">${currentSessionId}</span>.<br>${pageTranslations.session_id_prompt}`;
        } else {
            console.log('Usando fallback para sessionInfo.'); // Debug
            sessionInfo.innerHTML = `Sessão criada! Seu ID é: <span class="font-bold text-teal-700">${currentSessionId}</span>.<br>Insira este ID para acessar seu jogo.`;
        }
    } else {
        console.log('sessionInfo está oculto. Não será atualizado.'); // Debug
    }
}

// Função para gerar um ID de sessão de 4 dígitos
function generateSessionId() {
    return Math.floor(Math.random() * 9000) + 1000;
}

// Event listener para o botão "Iniciar Novo Jogo"
newGameButton.addEventListener('click', () => {
    const sessionId = generateSessionId();
    sessionIdInput.value = sessionId;
    sessionInfo.setAttribute('data-session-id', sessionId);
    
    sessionInfo.classList.remove('hidden'); // Certifica que o elemento está visível
    errorMessage.classList.add('hidden'); // Esconde qualquer mensagem de erro
    
    updateUITexts(); // Garante que a mensagem seja atualizada com as traduções corretas
    console.log('Botão "Iniciar Novo Jogo" clicado. ID da sessão:', sessionId); // Debug
});

// Event listener para o botão "Acessar Jogo"
accessGameButton.addEventListener('click', () => {
    const inputId = sessionIdInput.value.trim();
    if (/^\d{4}$/.test(inputId)) {
        errorMessage.classList.add('hidden');
        window.location.href = `game.html?session=${inputId}&lang=${currentLanguage}`;
    } else {
        errorMessage.textContent = pageTranslations.error_invalid_session_id || "Por favor, digite um ID de sessão válido (4 dígitos numéricos).";
        errorMessage.classList.remove('hidden');
        sessionInfo.classList.add('hidden');
    }
});

// Função para definir o idioma
async function setLanguage(lang) {
    currentLanguage = lang;
    
    // Remove a seleção de outros botões
    document.querySelectorAll('.language-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Encontra o botão correto usando as referências diretas (já atribuídas em DOMContentLoaded)
    let selectedButtonElement = null;
    if (lang === 'pt-BR') selectedButtonElement = langPtBrButton;
    else if (lang === 'en-US') selectedButtonElement = langEnUsButton;
    else if (lang === 'es-ES') selectedButtonElement = langEsEsButton;
    
    if (selectedButtonElement) {
        selectedButtonElement.classList.add('selected');
        console.log('Botão de idioma selecionado:', selectedButtonElement.id); // Debug
    } else {
        // Isso só deve acontecer se getElementById falhou em DOMContentLoaded ou se o ID está errado no HTML
        console.error(`Elemento para idioma '${lang}' não encontrado. Não foi possível adicionar a classe 'selected'.`);
    }
    
    // Desabilita os botões de ação enquanto as traduções são carregadas
    newGameButton.disabled = true;
    accessGameButton.disabled = true;

    await loadTranslations(currentLanguage);
}

// Ao carregar a página: define o idioma padrão e carrega as traduções
document.addEventListener('DOMContentLoaded', () => {
    // Atribui as variáveis dos botões de idioma AQUI, após o DOM estar carregado
    langPtBrButton = document.getElementById('langPtBrButton');
    langEnUsButton = document.getElementById('langEnUsButton');
    langEsEsButton = document.getElementById('langEsEsButton');

    // Anexar event listeners para os botões de idioma
    if (langPtBrButton) langPtBrButton.addEventListener('click', () => setLanguage('pt-BR'));
    if (langEnUsButton) langEnUsButton.addEventListener('click', () => setLanguage('en-US'));
    if (langEsEsButton) langEsEsButton.addEventListener('click', () => setLanguage('es-ES'));

    // Define o idioma padrão ao carregar
    setLanguage('pt-BR'); 
    console.log('Página carregada. setLanguage("pt-BR") inicial chamado.'); // Debug
});
