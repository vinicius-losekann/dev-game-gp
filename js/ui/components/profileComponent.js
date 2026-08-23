// ============================================
// PM: The KPI Master - UI Component: Perfil
// ============================================
// Renderiza o card de perfil do jogador local (KPI, recursos, fase,
// atividades e barra de progresso).
// Fase 5.5 do roadmap.
//
// 🐛 BUG-003 (ver ISSUES.md): essa lógica estava duplicada em 3 lugares
// diferentes (sessionEngine.startGame, answerEngine.updatePlayerKPI,
// messageHandler.restoreState) e um quarto lugar que PRECISAVA dela
// (main.js → resumeGameEngineIfHost) nunca a chamava — por isso o card
// do host ficava desatualizado após F5. Esta função consolida os 3
// blocos duplicados; os 4 pontos agora chamam Game.ui.renderProfileCard().
// ============================================

/**
 * Renderiza o card de perfil com os dados do jogador informado.
 * @param {object} player - objeto com { kpi, recursos, phase, activities }
 *   (pode ser um jogador de Game.state.players ou um payload de mensagem
 *   de rede com os mesmos campos)
 */
function renderProfileCard(player) {
    if (!player) return;

    document.getElementById('myKPI').textContent = player.kpi;

    // recursos é opcional em alguns payloads (ex: bônus de assessoria isolado)
    if (player.recursos !== undefined) {
        document.getElementById('myRecursos').textContent = player.recursos;
    }

    const fase = Game.getFaseById(player.phase);
    document.getElementById('myPhaseName').textContent = fase.nome;
    document.getElementById('myPhaseIcon').textContent = fase.emoji;
    document.getElementById('myActivity').textContent = player.activities;
    document.getElementById('myProgressFill').style.width =
        (player.activities / CONFIG.JOGO.ACTIVITIES_PER_PHASE * 100) + '%';
}

// ============================================
// EXPORTAÇÃO
// ============================================
window.Game = window.Game || {};
window.Game.ui = window.Game.ui || {};
Object.assign(window.Game.ui, {
    renderProfileCard
});