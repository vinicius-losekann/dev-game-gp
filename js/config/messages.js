// js/config/messages.js
window.Game = window.Game || {};
window.Game.MSG = {};

// ============================================
// MENSAGENS DO LOBBY
// ============================================
Game.MSG.LOBBY = {
    CONNECTING: 'Conectando...',
    CONNECTED: 'Conectado',
    DISCONNECTED: 'Desconectado',
    ERROR: 'Erro de conexão',
    RECONNECTING: (attempt, max) => `Reconectando (${attempt}/${max})...`,
    WAITING_PLAYERS: 'Aguardando jogadores...',
    WAITING_HOST: 'Aguardando o host iniciar a partida...',
    ROOM_FULL: '⚠️ Sala cheia (máximo de ' + CONFIG.JOGO.MAX_PLAYERS + ' jogadores).',
    NAME_TAKEN: '⚠️ Esse nome já está em uso nesta sala. Escolha outro nome e entre novamente.',
    SESSION_ENDED: '⛔ O host encerrou a sessão.',
    MATCH_ENDED: '🏁 Partida encerrada. Voltando ao lobby...',
    HOST_CHANGED: '👑 Você agora é o host!',
    HOST_DISCONNECTED: 'Host desconectado — tentando reconectar...',
    FINDING_HOST: (attempt, max) => `Procurando novo host (${attempt}/${max})...`,
    RECONNECTED: 'Reconectado',
    RECONNECT_FAILED: 'Não foi possível reconectar. Recarregue a página.',
    BACKUP_BECOMING_HOST: '👑 Assumindo como novo host!',
};

// ============================================
// MENSAGENS DO JOGO
// ============================================
Game.MSG.GAME = {
    STARTING: '🎯 Iniciando partida...',
    WAITING_SPECTATOR: (perguntador, respondedor) => `⏳ ${perguntador} pergunta para ${respondedor}...`,
    ROUND_READY: 'Rodada pronta!',
    TIMEOUT: (player) => `⌛ ${player} não respondeu a tempo. Pulando vez automaticamente.`,
    GAME_OVER: '🏆 Fim de Partida!',
    KPI_FORMULA: `KPI Final = KPI acumulado + (Recursos restantes × ${CONFIG.KPI.VALOR_RECURSO_FINAL})`,
};

// ============================================
// MENSAGENS DE RESULTADO
// ============================================
Game.MSG.RESULT = {
    CORRECT: '✅ Acertou!',
    WRONG: '❌ Errou!',
    KPI_GAINED: (gain) => `+${gain} KPI`,
    KPI_ZERO: '0 KPI',
    RESOURCES_REMAINING: (qty) => `📦 ${qty} recursos`,
    ASSESSORIA_BONUS: (bonus) => `+${bonus} KPI (sugestão correta)`,
    NO_RESOURCES: '⚠️ Sem recursos — vez pulada',
};

// ============================================
// MENSAGENS DE ASSESSORIA
// ============================================
Game.MSG.ASSESSORIA = {
    REQUEST: '📞 Pedir Assessoria',
    WAITING: (assessor) => `📞 Aguardando resposta de ${assessor}...`,
    SUGGESTION: (assessor, sugestao) => `🧭 ${assessor} sugere: ${sugestao.toUpperCase()}`,
    RECUSED: (assessor) => `❌ ${assessor} recusou o pedido de assessoria.`,
    TIMEOUT: (assessor) => `⌛ ${assessor} não respondeu a tempo.`,
    NO_CANDIDATES: '⚠️ Nenhum jogador disponível para assessoria.',
    ENCERRAMENTO_BLOCK: '⚠️ Jogadores na fase de Encerramento não podem pedir assessoria.',
    ASSESSORIA_ALREADY: '⚠️ Já existe um pedido de assessoria nesta rodada.',
    ROUND_ALREADY_ANSWERED: '⚠️ Rodada já foi respondida — não é mais possível pedir assessoria.',
    SELECT_ASSESSOR: 'Escolha um jogador para consultar:',
    QUESTION: 'Pergunta...',
    RECUSAR: '❌ Recusar',
};

// ============================================
// MENSAGENS DE VENDA
// ============================================
Game.MSG.VENDA = {
    TITLE: '💰 Vender Recurso',
    SELL_PRICE: (price) => `Vender 1📦 por <strong style="color:#ffd700;">${price} KPI</strong>`,
    YOUR_RESOURCES: (qty) => `Seus recursos: 📦 ${qty}`,
    NO_RESOURCES: '⚠️ Você não tem recursos para vender.',
    NO_BUYERS: '⚠️ Nenhum jogador disponível para comprar (precisa ter pelo menos ' + CONFIG.KPI.VALOR_VENDA_RECURSO + ' KPI).',
    CONFIRM_OFFER: (comprador) => `Enviar oferta de venda de 1📦 para ${comprador} por ${CONFIG.KPI.VALOR_VENDA_RECURSO} KPI?`,
    WAITING_ACCEPT: (comprador) => `🔄 Aguardando ${comprador} aceitar a oferta...`,
    OFFER_RECEIVED: (vendedor, valor) => `<strong>${vendedor}</strong> oferece 1📦 por <strong style="color:#ffd700;">${valor} KPI</strong>`,
    REJECTED: (motivo) => `⚠️ ${motivo}`,
    CONFIRMED: (vendedor, comprador) => `💰 Venda confirmada: ${vendedor} → ${comprador}`,
};

// ============================================
// MENSAGENS DE EVENTO
// ============================================
Game.MSG.EVENTO = {
    TITLE: '📋 Evento',
    CLOSE: '✕ Fechar',
};

// ============================================
// MENSAGENS DE ERRO E VALIDAÇÃO
// ============================================
Game.MSG.ERROR = {
    NO_EVENT: '❌ Nenhum evento disponível!',
    NO_QUESTION: '❌ Sem pergunta disponível!',
    NO_PLAYERS: '⚠️ Jogadores ativos insuficientes para continuar a partida.',
    NO_RESOURCES_ALL: '⚠️ Nenhum jogador ativo tem recursos. Encerrando partida.',
    FETCH_FAILED: (error) => `⚠️ Fetch falhou: ${error}`,
    STATE_CORRUPTED: '⚠️ Estado salvo corrompido. Limpando.',
    STATE_EXPIRED: '💾 Estado salvo expirou.',
    STATE_DIFFERENT_ROOM: '💾 Estado salvo pertence a outra sala/jogador. Ignorando.',
    CONNECTION_FAILED: '❌ Não foi possível estabelecer conexão P2P:',
    PEER_ERROR: '❌ Erro de conexão. Verifique sua internet.',
};

// ============================================
// MENSAGENS DE CONFIRMAÇÃO
// ============================================
Game.MSG.CONFIRM = {
    END_SESSION: '⛔ Encerrar a sessão? Todos os jogadores serão desconectados e a sala destruída.',
    END_MATCH: '🏁 Encerrar a partida? Todos voltarão ao lobby com KPI zerado.',
    LEAVE_MATCH: '🚶 Sair da partida? Você aguardará no lobby até a próxima partida.',
    LEAVE_SESSION: '🚪 Sair da sessão? Você voltará à tela inicial.',
};

// ============================================
// MENSAGENS DE STATUS
// ============================================
Game.MSG.STATUS = {
    PLAYER_COUNT: (count, max) => `${count}/${max} jogadores`,
    PLAYER_LABEL: 'jogadores',
    MIN_PLAYERS: (min) => `Mínimo de ${min} jogadores ativos`,
    READY_TO_START: (count) => `${count} jogadores ativos - pronto!`,
    WAITING_FOR_HOST: 'Aguardando o host iniciar a partida...',
    MATCH_IN_PROGRESS: 'Partida em andamento',
    WAITING_IN_LOBBY: 'Você saiu da partida. Aguarde o host encerrar.',
};