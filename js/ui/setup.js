// ============================================
// PM: The KPI Master - UI: Setup
// ============================================
// Configura todos os listeners da UI. Fase 5.2 do roadmap.
// ============================================

let commonListenersBound = false;
let hostOnlyListenersBound = false;

/**
 * Configura todos os listeners da UI. É chamada uma vez na inicialização
 * e novamente quando um guest se torna host (para ativar controles de host).
 */
function setupUI() {
    const state = Game.state;

    if (state.isHost) {
        document.getElementById('hostControls').style.display = 'block';
        document.getElementById('playerWaiting').style.display = 'none';
        document.getElementById('hostRoomIdSection').style.display = 'block';
        document.getElementById('roomPeerId').textContent = state.peerId;
        document.getElementById('btnEndSession').style.display = 'inline-block';
        document.getElementById('btnEndMatch').style.display = 'block';
        document.getElementById('btnLeaveSession').style.display = 'none';
        document.getElementById('btnLeaveMatch').style.display = 'none';

        if (!state.players.find(p => p.isHost)) {
            state.players.unshift({
                name: state.playerName,
                peerId: state.peerId,
                kpi: 0,
                phase: CONFIG.FASES[0].id,
                activities: 0,
                isHost: true,
                waitingInLobby: false,
                recursos: CONFIG.RECURSOS_INICIAIS
            });
        }
        Game.ui.updatePlayersList();

        if (!hostOnlyListenersBound) {
            document.getElementById('btnStartGame').addEventListener('click', () => {
                Game.state.timer = CONFIG.JOGO.SESSION_DURATION;
                Game.network.broadcastAll({ type: 'game-start', timer: Game.state.timer });
                Game.core.startGame();
            });

            document.getElementById('btnCopyId').addEventListener('click', () => {
                navigator.clipboard.writeText(Game.state.peerId).then(() => {
                    const btn = document.getElementById('btnCopyId');
                    btn.textContent = '✅ Copiado!';
                    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
                }).catch(() => {});
            });

            hostOnlyListenersBound = true;
        }
    } else {
        document.getElementById('hostControls').style.display = 'none';
        document.getElementById('playerWaiting').style.display = 'block';
        document.getElementById('hostRoomIdSection').style.display = 'none';
        document.getElementById('btnEndSession').style.display = 'none';
        document.getElementById('btnEndMatch').style.display = 'none';
        document.getElementById('btnLeaveSession').style.display = 'inline-block';
        document.getElementById('btnLeaveMatch').style.display = 'block';
    }

    if (commonListenersBound) return;

    // Listeners comuns (host e guest)
    document.getElementById('btnEndSession').addEventListener('click', Game.core.endSession);
    document.getElementById('btnEndMatch').addEventListener('click', Game.core.endMatch);
    document.getElementById('btnLeaveSession').addEventListener('click', Game.core.leaveSession);
    document.getElementById('btnLeaveMatch').addEventListener('click', Game.core.leaveMatch);
    document.getElementById('btnExitGameOver').addEventListener('click', () => {
        Game.network.cleanup();
        window.location.href = 'index.html';
    });
    document.getElementById('btnBackToLobby').addEventListener('click', () => {
        Game.state.gameStarted = false;
        Game.state.gameOver = false;
        Game.state.currentRound = null;
        Game.core.resetAllBaralhos();

        Game.ui.showScreen('lobby');
        Game.ui.showLobbyNormal();
        Game.ui.updatePlayersList();
        Game.saveState();
    });
    document.getElementById('btnCloseResult').addEventListener('click', () => {
        document.getElementById('modalResult').style.display = 'none';
    });

    document.getElementById('btnFecharEvento').addEventListener('click', () => {
        document.getElementById('modalEvento').style.display = 'none';
    });

    document.querySelectorAll('.alternative-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            Game.ui.handleAlternativeClick(this.getAttribute('data-alt'), this);
        });
    });

    document.getElementById('btnVenderRecurso').addEventListener('click', () => {
        Game.ui.showVendaModal();
    });

    document.getElementById('btnFecharVenda').addEventListener('click', () => {
        Game.ui.fecharVendaModal();
    });

    document.getElementById('btnAceitarVendaOferta').addEventListener('click', () => {
        Game.ui.responderOfertaVenda(true);
    });

    document.getElementById('btnRecusarVendaOferta').addEventListener('click', () => {
        Game.ui.responderOfertaVenda(false);
    });

    document.getElementById('btnPedirAssessoria').addEventListener('click', () => {
        Game.ui.showAssessoriaSelectModal();
    });

    document.getElementById('btnFecharAssessoriaSelect').addEventListener('click', () => {
        document.getElementById('modalAssessoriaSelect').style.display = 'none';
    });

    document.getElementById('btnRecusarAssessoria').addEventListener('click', () => {
        Game.ui.responderAssessoria(null, true);
    });

    commonListenersBound = true;
}

// ============================================
// EXPORTAÇÃO
// ============================================
window.Game = window.Game || {};
window.Game.ui = window.Game.ui || {};
Object.assign(window.Game.ui, { setupUI });