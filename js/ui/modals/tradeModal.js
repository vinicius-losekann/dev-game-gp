// ============================================
// PM: The KPI Master - UI Modal: Negociação (Venda de Recursos)
// ============================================
// Cobre tanto a oferta (vendedor escolhe comprador) quanto a resposta
// (comprador aceita/recusa).
// Fase 5.11 do roadmap.
// ============================================

let ofertaVendaAtual = null;

function showVendaModal() {
    const state = Game.state;
    const me = Game.getPlayerByName(state.playerName);

    if (!me || me.recursos < 1) {
        alert('⚠️ Você não tem recursos para vender.');
        return;
    }

    const compradores = Game.core.getCompradores();
    if (compradores.length === 0) {
        alert('⚠️ Nenhum jogador disponível para comprar (precisa ter pelo menos ' + CONFIG.KPI.VALOR_VENDA_RECURSO + ' KPI).');
        return;
    }

    document.getElementById('vendaValorKPI').textContent = CONFIG.KPI.VALOR_VENDA_RECURSO + ' KPI';
    document.getElementById('vendaSeusRecursos').textContent =
        'Seus recursos: 📦 ' + me.recursos;

    document.getElementById('vendaCompradores').innerHTML = compradores.map(c => `
        <button class="btn btn-glass" onclick="Game.ui.confirmarVenda('${c.name}')" 
                style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px;">
            <span>${c.name}</span>
            <span style="color:#ffd700; font-size:0.8rem;">⭐${c.kpi} KPI</span>
        </button>
    `).join('');

    document.getElementById('modalVenda').style.display = 'flex';
}

function confirmarVenda(compradorName) {
    if (confirm('Enviar oferta de venda de 1📦 para ' + compradorName + ' por ' + CONFIG.KPI.VALOR_VENDA_RECURSO + ' KPI?')) {
        Game.core.venderRecurso(compradorName);
        document.querySelectorAll('#vendaCompradores button').forEach(b => b.disabled = true);
        const seusRecursosEl = document.getElementById('vendaSeusRecursos');
        if (seusRecursosEl) {
            seusRecursosEl.textContent = '🔄 Aguardando ' + compradorName + ' aceitar a oferta...';
        }
    }
}

function fecharVendaModal() {
    document.getElementById('modalVenda').style.display = 'none';
}

/**
 * Exibe ao comprador a oferta recebida de outro jogador.
 */
function showVendaOfertaModal(msg) {
    ofertaVendaAtual = msg;
    document.getElementById('vendaOfertaTexto').innerHTML =
        `<strong>${msg.vendedorName}</strong> oferece 1📦 por <strong style="color:#ffd700;">${msg.valor} KPI</strong>`;
    document.getElementById('modalVendaOferta').style.display = 'flex';
}

/**
 * Envia a resposta do comprador (aceite/recusa) ao host.
 */
function responderOfertaVenda(aceito) {
    document.getElementById('modalVendaOferta').style.display = 'none';
    if (!ofertaVendaAtual) return;

    const msg = {
        type: 'venda-offer-response',
        vendedorName: ofertaVendaAtual.vendedorName,
        compradorName: ofertaVendaAtual.compradorName,
        aceito: !!aceito
    };

    if (Game.state.isHost) {
        Game.core.handleVendaOfertaResponse(msg);
    } else {
        Game.network.sendToHost(msg);
    }
    ofertaVendaAtual = null;
}

// ============================================
// EXPORTAÇÃO
// ============================================
window.Game = window.Game || {};
window.Game.ui = window.Game.ui || {};
Object.assign(window.Game.ui, {
    showVendaModal,
    confirmarVenda,
    fecharVendaModal,
    showVendaOfertaModal,
    responderOfertaVenda
});