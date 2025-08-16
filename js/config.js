// js/config.js

// Configurações do Firebase (suas credenciais)
const firebaseConfig = {
    apiKey: "AIzaSyDdiedj1Smjzn9CDqShdhG5Y0_Sa18xyWI",
    authDomain: "jogo-gerencia-de-projetos.firebaseapp.com",
    projectId: "jogo-gerencia-de-projetos",
    storageBucket: "jogo-gerencia-de-projetos.firebasestorage.app",
    messagingSenderId: "356867532123",
    appId: "1:356867532123:web:0657d84445a584999f2667e", // Verifique se este appId é o correto do seu projeto Firebase
    measurementId: "G-M5QYQ36Q9P"
};

// Objeto de configuração da aplicação
const AppConfig = {
    // Define o idioma padrão da aplicação.
    defaultLanguage: 'pt-BR',

    // Adiciona a lista de idiomas suportados
    supportedLanguages: [
        { code: 'pt-BR', name: 'Português (Brasil)' },
        { code: 'en-US', name: 'English (US)' },
        { code: 'es-ES', name: 'Español (ES)' }
    ]
};

// Expõe as configurações para que outros scripts possam acessá-las globalmente
window.firebaseConfig = firebaseConfig;
window.AppConfig = AppConfig; // Expor AppConfig globalmente

// Usa o appId das suas credenciais como o appId do seu aplicativo
// Ou mantém o __app_id se estiver sendo injetado por um ambiente específico
window.appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.appId;

// O token de autenticação inicial, se fornecido pelo ambiente
window.initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Mensagens de log para confirmar que as configurações foram carregadas
console.log("Config.js carregado:");
console.log("App ID (usado):", window.appId);
console.log("Firebase Config (disponível):", window.firebaseConfig);
console.log("AppConfig (disponível):", window.AppConfig);
