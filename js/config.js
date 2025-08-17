// config.js

// Assegura que AppConfig e Firebase Config são carregados globalmente.
// No ambiente Canvas, __app_id e __firebase_config são fornecidos.

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// Verifique se a configuração do Firebase foi carregada corretamente.
if (Object.keys(firebaseConfig).length === 0) {
    console.error("Firebase Config está vazio ou não foi carregado. Verifique a variável __firebase_config.");
    // Você pode adicionar uma mensagem de erro na UI se desejar.
} else {
    console.log("Firebase Config (disponível):", firebaseConfig);
}

// Configurações específicas do seu aplicativo, como idiomas suportados
const AppConfig = {
    defaultLanguage: 'pt',
    supportedLanguages: [
        { code: 'pt', name: 'Português' },
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Español' }
    ],
    // Outras configurações do aplicativo aqui...
};

// Torna as configurações acessíveis globalmente se não estiver usando módulos ES
// Caso contrário, você exportaria e importaria em outros arquivos.
window.AppConfig = AppConfig;
window.firebaseConfig = firebaseConfig;
window.appId = appId; // Adiciona appId ao escopo global para acesso em gameLogic.js

// O restante da sua inicialização do Firebase deve ser feito em outro lugar (ex: index.html ou um script firebaseInit.js)
// usando essas variáveis globais.
