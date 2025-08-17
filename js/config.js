// config.js

// Assegura que AppConfig é carregado globalmente.
// __app_id e __firebase_config são fornecidos globalmente pelo ambiente Canvas e
// serão acessados no index.html para a inicialização do Firebase.

// Configurações específicas do seu aplicativo, como idiomas suportados
const AppConfig = {
    defaultLanguage: 'pt-BR', // Garante que é 'pt-BR' para corresponder aos seus arquivos de tradução
    supportedLanguages: [
        { code: 'pt-BR', name: 'Português' },
        { code: 'en-US', name: 'English' },
        { code: 'es-ES', name: 'Español' }
    ],
    // Outras configurações do aplicativo aqui...
};

// Torna as configurações acessíveis globalmente
window.AppConfig = AppConfig;
// O appId será obtido diretamente no index.html e game.html
// e atribuído a window.appId lá, garantindo que __app_id esteja disponível.
