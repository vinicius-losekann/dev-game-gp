// js/config.js

export const config = {
    // Suas configurações do projeto Firebase.
    firebaseConfig: {
        apiKey: "AIzaSyDdiedj1Smjzn9CDqShdhG5Y0_Sa18xyWI",
        authDomain: "jogo-gerencia-de-projetos.firebaseapp.com",
        projectId: "jogo-gerencia-de-projetos",
        storageBucket: "jogo-gerencia-de-projetos.firebasestorage.app",
        messagingSenderId: "356867532123",
        appId: "1:356867532123:web:0657d84635a5849df2667e"
    },
    // Nome do seu aplicativo, usado como um identificador para o Firestore.
    appId: "jogo-gp-v1",
    // Configurações de idiomas do jogo
    languages: [
        { code: 'pt-BR', name: 'Português (BR)' },
        { code: 'en-US', name: 'Inglês (US)' },
        { code: 'es-ES', name: 'Espanhol (ES)' }
    ],
    defaultLang: 'pt-BR'
};
