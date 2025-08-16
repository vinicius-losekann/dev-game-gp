// js/utils.js

/**
 * Exibe uma mensagem temporária em uma caixa de mensagens pré-definida no HTML.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo da mensagem ('info', 'success', 'error', 'warning').
 * As classes CSS para estes tipos devem estar definidas em style.css.
 */
export function showMessage(message, type = 'info') {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) {
        console.error("Erro: Elemento 'messageBox' não encontrado no DOM. Verifique seu HTML.");
        return;
    }
    messageBox.textContent = message;
    // Remove todas as classes de tipo existentes e adiciona a nova
    messageBox.className = `message-box ${type}`;
    messageBox.classList.remove('hidden'); // Garante que a caixa de mensagem esteja visível

    // Esconde a mensagem após 5 segundos
    setTimeout(() => {
        messageBox.classList.add('hidden');
        messageBox.textContent = ''; // Limpa o texto
    }, 5000);
}

/**
 * Extrai os parâmetros 'session' e 'lang' da URL atual.
 * @returns {{session: string|null, lang: string|null}} Um objeto contendo os valores dos parâmetros.
 */
export function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    const langParam = urlParams.get('lang');
    return {
        session: sessionParam,
        lang: langParam
    };
}

/**
 * Retorna o código de idioma de 4 caracteres (ex: 'PTBR', 'ENUS')
 * a partir de um ID de sessão que termina com o código de idioma.
 * @param {string} sessionId - O ID da sessão (ex: '1234PTBR').
 * @returns {string|null} O código de idioma formatado (ex: 'pt-BR') ou null se não for encontrado.
 */
export function getLanguageFromSessionIdString(sessionId) {
    const languageCodeToLangMap = {
        'PTBR': 'pt-BR',
        'ESES': 'es-ES',
        'ENUS': 'en-US'
    };
    if (sessionId && sessionId.length >= 4) {
        const code = sessionId.substring(sessionId.length - 4).toUpperCase();
        return languageCodeToLangMap[code] || null;
    }
    return null;
}
