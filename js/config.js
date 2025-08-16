// config.js

// Configurações do Firebase (suas credenciais)
// Estas são as credenciais do seu projeto Firebase.
const firebaseConfig = {
    apiKey: "AIzaSyDdiedj1Smjzn9CDqShdhG5Y0_Sa18xyWI",
    authDomain: "jogo-gerencia-de-projetos.firebaseapp.com",
    projectId: "jogo-gerencia-de-projetos",
    storageBucket: "jogo-gerencia-de-projetos.firebasestorage.app",
    messagingSenderId: "356867532123",
    appId: "1:356867532123:web:0657d84635a5849df2667e",
    measurementId: "G-M5QYQ36Q9P"
};

// Configurações globais do aplicativo, como o idioma padrão.
const AppConfig = {
    // Define o idioma padrão da aplicação.
    // Pode ser 'pt-BR', 'en-US', 'es-ES' ou qualquer outro idioma que você suporte.
    defaultLanguage: 'pt-BR', // Usado como fallback se nenhum idioma for detectado.
};

// Expõe as configurações do Firebase globalmente para que outros scripts possam acessá-las.
// O "window.firebaseConfig" torna este objeto disponível em todo o navegador.
window.firebaseConfig = firebaseConfig;

// Define o ID do aplicativo (appId).
// Ele tenta usar o '__app_id' injetado pelo ambiente do Canvas (que é o mais correto).
// Se '__app_id' não estiver definido, ele usa o 'appId' das suas próprias credenciais Firebase.
window.appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.appId;

// O 'initialAuthToken' é um token de autenticação fornecido pelo ambiente do Canvas.
// Ele será usado para autenticar o usuário ao iniciar o aplicativo.
window.initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Expõe as configurações do aplicativo globalmente.
window.AppConfig = AppConfig;

// Log para o console para confirmar que as configurações foram carregadas.
console.log("Config.js carregado:");
console.log("App ID (usado):", window.appId);
console.log("Firebase Config (disponível):", window.firebaseConfig);
console.log("Initial Auth Token:", window.initialAuthToken ? "Disponível" : "Não disponível");
console.log("AppConfig.defaultLanguage:", window.AppConfig.defaultLanguage);
