// ============================================
// PM: The KPI Master - Domain: Baralho de Perguntas
// ============================================
// Regras PURAS de sorteio e controle do baralho de perguntas.
// Não acessa Game.state, network ou DOM diretamente — recebe tudo
// por parâmetro e retorna/mutação apenas dos objetos passados.
// Fase 1.3 do roadmap.
// ============================================

/**
 * Sorteia uma pergunta não utilizada de uma área compatível com a fase
 * (grupoProcesso) informada. Se todas as perguntas de uma área elegível
 * estiverem usadas, reinicia o(s) baralho(s) dessa(s) área(s) antes de sortear.
 *
 * @param {object} baralhos - Game.state.baralhos (mutado in-place)
 * @param {object} questionsData - Game.state.questionsData
 * @param {string} grupoProcesso - fase/grupo do Respondedor
 * @returns {object|null} pergunta sorteada (com area_key) ou null se não houver nenhuma
 */
function sortearPergunta(baralhos, questionsData, grupoProcesso) {
    let areasDisponiveis = [];

    for (const [key, area] of Object.entries(questionsData?.areas || {})) {
        if (area.grupos.includes(grupoProcesso) && baralhos[key]?.disponiveis > 0) {
            areasDisponiveis.push(key);
        }
    }

    if (areasDisponiveis.length === 0) {
        for (const [key, area] of Object.entries(questionsData?.areas || {})) {
            if (area.grupos.includes(grupoProcesso)) {
                resetBaralho(baralhos, key);
                areasDisponiveis.push(key);
            }
        }
    }

    if (areasDisponiveis.length === 0) return null;

    const areaSorteada = areasDisponiveis[Math.floor(Math.random() * areasDisponiveis.length)];
    const baralho = baralhos[areaSorteada];
    if (!baralho || baralho.disponiveis <= 0) return null;

    const disponiveis = baralho.perguntas.filter(p => !p.usada);
    if (disponiveis.length === 0) return null;

    const pergunta = disponiveis[Math.floor(Math.random() * disponiveis.length)];
    pergunta.usada = true;
    baralho.disponiveis--;

    return { ...pergunta, area_key: areaSorteada };
}

/**
 * Reinicia o baralho de uma área, marcando todas as perguntas como não usadas.
 */
function resetBaralho(baralhos, areaKey) {
    const baralho = baralhos[areaKey];
    if (baralho) {
        baralho.perguntas.forEach(p => p.usada = false);
        baralho.disponiveis = baralho.total;
    }
}

/**
 * Reinicia todos os baralhos (usado ao iniciar uma nova partida).
 */
function resetAllBaralhos(baralhos) {
    Object.keys(baralhos).forEach(key => resetBaralho(baralhos, key));
}

// ============================================
// EXPORTAÇÃO
// ============================================
window.Game = window.Game || {};
window.Game.domain = window.Game.domain || {};
window.Game.domain.deck = {
    sortearPergunta,
    resetBaralho,
    resetAllBaralhos
};