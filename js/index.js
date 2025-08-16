// js/index.js

let currentLanguage = AppConfig.defaultLanguage; 
let pageTranslations = {}; 

const newGameButton = document.getElementById('newGameButton');
const accessGameButton = document.getElementById('accessGameButton');
const sessionIdInput = document.getElementById('sessionIdInput');
const messageBox = document.getElementById('messageBox'); 
const sessionInfo = document.getElementById('sessionInfo'); 

const mainContentContainer = document.getElementById('main-content-container');
const languageSelectorButtonsContainer = document.getElementById('languageSelectorButtonsContainer'); 

// Função para aplicar as traduções na página
function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (pageTranslations[key]) {
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = pageTranslations[key];
            } else {
                element.textContent = pageTranslations[key];
            }
        }
    });
    document.title = pageTranslations['main_page_title'];
    console.log(`Traduções aplicadas para ${currentLanguage}.`);
}

// Função para carregar as traduções do arquivo JSON
async function loadTranslations(lang) {
    let success = false;
    try {
        // CORRIGIDO: Caminho relativo correto para o arquivo de traduções
        const response = await fetch('../translations/index_translations.json'); 
        if (!response.ok) {
            throw new Error(`Erro de rede ou arquivo não encontrado: ${response.status} ${response.statusText}`);
        }
        const allTranslations = await response.json();
        
        if (!allTranslations[lang]) {
            throw new Error(`Idioma '${lang}' não encontrado no arquivo de traduções.`);
        }

        pageTranslations = allTranslations[lang];
        currentLanguage = lang; 
        document.documentElement.lang = currentLanguage; 
        applyTranslations(); 

        console.log(`Traduções para ${lang} carregadas com sucesso.`);
        success = true;
    } catch (error) {
        console.error("Erro ao carregar ou aplicar traduções:", error);
        if (messageBox) {
            showMessage(`Erro ao carregar traduções para ${lang}.`, 'error');
        } else {
            console.error("Elemento messageBox não encontrado. Não foi possível exibir a mensagem de erro.");
        }
    }
    return success;
}

// Função para exibir mensagens ao usuário (garantindo que messageBox existe)
function showMessage(message, type = 'info') {
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`; 
        messageBox.classList.remove('hidden'); 

        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 5000);
    } else {
        console.error("Cannot display message: messageBox element not found.", message);
    }
}

// Função para gerar um ID de sessão aleatório
function generateSessionId() {
    const randomDigits = Math.floor(1000 + Math.random() * 9000); 
    const langCode = currentLanguage.substring(0, 2).toUpperCase(); 
    return `${randomDigits}${langCode}`;
}

// Função para remover um jogador da sessão (útil para consistência, mas não o foco principal aqui)
async function removePlayerFromSession(sessionId, userId) {
    if (!window.db || !window.firestore) {
        console.error("Firebase Firestore não está inicializado.");
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
        // Remove a classe 'selected' de todos os botões de idioma e adiciona ao selecionado
        document.querySelectorAll('.language-button').forEach(button => {
            button.classList.remove('selected');
        });
        const selectedButton = document.getElementById(`lang${lang.replace('-', '')}Button`);
        if (selectedButton) {
            selectedButton.classList.add('selected');
        }
        
        newGameButton.disabled = false;
        accessGameButton.disabled = false;
    }
}

// Função para criar os botões de seleção de idioma dinamicamente
function createLanguageButtons() {
    if (!AppConfig || !AppConfig.supportedLanguages || !languageSelectorButtonsContainer) {
        console.error("AppConfig.supportedLanguages ou languageSelectorButtonsContainer não está disponível.");
        return;
    }

    languageSelectorButtonsContainer.innerHTML = ''; 
    AppConfig.supportedLanguages.forEach(lang => {
        const button = document.createElement('button');
        button.id = `lang${lang.code.replace('-', '')}Button`; 
        button.classList.add('language-button');
        button.textContent = lang.name;
        button.addEventListener('click', () => setLanguage(lang.code));
        languageSelectorButtonsContainer.appendChild(button);
    });
    console.log("Botões de idioma criados dinamicamente.");
}


// Listener principal DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    if (!messageBox) {
        console.error("FATAL ERROR: Elemento messageBox não encontrado no DOM. Verifique index.html.");
        return; 
    }

    createLanguageButtons();

    await window.firebaseInitializedPromise;
    console.log("Firebase inicializado em index.js. Carregando traduções...");

    if (typeof window.AppConfig !== 'undefined' && window.AppConfig.defaultLanguage) {
        await setLanguage(window.AppConfig.defaultLanguage);
        console.log('Página carregada. setLanguage() inicial chamado com o idioma padrão do config.');
    } else {
        console.error("window.AppConfig ou window.AppConfig.defaultLanguage não está definido.");
        await setLanguage('pt-BR'); 
    }

    if (mainContentContainer) {
        mainContentContainer.classList.add('visible'); 
        console.log('mainContentContainer definido para opacity: 1; visibility: visible;');
    } else {
        console.error("Elemento mainContentContainer não encontrado.");
    }

    newGameButton.addEventListener('click', async () => {
        if (!window.db || !window.firestore || !window.currentUserId) {
            showMessage(pageTranslations['error_firebase_not_ready'] || "Firebase não está pronto. Tente novamente.", 'error');
            return;
        }

        newGameButton.disabled = true;
        accessGameButton.disabled = true;
        
        showMessage(pageTranslations['creating_session'] || "Criando nova sessão...", 'info');
        console.log("Tentando criar nova sessão...");

        const newSessionId = generateSessionId();
        const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, newSessionId);

        try {
            await window.firestore.setDoc(sessionDocRef, {
                createdAt: window.firestore.serverTimestamp(),
                createdBy: window.currentUserId,
                language: currentLanguage, 
                currentPlayers: [{ userId: window.currentUserId, joinedAt: window.firestore.serverTimestamp() }]
            }, { merge: true });

            sessionInfo.innerHTML = `
                <p data-lang-key="session_created_message">${pageTranslations['session_created_message'] || "Sessão criada! Seu ID é:"} <span class="font-bold text-lg">${newSessionId}</span></p>
                <p data-lang-key="session_id_prompt">${pageTranslations['session_id_prompt'] || "Insira este ID para acessar seu jogo."}</p>
            `;
            sessionInfo.classList.remove('hidden');
            console.log(`Sessão ${newSessionId} criada com sucesso.`);

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

    accessGameButton.addEventListener('click', async () => { 
        if (!window.db || !window.firestore || !window.currentUserId) {
            showMessage(pageTranslations['error_firebase_not_ready'] || "Firebase não está pronto. Tente novamente.", 'error');
            return;
        }

        const enteredSessionId = sessionIdInput.value.trim();
        const sessionIdPattern = /^\d{4}[A-Za-z]{2}$/;

        if (!sessionIdPattern.test(enteredSessionId)) {
            showMessage(pageTranslations['error_invalid_session_id'] || "Por favor, digite um ID de sessão válido (4 dígitos numéricos e 2 letras).", 'error');
            return;
        }

        newGameButton.disabled = true;
        accessGameButton.disabled = true;
        showMessage(pageTranslations['accessing_session'] || `Acessando sessão ${enteredSessionId}...`, 'info');
        console.log(`Tentando acessar sessão ${enteredSessionId}...`);

        const sessionDocRef = window.firestore.doc(window.db, `artifacts/${window.appId}/public/data/sessions`, enteredSessionId);

        try {
            const docSnap = await window.firestore.getDoc(sessionDocRef);
            if (docSnap.exists()) {
                const sessionData = docSnap.data();
                const sessionLanguage = sessionData.language || 'pt-BR'; 

                const players = sessionData.currentPlayers || [];
                const playerExists = players.some(player => player.userId === window.currentUserId);

                if (!playerExists) {
                    await window.firestore.updateDoc(sessionDocRef, {
                        currentPlayers: window.firestore.arrayUnion({ userId: window.currentUserId, joinedAt: window.firestore.serverTimestamp() })
                    });
                    console.log(`Usuário ${window.currentUserId} adicionado à sessão ${enteredSessionId}.`);
                } else {
                    console.log(`Usuário ${window.currentUserId} já está na sessão ${enteredSessionId}.`);
                }

                showMessage(pageTranslations['joining_session'] || `Entrando na sessão ${enteredSessionId}...`, 'success');
                console.log(`Entrando na sessão ${enteredSessionId}.`);
                window.location.href = `game.html?session=${enteredSessionId}&lang=${sessionLanguage}`;
            } else {
                showMessage(pageTranslations['session_not_found'] || `Sessão \"${enteredSessionId}\" não encontrada.`, 'error');
                newGameButton.disabled = false;
                accessGameButton.disabled = false;
            }
        } catch (error) {
            console.error("Erro ao verificar sessão no Firestore:", error);
            showMessage(`${pageTranslations['error_accessing_session'] || "Erro ao verificar sessão:"} ${error.message}`, 'error');
            newGameButton.disabled = false;
            accessGameButton.disabled = false;
        }
    });
});
