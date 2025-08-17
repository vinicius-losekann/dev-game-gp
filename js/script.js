// A função de atualização agora recebe o objeto de traduções
function updateContent(langCode, translations) {
    const lang = translations[langCode] || translations['pt-BR'];

    const elements = {
        title: document.getElementById('main-title'),
        objective: document.getElementById('game-objective'),
        instructionsTitle: document.getElementById('instructions-title'),
        instructionsList: document.getElementById('instructions-list'),
        newGameTitle: document.getElementById('new-game-title'),
        newGameButton: document.getElementById('new-game-button'),
        joinSessionTitle: document.getElementById('join-session-title'),
        usernameJoin: document.getElementById('username-join'),
        sessionCode: document.getElementById('session-code'),
        joinSessionButton: document.querySelector('#join-session-form button'),
        gameVersionText: document.getElementById('game-version-text')
    };

    document.title = lang.title;

    if (elements.title) elements.title.textContent = lang.title;
    if (elements.objective) elements.objective.textContent = lang.objective;
    if (elements.instructionsTitle) elements.instructionsTitle.textContent = lang.instructionsTitle;

    if (elements.instructionsList) {
        elements.instructionsList.innerHTML = '';
        lang.instructions.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            elements.instructionsList.appendChild(li);
        });
    }

    if (elements.newGameTitle) elements.newGameTitle.textContent = lang.newGameTitle;
    if (elements.newGameButton) elements.newGameButton.textContent = lang.newGameButton;
    if (elements.joinSessionTitle) elements.joinSessionTitle.textContent = lang.joinSessionTitle;
    if (elements.usernameJoin) elements.usernameJoin.placeholder = lang.usernamePlaceholder;
    if (elements.sessionCode) elements.sessionCode.placeholder = lang.sessionCodePlaceholder;
    if (elements.joinSessionButton) elements.joinSessionButton.textContent = lang.joinSessionButton;
    if (elements.gameVersionText) elements.gameVersionText.textContent = lang.versionText;

    document.querySelectorAll('.language-selection button').forEach(button => {
        button.classList.remove('selected');
    });
    const selectedButton = document.querySelector(`button[data-lang="${langCode}"]`);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
}

// Lógica para carregar as traduções e inicializar a página
document.addEventListener('DOMContentLoaded', () => {
    fetch('data/translations/index_translations.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao carregar o arquivo: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(translations => {
            const langContainer = document.getElementById('language-selection');
            config.languages.forEach(lang => {
                const button = document.createElement('button');
                button.textContent = lang.name;
                button.setAttribute('data-lang', lang.code);
                button.onclick = () => updateContent(lang.code, translations);
                langContainer.appendChild(button);
            });

            updateContent(config.defaultLang, translations);
        })
        .catch(error => {
            console.error('Falha ao carregar as traduções:', error);
            alert('Não foi possível carregar o conteúdo do jogo. Verifique o console para mais detalhes.');
        });

    document.getElementById('new-game-button').addEventListener('click', () => {
        const newSessionCode = 'ABCDE';
        const sessionCodeInput = document.getElementById('session-code');
        sessionCodeInput.value = newSessionCode;
        alert('Nova sessão criada! O código foi preenchido no campo ao lado.');
    });
});
