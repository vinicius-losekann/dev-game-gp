// config.js

// Assegura que AppConfig e Firebase Config são carregados globalmente.
// No ambiente Canvas, __app_id e __firebase_config são fornecidos.

// Garante que __app_id e __firebase_config estejam disponíveis globalmente ANTES de qualquer outra lógica.
// Isso é crucial para que o script de inicialização do Firebase no index.html possa acessá-los.
window.appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
window.firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
window.initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null; // Expondo também o token de autenticação

// Verifique se a configuração do Firebase foi carregada corretamente.
if (Object.keys(window.firebaseConfig).length === 0) {
    console.error("Firebase Config está vazio ou não foi carregado. Verifique a variável __firebase_config no ambiente Canvas.");
    // Você pode adicionar uma mensagem de erro na UI se desejar.
} else {
    console.log("Firebase Config (disponível globalmente):", window.firebaseConfig);
}

console.log("App ID (disponível globalmente):", window.appId);
console.log("Initial Auth Token (disponível globalmente):", window.initialAuthToken ? "Disponível" : "Não disponível");


// Configurações específicas do seu aplicativo, como idiomas suportados
const AppConfig = {
    defaultLanguage: 'pt-BR', // Usar o formato completo 'pt-BR'
    supportedLanguages: [
        { code: 'pt-BR', name: 'Português (Brasil)' },
        { code: 'en-US', name: 'English (US)' },
        { code: 'es-ES', name: 'Español (España)' }
    ],
    // Outras configurações do aplicativo aqui...
};

// Torna AppConfig acessível globalmente
window.AppConfig = AppConfig;
