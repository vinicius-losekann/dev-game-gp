// js/config.js

// Configurações específicas do seu aplicativo
const AppConfig = {
    // Idioma padrão do aplicativo (corrigido para 'pt-BR' para consistência)
    defaultLanguage: 'pt-BR', 
    supportedLanguages: [
        { code: 'pt-BR', name: 'Português' },
        { code: 'en-US', name: 'English' },
        { code: 'es-ES', name: 'Español' }
    ],
    maxSessionIdAttempts: 100 // Número máximo de tentativas para gerar um ID de sessão único
};

// Torna AppConfig acessível globalmente (para outros scripts que não são módulos ou para conveniência)
window.AppConfig = AppConfig;
