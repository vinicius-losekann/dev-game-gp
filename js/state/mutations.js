// ============================================
// PM: The KPI Master - State: Mutations
// ============================================
// Funções de ESCRITA no estado. Recebem os dados a mutar por parâmetro,
// mantendo a assinatura explícita sobre o que cada função modifica.
// Fase 2.3 do roadmap.
// ============================================

/**
 * Reseta todos os jogadores para o início de uma partida
 * (KPI zero, fase inicial, recursos iniciais, sai do estado "aguardando no lobby").
 * @param {Array} players - Game.state.players (mutado in-place)
 * @param {object} config - CONFIG (usa config.FASES, config.RECURSOS_INICIAIS)
 */
function resetAllPlayers(players, config) {
    players.forEach(p => {
        p.kpi = 0;
        p.phase = config.FASES[0].id;
        p.activities = 0;
        p.waitingInLobby = false;
        p.recursos = config.RECURSOS_INICIAIS;
    });
}

/**
 * Reseta o estado da partida (mantém a sala e os jogadores).
 * @param {object} state - Game.state (mutado in-place)
 * @param {object} config - CONFIG (usa config.JOGO.SESSION_DURATION)
 */
function resetGameState(state, config) {
    state.gameStarted = false;
    state.gameOver = false;
    state.currentRound = null;
    state.usedRespondedorThisRound = [];
    state.timer = config.JOGO.SESSION_DURATION;
    clearInterval(state.timerInterval);
    state.timerInterval = null;
}

// ============================================
// EXPORTAÇÃO
// ============================================
window.Game = window.Game || {};
window.Game.mutations = {
    resetAllPlayers,
    resetGameState
};