// js/index.js

// Idioma padrão lido do arquivo de configuração
let currentLanguage = AppConfig.defaultLanguage; 
let pageTranslations = {}; // Objeto para armazenar as traduções carregadas

const newGameButton = document.getElementById('newGameButton');
const accessGameButton = document.getElementById('accessGameButton');
const sessionIdInput = document.getElementById('sessionIdInput');
const errorMessage = document.getElementById('errorMessage');
const sessionInfo = document.getElementById('sessionInfo'); // Novo elemento

// Adicionado: Referência ao contêiner principal para controlar a visibilidade
const mainContentContainer = document.getElementById('main-content-container');

// Log para verificar se o elemento foi encontrado
console.log('mainContentContainer encontrado:', mainContentContainer);

// Estas variáveis serão atribuídas dentro de DOMContentLoaded
let langPtBrButton;
let langEnUsButton;
let langEsEsButton;

// Função para aplicar as traduções na página
function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (pageTranslations[key]) {
            // Verifica se é um placeholder de input
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = pageTranslations[key];
            } else {
                element.textContent = pageTranslations[key];
            }
        }
    });
    // Atualiza o título da página
    document.title = pageTranslations['main_page_title'];
    console.log(`Traduções aplicadas para ${currentLanguage}.`);
}

// Função para carregar as traduções do arquivo JSON
async function loadTranslations(lang) {
    let success = false;
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
        currentLanguage = lang; // Define o idioma atual para o carregado
        document.documentElement.lang = currentLanguage; // Atualiza o atributo lang do <html>
        applyTranslations(); // Aplica as traduções logo após o carregamento

        console.log(`Traduções para ${lang} carregadas com sucesso.`);
        success = true;
    } catch (error) {
        console.error("Erro ao carregar ou aplicar traduções:", error);
        showMessage(`Erro ao carregar traduções para ${lang}.`, 'error');
    }
    return success;
}

// Função para exibir mensagens ao usuário
function showMessage(message, type = 'info') {
    errorMessage.textContent = message;
    errorMessage.className = `message-box ${type}`; // Define a classe com base no tipo
    errorMessage.classList.remove('hidden'); // Garante que a mensagem seja visível

    // Oculta a mensagem após 5 segundos
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

// Função para gerar um ID de sessão aleatório
function generateSessionId() {
    // Gerar um ID de 4 dígitos numéricos e 2 letras para o idioma
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // Garante 4 dígitos
    const langCode = currentLanguage.substring(0, 2).toUpperCase(); // Pega as 2 primeiras letras do código do idioma
    return `${randomDigits}${langCode}`;
}

// Função para remover um jogador da sessão (usado principalmente em game.js, mas útil aqui para consistência)
async function removePlayerFromSession(sessionId, userId) {
    if (!db || !firestore) {
        console.error("Firebase Firestore não está inicializado.");
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
                console.log(`Usuário ${userId} removido da sessão ${sessionId}.`);
            }
        }
    } catch (error) {
        console.error("Erro ao remover usuário da sessão:", error);
    }
}


// Função para configurar o idioma e carregar as traduções
async function setLanguage(lang) {
    console.log(`Tentando definir idioma para: ${lang}`);
    const success = await loadTranslations(lang);
    if (success) {
        console.log(`Idioma definido para: ${lang}`);
        // Remove a classe 'selected' de todos os botões e adiciona ao selecionado
        document.querySelectorAll('.language-button').forEach(button => {
            button.classList.remove('selected');
        });

        let selectedButtonElement = null;
        if (lang === 'pt-BR') selectedButtonElement = langPtBrButton;
        else if (lang === 'en-US') selectedButtonElement = langEnUsButton;
        else if (lang === 'es-ES') selectedButtonElement = langEsEsButton;
        
        if (selectedButtonElement) {
            selectedButtonElement.classList.add('selected');
            console.log('Botão de idioma selecionado:', selectedButtonElement.id);
        } else {
            console.error(`Elemento para idioma '${lang}' não encontrado. Não foi possível adicionar a classe 'selected'.`);
        }
        
        // Habilitar botões após as traduções serem carregadas
        newGameButton.disabled = false;
        accessGameButton.disabled = false;

        // Após carregar tudo e aplicar as traduções, torna o conteúdo visível
        // Isso é crucial para que o FOUC (Flash of Unstyled Content) não ocorra.
        if (mainContentContainer) {
            mainContentContainer.style.opacity = '1';
            mainContentContainer.style.visibility = 'visible';
            console.log('mainContentContainer definido para opacity: 1; visibility: visible;');
        }
    }
}


// Listener principal DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    // Referências aos botões de idioma
    langPtBrButton = document.getElementById('langPtBrButton');
    langEnUsButton = document.getElementById('langEnUsButton');
    langEsEsButton = document.getElementById('langEsEsButton');

    // Adiciona event listeners para os botões de idioma
    if (langPtBrButton) langPtBrButton.addEventListener('click', () => setLanguage('pt-BR'));
    if (langEnUsButton) langEnUsButton.addEventListener('click', () => setLanguage('en-US'));
    if (langEsEsButton) langEsEsButton.addEventListener('click', () => setLanguage('es-ES'));

    // Carrega o idioma padrão do AppConfig (que deve estar disponível globalmente)
    // E aguarda que a inicialização do Firebase seja concluída.
    await window.firebaseInitializedPromise;
    console.log("Firebase inicializado em index.js. Carregando traduções...");

    // Garante que AppConfig está disponível antes de tentar acessar AppConfig.defaultLanguage
    if (typeof window.AppConfig !== 'undefined' && window.AppConfig.defaultLanguage) {
        await setLanguage(window.AppConfig.defaultLanguage);
        console.log('Página carregada. setLanguage() inicial chamado com o idioma padrão do config.');
    } else {
        console.error("window.AppConfig ou window.AppConfig.defaultLanguage não está definido.");
        // Fallback para um idioma padrão ou exibir uma mensagem de erro.
        await setLanguage('pt-BR'); // Fallback
    }

    // Event listener para o botão "Iniciar Novo Jogo"
    newGameButton.addEventListener('click', async () => {
        if (!db || !firestore || !window.currentUserId) {
            showMessage(pageTranslations['error_firebase_not_ready'] || "Firebase não está pronto. Tente novamente.", 'error');
            return;
        }

        newGameButton.disabled = true;
        accessGameButton.disabled = true;
        
        showMessage(pageTranslations['creating_session'] || "Criando nova sessão...", 'info');
        console.log("Tentando criar nova sessão...");

        const newSessionId = generateSessionId();
        const sessionDocRef = firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);

        try {
            await firestore.setDoc(sessionDocRef, {
                createdAt: firestore.serverTimestamp(),
                createdBy: window.currentUserId,
                language: currentLanguage, // Salva o idioma da sessão
                currentPlayers: [{ userId: window.currentUserId, joinedAt: firestore.serverTimestamp() }]
            }, { merge: true }); // Use merge para não sobrescrever se o doc existir (improvável com ID aleatório)

            sessionInfo.innerHTML = `
                <p data-lang-key="session_created_message">${pageTranslations['session_created_message'] || "Sessão criada! Seu ID é:"} <span class="font-bold text-lg">${newSessionId}</span></p>
                <p data-lang-key="session_id_prompt">${pageTranslations['session_id_prompt'] || "Insira este ID para acessar seu jogo."}</p>
            `;
            sessionInfo.classList.remove('hidden');
            console.log(`Sessão ${newSessionId} criada com sucesso.`);

            // Redireciona após um pequeno atraso para o usuário ver a mensagem
            setTimeout(() => {
                window.location.href = `game.html?session=${newSessionId}&lang=${currentLanguage}`;
            }, 1500);

        } catch (error) {
            console.error("Erro ao criar sessão no Firestore:", error);
            showMessage(`${pageTranslations['error_creating_session'] || "Erro ao criar sessão:"} ${error.message}`, 'error');
            newGameButton.disabled = false;
            accessGameButton.disabled = false;
        }
    });

    // Event listener para o botão "Acessar Jogo Existente"
    joinSessionButton.addEventListener('click', async () => {
        if (!db || !firestore || !window.currentUserId) {
            showMessage(pageTranslations['error_firebase_not_ready'] || "Firebase não está pronto. Tente novamente.", 'error');
            return;
        }

        const enteredSessionId = sessionIdInput.value.trim();
        // Regex para validar 4 dígitos numéricos + 2 letras
        const sessionIdPattern = /^\d{4}[A-Za-z]{2}$/;

        if (!sessionIdPattern.test(enteredSessionId)) {
            showMessage(pageTranslations['error_invalid_session_id'] || "Por favor, digite um ID de sessão válido (4 dígitos numéricos e 2 letras).", 'error');
            return;
        }

        newGameButton.disabled = true;
        joinSessionButton.disabled = true;
        showMessage(pageTranslations['accessing_session'] || `Acessando sessão ${enteredSessionId}...`, 'info');
        console.log(`Tentando acessar sessão ${enteredSessionId}...`);

        // Caminho da coleção conforme as regras do Firestore: artifacts/{appId}/public/data/sessions
        const sessionDocRef = firestore.doc(db, `artifacts/${window.appId}/public/data/sessions`, enteredSessionId);

        try {
            const docSnap = await firestore.getDoc(sessionDocRef);
            if (docSnap.exists()) {
                const sessionData = docSnap.data();
                const sessionLanguage = sessionData.language || 'pt-BR'; // Pega o idioma da sessão existente

                // Adicionar o jogador à lista currentPlayers
                const players = sessionData.currentPlayers || [];
                const playerExists = players.some(player => player.userId === window.currentUserId);

                if (!playerExists) {
                    await firestore.updateDoc(sessionDocRef, {
                        currentPlayers: firestore.arrayUnion({ userId: window.currentUserId, joinedAt: firestore.serverTimestamp() })
                    });
                    console.log(`Usuário ${window.currentUserId} adicionado à sessão ${enteredSessionId}.`);
                } else {
                    console.log(`Usuário ${window.currentUserId} já está na sessão ${enteredSessionId}.`);
                }

                showMessage(pageTranslations['joining_session'] || `Entrando na sessão ${enteredSessionId}...`, 'success');
                console.log(`Entrando na sessão ${enteredSessionId}.`);
                // Redireciona para a página do jogo com o ID da sessão e o idioma da sessão
                window.location.href = `game.html?session=${enteredSessionId}&lang=${sessionLanguage}`;
            } else {
                showMessage(pageTranslations['session_not_found'] || `Sessão \"${enteredSessionId}\" não encontrada.`, 'error');
                newGameButton.disabled = false;
                joinSessionButton.disabled = false;
            }
        } catch (error) {
            console.error("Erro ao verificar sessão no Firestore:", error);
            showMessage(`${pageTranslations['error_accessing_session'] || "Erro ao verificar sessão:"} ${error.message}`, 'error');
            newGameButton.disabled = false;
            joinSessionButton.disabled = false;
        }
    });
});
