// ============================================
// PM: The KPI Master - UI Modal: Resultado
// ============================================
// Modal de resultado (acertou/errou) e do bônus de assessoria.
// Fase 5.9 do roadmap.
// ============================================

function showResultModal(acertou, kpiGanho, recursosRestantes) {
    const modal = document.getElementById('modalResult');
    document.getElementById('resultTitle').textContent = acertou ? '✅ Acertou!' : '❌ Errou!';
    document.getElementById('resultTitle').className = 'result-title ' + (acertou ? 'result-success' : 'result-error');
    let msg = acertou ? `+${kpiGanho} KPI` : '0 KPI';
    if (recursosRestantes !== undefined) msg += ` | 📦 ${recursosRestantes} recursos`;
    document.getElementById('resultMessage').textContent = msg;
    modal.style.display = 'flex';
}

function showAssessoriaBonusModal(bonus) {
    document.getElementById('resultTitle').textContent = '🧭 Assessoria!';
    document.getElementById('resultTitle').className = 'result-title result-success';
    document.getElementById('resultMessage').textContent = `+${bonus} KPI (sugestão correta)`;
    document.getElementById('modalResult').style.display = 'flex';
}

// ============================================
// EXPORTAÇÃO
// ============================================
window.Game = window.Game || {};
window.Game.ui = window.Game.ui || {};
Object.assign(window.Game.ui, {
    showResultModal,
    showAssessoriaBonusModal
});