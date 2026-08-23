// ============================================
// PM: The KPI Master - Engine: Rodada (Turnos)
// ============================================
// Orquestra o ciclo de rodada: sorteio de evento, escolha do par
// Perguntador/Respondedor, sorteio de pergunta e avanço de turno.
// Usa as regras puras de js/domain/*.js — não contém regra de
// negócio, só coordenação entre domain, state, network e ui.
// Fase 3.2 do roadmap.
// ============================================

/**
 * Inicia uma nova rodada: sorteia um evento, aplica seus efeitos e
 * escolhe um par Perguntador/Respondedor.
 */
function startNewRound() {
    const state = Game.state;
    const evento = Game.domain.event.sortearEvento(state.questionsData?.eventos || []);
    if (!evento) {
        console.error('❌ Nenhum evento disponível!');
        return;
    }

    const ativos = Game.getActivePlayers();
    const logs = Game.domain.event.aplicarEfeitosEvento(evento, ativos);
    logs.forEach(msg => console.log(msg));

    Game.ui.updatePlayersOnlineList();
    Game.ui.updateRankingList();

    const me = Game.getPlayerByName(state.playerName);
    if (me) {
        document.getElementById('myRecursos').textContent = me.recursos;
        document.getElementById('myKPI').textContent = me.kpi;
    }

    pickNewPair(evento);
}

/**
 * Escolhe aleatoriamente um Perguntador e um Respondedor entre os
 * jogadores ativos, respeitando o rodízio e a disponibilidade de recursos.
 * @param {object} evento – o evento da rodada (pode ser reutilizado em chamadas recursivas)
 * @param {number} depth – profundidade da recursão (previne loops infinitos)
 */
function pickNewPair(evento = null, depth = 0) {
    const state = Game.state;

    if (depth > CONFIG.JOGO.MAX_PLAYERS * 2) {
        console.error('❌ Nenhum jogador com recursos disponíveis. Encerrando partida.');
        Game.engine.session.endGame(Game.engine.session.buildRanking());
        return;
    }

    // Se não foi passado um evento, sorteia um novo
    const eventoJaExibidoNestaRodada = depth > 0;
    if (!evento) {
        evento = Game.domain.event.sortearEvento(state.questionsData?.eventos || []);
        if (!evento) return;

        const ativos = Game.getActivePlayers();
        const logs = Game.domain.event.aplicarEfeitosEvento(evento, ativos);
        logs.forEach(msg => console.log(msg));

        Game.ui.updatePlayersOnlineList();
        Game.ui.updateRankingList();
        const me = Game.getPlayerByName(state.playerName);
        if (me) {
            document.getElementById('myRecursos').textContent = me.recursos;
            document.getElementById('myKPI').textContent = me.kpi;
        }
    }

    // Mostra o modal do evento apenas na primeira vez que ele é exibido
    if (!eventoJaExibidoNestaRodada) {
        Game.network.broadcastAll({ type: 'show-evento', evento: evento, players: state.players });
        Game.ui.showEventoModal(evento);
    }

    const activePlayers = Game.getActivePlayers();
    if (activePlayers.length < CONFIG.JOGO.MIN_PLAYERS) {
        console.warn('⚠️ Jogadores ativos insuficientes para continuar a partida.');
        Game.engine.session.endGame(Game.engine.session.buildRanking());
        return;
    }

    // Filtra Respondedores com recursos (exceto se o evento for "Reserva de Contingência")
    const semCustoNestaRodada = evento?.reserva_contingencia === true;
    const comRecursos = semCustoNestaRodada
        ? activePlayers
        : activePlayers.filter(p => p.recursos > 0);

    // Jogadores sem recursos pulam a vez (marcados como já usados nesta rodada)
    if (!semCustoNestaRodada) {
        activePlayers
            .filter(p => p.recursos <= 0 && !state.usedRespondedorThisRound.includes(p.name))
            .forEach(p => {
                console.log('⏭️ ' + p.name + ' sem recursos — pulando a vez neste ciclo.');
                state.usedRespondedorThisRound.push(p.name);
            });
    }

    if (comRecursos.length === 0) {
        console.warn('⚠️ Nenhum jogador ativo tem recursos. Encerrando partida.');
        Game.engine.session.endGame(Game.engine.session.buildRanking());
        return;
    }

    // Seleciona um Respondedor que ainda não tenha respondido nesta rodada
    const available = comRecursos.filter(p =>
        !state.usedRespondedorThisRound.includes(p.name)
    );
    if (available.length === 0) {
        state.usedRespondedorThisRound = [];
        return pickNewPair(evento, depth + 1);
    }

    const respondedor = available[Math.floor(Math.random() * available.length)];
    const askers = activePlayers.filter(p => p.peerId !== respondedor.peerId);
    if (askers.length === 0) return;

    const perguntador = askers[Math.floor(Math.random() * askers.length)];
    const pergunta = Game.domain.deck.sortearPergunta(state.baralhos, state.questionsData, respondedor.phase);

    if (!pergunta) {
        console.error('❌ Sem pergunta disponível!');
        return;
    }

    state.currentRound = {
        evento,
        perguntador: perguntador.name,
        respondedor: respondedor.name,
        pergunta,
        respondeu: false
    };

    console.log('🎯 Nova dupla:', perguntador.name, 'pergunta para', respondedor.name);
    console.log('📋 Evento:', evento.titulo);

    Game.network.broadcastAll({
        type: 'round-start',
        evento,
        perguntador: perguntador.name,
        respondedor: respondedor.name
    });

    const areaNome = state.questionsData.areas[pergunta.area_key]?.nome || pergunta.area_key;
    const grupoNome = Game.getFaseById(respondedor.phase).nome;

    const perguntaData = {
        type: 'question',
        pergunta: pergunta.pergunta,
        area: areaNome,
        grupo: grupoNome,
        alternativas: pergunta.alternativas,
        correta: pergunta.correta,
        id: pergunta.id
    };

    // Envia a pergunta (com gabarito) para o Perguntador
    Game.network.sendToPlayer(perguntador.peerId, { ...perguntaData, isPerguntador: true });

    // Envia a pergunta (sem gabarito) para o Respondedor
    Game.network.sendToPlayer(respondedor.peerId, { ...perguntaData, isRespondedor: true, correta: undefined });

    // Espectadores veem a tela de espera
    if (state.playerName !== perguntador.name && state.playerName !== respondedor.name) {
        Game.ui.displaySpectatorView(perguntador.name, respondedor.name);
    }

    Game.ui.displayRoundStart();

    // Timeout de segurança para o Respondedor
    armarRespostaTimeout(respondedor.name);

    Game.saveState();
}

/**
 * Arma um timeout para evitar que a rodada fique travada se o Respondedor
 * não responder (desconexão, travamento, etc.).
 */
function armarRespostaTimeout(respondedorName) {
    const state = Game.state;
    if (state.respostaTimeout) {
        clearTimeout(state.respostaTimeout);
        state.respostaTimeout = null;
    }
    state.respostaTimeout = setTimeout(() => {
        console.warn('⌛ Timeout: ' + respondedorName + ' não respondeu a tempo. Pulando vez automaticamente.');
        Game.engine.answer.handleAnswer({ alternativa: null, playerName: respondedorName, timeout: true });
    }, CONFIG.JOGO.RESPOSTA_TIMEOUT);
}

/**
 * Avança para a próxima rodada ou, se todos já responderam, inicia uma nova rodada.
 */
function nextTurn() {
    const state = Game.state;
    const activePlayers = Game.getActivePlayers();
    const allDone = activePlayers.every(p => state.usedRespondedorThisRound.includes(p.name));

    if (allDone) {
        state.usedRespondedorThisRound = [];
        startNewRound();
    } else {
        pickNewPair();
    }
}

// ============================================
// EXPORTAÇÃO
// ============================================
window.Game = window.Game || {};
window.Game.engine = window.Game.engine || {};
window.Game.engine.turn = {
    startNewRound,
    pickNewPair,
    armarRespostaTimeout,
    nextTurn
};

// Compatibilidade: Game.core.* continua funcionando enquanto game-ui.js e
// game-network.js não migram para chamar Game.engine.turn diretamente.
window.Game.core = window.Game.core || {};
Object.assign(window.Game.core, window.Game.engine.turn);