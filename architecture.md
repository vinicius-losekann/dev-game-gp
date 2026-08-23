# 🗺️ Arquitetura — PM: The KPI Master

## Estrutura de arquivos

```
pm-the-kpi-master/
│
├── index.html
├── game.html
├── css/
│   └── style.css
│
├── data/
│   ├── questions.pt-BR.json     # ✅ criado (Fase 7) — perguntas, separadas de eventos
│   ├── questions.en-US.json     # ⏳ não criado (conteúdo, não string de UI)
│   └── events.json              # ✅ criado (Fase 7) — separado de questions
│
└── js/
    │
    ├── main.js                  # entrypoint de game.html (orquestra init)
    │
    ├── entry/
    │   └── roomEntry.js         # ex js/index.js — criar/entrar em sala
    │
    ├── config/
    │   └── constants.js         # ex config/game-config.js
    │
    ├── domain/                  # 🧠 regras puras — sem DOM, sem rede, sem i18n
    │   ├── kpiRules.js          # calcularResultadoResposta(...)
    │   ├── eventRules.js        # sortearEvento(...), aplicarEfeitosEvento(...)
    │   ├── deckRules.js         # sortearPergunta(...), resetBaralho(...)
    │   ├── tradeRules.js        # validarVenda(...)
    │   ├── advisoryRules.js     # validarPedidoAssessoria(...), calcularBonusAssessor(...)
    │   └── rankingRules.js      # buildRanking(...)
    │
    ├── state/
    │   ├── store.js             # fonte única da verdade (Game.state)
    │   ├── selectors.js         # leitura: getPlayerByName, getActivePlayers...
    │   └── mutations.js         # escrita: resetAllPlayers, resetGameState...
    │
    ├── engine/                  # 🎬 orquestração — chama domain, mexe em state, network, ui
    │   ├── sessionEngine.js     # startGame, endGame, endMatch, endSession, leaveMatch...
    │   ├── turnEngine.js        # startNewRound, pickNewPair, nextTurn
    │   ├── answerEngine.js      # handleAnswer, updatePlayerKPI
    │   ├── tradeEngine.js       # venderRecurso, processVenda
    │   └── advisoryEngine.js    # requestAssessoria, handleAssessoriaAnswer
    │
    ├── network/
    │   ├── connectionState.js   # 🆕 estado compartilhado (myPeer, connections) — ver nota
    │   ├── peerService.js       # PeerJS puro: initPeer, connect, send, cleanup
    │   ├── messageHandler.js    # roteamento de mensagens (switch/case)
    │   └── hostMigration.js     # becomeHost, reconexão, handleHostDisconnect
    │
    ├── ui/
    │   ├── screenManager.js     # showScreen, closeAllModals, status de conexão
    │   ├── setup.js             # setupUI — bind de todos os listeners
    │   ├── components/
    │   │   ├── lobbyComponent.js
    │   │   ├── questionComponent.js
    │   │   ├── profileComponent.js    # card do jogador (KPI, fase, progresso)
    │   │   ├── controlsComponent.js   # ⚠️ hoje bem magro — ver NOTA-001
    │   │   ├── timerComponent.js
    │   │   └── rankingComponent.js
    │   └── modals/
    │       ├── resultModal.js
    │       ├── eventModal.js
    │       ├── tradeModal.js          # oferta + resposta de venda
    │       └── advisoryModal.js       # seleção + pergunta + resultado
    │
    ├── locales/
    │   ├── pt-BR.js              # ✅ criado (Fase 6) — ver NOTA-003
    │   ├── en-US.js               # ⏳ não criado ainda
    │   └── es-ES.js                # ⏳ não criado ainda
    │
    ├── dev/
    │   └── debugTools.js        # ✅ criado (Fase 7) — ex game-debug.js, REGRESSÃO-002 corrigida
    │
    └── utils/
        ├── eventBus.js           # ⚠️ criado na Fase 0, sem uso real ainda — ver NOTA-002
        ├── logger.js              # ✅ criado (Fase 7) — infra pronta, não religado — NOTA-004
        ├── persistence.js         # ✅ criado (Fase 7) — extraído de main.js, já em uso
        └── i18n.js                # ✅ criado (Fase 6) — ver NOTA-003
```

---

## Status da migração

| Fase | Status | Resultado |
|---|---|---|
| 0 — Preparação | ✅ Completa | `utils/eventBus.js`, `entry/roomEntry.js`, `main.js` |
| 1 — Regras Puras | ✅ Completa | `domain/*.js` (6 arquivos) |
| 2 — Estado Centralizado | ✅ Completa | `state/store.js`, `selectors.js`, `mutations.js` |
| 3 — Orquestração | ✅ Completa | `engine/*.js` (5 arquivos), `game-core.js` removido. **BUG-001** corrigido |
| 4 — Rede | ✅ Completa | `network/*.js` (4 arquivos), `game-network.js` removido. **BUG-002** corrigido |
| 5 — Interface | ✅ Completa | `ui/*.js` (12 arquivos), `game-ui.js` removido. **BUG-003** corrigido, **REGRESSÃO-001** encontrada e corrigida |
| 6 — Internacionalização | 🟡 Parcial | `utils/i18n.js` + `locales/pt-BR.js` criados (infraestrutura funcional). UI ainda não religada — ver **NOTA-003** |
| 7 — Infraestrutura e Limpeza | 🟡 Parcial | `utils/logger.js` (infra, não religado — **NOTA-004**), `utils/persistence.js` (religado e em uso), `dev/debugTools.js` migrado (**REGRESSÃO-002** corrigida), `data/` separado em `questions.pt-BR.json` + `events.json`. Falta apenas apagar os arquivos antigos do projeto — ver checklist abaixo |

Bugs corrigidos ao longo da migração estão detalhados em `ISSUES.md`.

---

## Notas de arquitetura pendentes (não são bugs — decisões registradas para decidir depois)

### NOTA-001 — `controlsComponent.js` ficou mais magro que o esperado (Fase 5)

Hoje só tem `checkStartCondition()` (habilita o botão "Iniciar Partida"). Os botões de vender/assessoria/sair/encerrar continuam com listener registrado em `ui/setup.js`, chamando `Game.ui.showXModal()` / `Game.core.X()` direto — não passam por `controlsComponent.js` nem pelo `EventBus`.

Decisão tomada: deixar como está por ora. Opções para quando revisitarmos:
- **(a)** Só mover os listeners de `setup.js` para `controlsComponent.js` (puramente estrutural, mesma chamada direta)
- **(b)** Fazer (a) e também rotear essas ações pelo `EventBus` (`Game.bus.emit`/`on`) — seria o primeiro uso real do bus

### NOTA-002 — `eventBus.js` existe desde a Fase 0 mas nunca foi usado de fato

Nenhum arquivo chama `Game.bus.emit()`/`on()` até agora. Toda comunicação entre módulos é via chamada direta (`Game.ui.X()`, `Game.core.X()`, `Game.network.X()`). Ligado à NOTA-001: se decidirmos rotear ações pelo bus, esse seria o primeiro caso de uso real.

### NOTA-003 — i18n: infraestrutura pronta, UI ainda não religada (Fase 6)

`utils/i18n.js` e `locales/pt-BR.js` existem e funcionam de forma isolada (`Game.i18n.t('chave')` já funciona se chamado), mas os 12 arquivos de `ui/*.js` continuam com strings em português direto no código. O dicionário `pt-BR.js` foi escrito espelhando essas strings atuais, então a troca é mecânica — mas ainda precisa ser feita, arquivo por arquivo. Falta também criar `en-US.js` e `es-ES.js`.

Quando decidirmos religar:
1. Trocar cada string fixa em `ui/*.js` por `Game.i18n.t('...')`
2. Criar `en-US.js` e `es-ES.js` com as mesmas chaves de `pt-BR.js`
3. Adicionar um seletor de idioma na UI que chama `Game.i18n.setLocale()`
4. Testar troca de idioma em tempo real (critério do checklist final do roadmap)

### NOTA-004 — logger: infraestrutura pronta, resto do código ainda não religado (Fase 7)

`utils/logger.js` existe e funciona isoladamente (`Game.logger.info(...)`, `Game.logger.warn(...)` etc. já funcionam se chamados), mas **nenhum arquivo do projeto foi religado** para usar `Game.logger.*` no lugar de `console.log`/`console.warn`/`console.error` diretos — e são centenas de ocorrências espalhadas por `domain/`, `engine/`, `network/` e `ui/`.

Mesmo padrão da NOTA-003 (i18n): infraestrutura funcional, wiring pendente. Diferente do i18n, aqui não há "chave" para trocar — é substituição direta de `console.X(...)` por `Game.logger.X(...)`, então o trabalho é mecânico mas espalhado por praticamente todo arquivo `.js` do projeto. Fica para decidir depois se vale a pena.

### `connectionState.js` — por que existe (Fase 4)

Não estava no roadmap original. `game-network.js` tinha `myPeer` e `connections` como variáveis privadas do módulo. Ao dividir em `peerService.js` / `messageHandler.js` / `hostMigration.js`, os três precisam enxergar a mesma conexão — por isso esse estado passou a ser compartilhado via getters/setters em `connectionState.js`.

---

## Checklist de limpeza final (Fase 7)

Depois de confirmar que tudo funciona com os arquivos novos, estes podem ser apagados do projeto — nenhum é mais referenciado por `game.html`/`index.html`:

- [ ] `js/game-main.js` (substituído por `js/main.js` desde a Fase 0)
- [ ] `js/game-core.js` (substituído por `domain/*.js` + `engine/*.js` desde a Fase 3)
- [ ] `js/game-network.js` (substituído por `network/*.js` desde a Fase 4)
- [ ] `js/game-ui.js` (substituído por `ui/*.js` desde a Fase 5)
- [ ] `js/game-debug.js` (substituído por `js/dev/debugTools.js` nesta fase)
- [ ] `js/game-state.js` (substituído por `state/*.js` desde a Fase 2)
- [ ] `js/index.js` (substituído por `js/entry/roomEntry.js` desde a Fase 0)
- [ ] `js/game-config.js` (duplicado de `config/game-config.js`, nunca foi carregado por nenhum `.html` — pode simplesmente apagar, nada usa)
- [ ] `data/questions.json` (substituído por `data/questions.pt-BR.json` + `data/events.json` nesta fase)

**Não apagar:** `config/game-config.js` (ainda é o arquivo de configuração ativo — a extração para `js/config/constants.js` nunca chegou a ser feita, não estava numa fase específica do roadmap original; ver observação abaixo).

### Observação: `config/game-config.js` → `js/config/constants.js` nunca foi feito

O roadmap original lista essa migração na tabela-resumo, mas nenhuma das Fases 0–7 detalhadas a atribui explicitamente. Ficou de fora da migração até aqui. Se quiser fazer essa extração, é um bom próximo passo depois de fechar o checklist acima — mas não bloqueia nada, o jogo funciona normalmente com `config/game-config.js` no lugar onde sempre esteve.