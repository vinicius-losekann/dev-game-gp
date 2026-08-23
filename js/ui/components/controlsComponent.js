/*
  FILE: js/ui/components/controlsComponent.js
  ARQUIVO LEGADO DE BASE: game-ui.js (listeners de botões de venda, assessoria e encerramento)[cite: 3].
  
  RESPONSABILIDADE:
  - Componente de Interface: Gerencia a barra de ações e atalhos do jogador.
  - Dispara requisições via EventBus para:
    1. Venda/Compra de recursos (abre o resourceTradeModal).
    2. Pedido de Assessoria (abre o advisoryModal).
    3. Encerrar a partida (disponível para o Host)[cite: 1, 3].
*/
// ============================================
// PM: The KPI Master - UI Component: Controles
// ============================================
// Estado de botões de ação (atualmente: liberar/bloquear o botão de
// iniciar partida conforme o número de jogadores ativos).
// Fase 5.6 do roadmap.
// ============================================

function checkStartCondition() {
    const state = Game.state;
    if (!state.isHost) return;
    const btnStart = document.getElementById('btnStartGame');
    const hint = document.getElementById('startHint');
    const activeCount = Game.getActivePlayers().length;
    if (activeCount >= CONFIG.JOGO.MIN_PLAYERS) {
        btnStart.disabled = false;
        hint.textContent = `${activeCount} jogadores ativos - pronto!`;
        hint.style.color = '#00ff88';
    } else {
        btnStart.disabled = true;
        hint.textContent = `Mínimo de ${CONFIG.JOGO.MIN_PLAYERS} jogadores ativos`;
        hint.style.color = '#a0a0b0';
    }
}

// ============================================
// EXPORTAÇÃO
// ============================================
window.Game = window.Game || {};
window.Game.ui = window.Game.ui || {};
Object.assign(window.Game.ui, {
    checkStartCondition
});