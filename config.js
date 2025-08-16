// Este arquivo expõe as variáveis de configuração do ambiente para o seu código.
// As variáveis __app_id, __firebase_config e __initial_auth_token são injetadas
// automaticamente pelo ambiente do Canvas.

window.appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
window.firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
window.initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

console.log("Config.js carregado:");
console.log("App ID:", window.appId);
console.log("Firebase Config:", window.firebaseConfig);
console.log("Initial Auth Token:", window.initialAuthToken ? "Disponível" : "Não disponível");
