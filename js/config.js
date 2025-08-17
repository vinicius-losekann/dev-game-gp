// config.js

// Este arquivo define apenas as configurações específicas do seu aplicativo (AppConfig).
// As variáveis __app_id e __firebase_config (do ambiente Canvas)
// serão lidas e tratadas diretamente no script de inicialização do Firebase em index.html e game.html,
// garantindo que estejam disponíveis no momento certo.

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

console.log("config.js carregado. AppConfig disponível globalmente.");
// NÃO tente ler __app_id ou __firebase_config aqui. Será feito em index.html/game.html.
