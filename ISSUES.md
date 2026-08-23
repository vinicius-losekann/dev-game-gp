# 🐛 Issues Conhecidas — Migração de Arquitetura

Registro de bugs identificados durante a migração que **não são corrigidos
imediatamente** para não misturar "mover código" com "mudar comportamento".
Cada issue tem uma fase prevista de correção.

---

## BUG-001: Pergunta trocada ao dar F5 no host durante rodada ativa

- **Status:** ✅ Corrigido na Fase 3 (engine/turnEngine.js + js/main.js)
- **Detectado em:** Fase 0 (teste manual de restauração de estado)
- **Local:** `js/main.js` → `resumeGameEngineIfHost()`
- **Sintoma:**
  - Ao recarregar (F5) a página do **host** durante uma partida em andamento,
    a pergunta/rodada atual é substituída por uma nova, em vez de manter a
    rodada que estava em curso.
  - Possível efeito colateral no lado do **guest** (parece mudar de sessão) —
    ainda não confirmado, depende da análise de `game-network.js` (Fase 4).
- **Causa raiz:**
  ```js
  if (!state.currentRound) {
      Game.core.pickNewPair();
  } else {
      state.currentRound = null;
      Game.core.pickNewPair();   // ⚠️ os dois ramos sempre chamam pickNewPair()
  }
  ```
  O `if/else` não tem efeito prático: os dois caminhos sempre sorteiam um
  novo par (Perguntador/Respondedor) e uma nova pergunta, mesmo quando já
  existia uma rodada em curso que deveria ser preservada.
- **Correção aplicada:** em `js/main.js` → `resumeGameEngineIfHost()`, o ramo
  `else` (quando já existe `state.currentRound`) agora **reexibe a rodada
  existente** em vez de descartá-la e sortear uma nova:
  ```js
  } else {
      Game.ui.displayRoundStart();
      if (state.currentRound.pergunta) {
          Game.ui.displayQuestion(state.currentRound.pergunta);
      }
      Game.core.armarRespostaTimeout(state.currentRound.respondedor);
  }
  ```
  Esse é exatamente o padrão que já funcionava corretamente em
  `becomeHost()` (`js/game-network.js`), usado como referência.
- **Ainda a confirmar:** o efeito colateral relatado no lado do guest
  ("parece mudar de sessão") — deve ser reavaliado em teste manual agora
  que a causa raiz do lado do host foi corrigida. Se persistir após os
  testes desta fase, abrir uma nova issue com os detalhes.
- **Confirmado como pré-existente:** sim — diff entre `game-main.js` (original)
  e `js/main.js` (migrado na Fase 0) mostra que a única mudança foi a injeção
  de `Game.bus`; a função `resumeGameEngineIfHost()` é idêntica.

---

## BUG-002: Guest vira host indevidamente após F5 no host

- **Status:** ✅ Corrigido na Fase 4 (`js/network/hostMigration.js`)
- **Detectado em:** Fase 3 (teste manual de F5 no host, após corrigir o BUG-001)
- **Local:** `js/game-network.js` → `handleHostDisconnect()` / `attemptReconnectToNewHost()`
- **Sintoma:**
  - Após dar F5 no host, o host volta e mostra a mesma rodada corretamente
    (BUG-001 corrigido), mas **o guest não recebe mais atualizações** (ex:
    quando o host responde uma pergunta, o guest não vê o resultado).
  - Depois de um tempo, **o guest (backup) assume como novo host**, mesmo
    o host original continuando ativo e funcional.
- **Causa raiz:**
  1. No F5, `initPeer()` cria uma **nova instância** de `Peer`, mas reaproveita
     o **mesmo `hostPeerId`** (reload simples não é migração de host).
  2. A `DataConnection` que o guest tinha com a instância *antiga* do `Peer`
     do host morre (o objeto antigo foi destruído).
  3. O guest recebe o fechamento da conexão e chama `handleHostDisconnect()`,
     que **sempre assume migração de host** — tenta reconectar em
     `computeHostPeerId(baseRoomPeerId, hostVersion + 1)`, um ID com a
     versão incrementada (ex: `sala-h1`).
  4. Só que o host não mudou de versão no F5 — continua no ID original.
     O guest fica tentando um ID que não existe, esgota as tentativas em
     `attemptReconnectToNewHost()` e, se for o backup, **assume como novo
     host de verdade** via `becomeHost()`.
  - Em resumo: falta um caminho de **"tentar reconectar no mesmo host de
    sempre"** antes de presumir que houve migração de host.
- **Correção aplicada:** adicionada a função `attemptReconnectToSameHost()`,
  chamada **antes** de qualquer lógica de migração. Ela tenta reconectar ao
  host na **versão atual** (mesmo ID) por até 3 tentativas. Só se todas
  falharem é que o fluxo cai em `decideHostTakeoverOrReconnectNewVersion()`
  (a lógica original de decidir se este jogador vira host ou procura uma
  versão incrementada do ID).
  ```
  handleHostDisconnect()
    └─▶ attemptReconnectToSameHost()          [NOVO — tenta o host de sempre]
          └─▶ (falhou 3x) retryReconnectSameHostOrMigrate()
                └─▶ decideHostTakeoverOrReconnectNewVersion()  [fluxo original]
                      ├─▶ becomeHost()                    (se for o backup)
                      └─▶ attemptReconnectToNewHost()      (senão)
  ```
- **Validado em:** teste manual de F5 no host com 1 guest conectado — a
  descrever pelo usuário no teste desta fase.
- **Confirmado como pré-existente:** sim — `game-network.js` está idêntico
  ao arquivo original enviado; nenhuma mudança da migração o afetou até agora.

---

## BUG-003: Card de perfil do host não reflete o progresso real após F5

- **Status:** ✅ Corrigido na Fase 5 (`ui/components/profileComponent.js`)
- **Detectado em:** Fase 4 (teste manual de F5 no host, após corrigir BUG-001 e BUG-002)
- **Local:** `js/main.js` → `resumeGameEngineIfHost()`
- **Sintoma:**
  - Depois do F5 no host durante uma partida em andamento, a rodada é
    restaurada corretamente (BUG-001) e o guest permanece conectado
    (BUG-002), mas o **card de perfil do próprio host** (KPI, fase e
    atividades) volta exibindo valores desatualizados — ex: atividades
    mostrando `0/2` quando na verdade já estavam em `1/2` antes do reload.
  - Os dados em si **não se perdem** (`Game.state.players` e o objeto `me`
    são restaurados corretamente por `tryRestoreState()`), o problema é
    puramente de **exibição**: os elementos do DOM (`myKPI`, `myPhaseName`,
    `myPhaseIcon`, `myActivity`, `myProgressFill`) nunca são atualizados
    de volta com os valores restaurados.
- **Causa raiz:**
  A lógica de "atualizar o card de perfil na tela" está duplicada em pelo
  menos 3 lugares diferentes do código (cada um atualiza os mesmos 5
  elementos do DOM manualmente):
  - `js/engine/sessionEngine.js` → `startGame()` (zera tudo no início da partida)
  - `js/engine/answerEngine.js` → `updatePlayerKPI()` (atualiza após responder)
  - `js/network/messageHandler.js` → `restoreState()` (atualiza o lado do **guest** após reconectar)
  - `js/main.js` → `resumeGameEngineIfHost()` — **este é o único que NÃO
    atualiza o card**, por isso o bug só aparece do lado do host.
- **Correção aplicada:** criada `Game.ui.renderProfileCard(player)` em
  `ui/components/profileComponent.js`. Os 4 pontos que atualizavam o card
  manualmente agora chamam essa função: `sessionEngine.startGame()`,
  `answerEngine.updatePlayerKPI()`, `messageHandler.restoreState()`
  (guest) e — o que realmente corrige o bug — `main.js` →
  `resumeGameEngineIfHost()` (host), que antes nunca atualizava o card.
- **Confirmado como pré-existente:** provável — a função `resumeGameEngineIfHost()`
  já não atualizava esses elementos antes da nossa migração; não foi algo
  introduzido pelas Fases 0–4.

---

## REGRESSÃO-001 (encontrada e corrigida antes de causar bug visível): `Game.core.resetAllBaralhos` ausente após a Fase 3

- **Status:** ✅ Corrigido na Fase 5, antes de qualquer impacto ao usuário
- **Detectado em:** Fase 5, ao conferir cruzadamente todas as chamadas
  `Game.core.*` de `game-ui.js` contra os exports atuais dos engines
- **Local:** `js/engine/sessionEngine.js`
- **O que aconteceu:** na Fase 3, ao extrair `game-core.js` para os 5
  arquivos de `engine/`, o wrapper `resetAllBaralhos()` (que delega para
  `domain/deckRules.js`) foi **esquecido** — não foi recriado nem exportado
  em nenhum engine. Isso não gerou nenhum erro visível até agora porque
  `game-ui.js` (o único consumidor, no botão "voltar ao lobby" da tela de
  fim de jogo) só foi carregado nesta Fase 5.
- **Correção aplicada:** função `resetAllBaralhos()` recriada em
  `sessionEngine.js` e exportada via `Game.engine.session` / `Game.core`.
  Também usada internamente por `endMatch()` e `handleMatchEnded()` no
  lugar da chamada duplicada a `Game.domain.deck.resetAllBaralhos(...)`.
- **Lição para as próximas fases:** ao final de cada fase, fazer uma
  checagem cruzada entre todas as chamadas `Game.X.*` do arquivo ainda não
  migrado contra os exports do que já foi migrado — é assim que este gap
  foi pego antes de virar um bug real.

---

## REGRESSÃO-002 (encontrada e corrigida antes de causar bug visível): `Game.core.sortearPergunta`/`sortearEvento`/`aplicarEfeitosEvento` ausentes após a Fase 3

- **Status:** ✅ Corrigido na Fase 7, antes de qualquer impacto ao usuário
- **Detectado em:** Fase 7, ao migrar `js/game-debug.js` para `js/dev/debugTools.js`
- **Local:** `js/dev/debugTools.js` (4 ocorrências: `testSortear`, `testKPI`,
  `simularPartidaCompleta` ×2)
- **O que aconteceu:** exatamente o mesmo padrão da REGRESSÃO-001. Na Fase 3,
  ao extrair `game-core.js` para os 5 arquivos de `engine/`, os wrappers
  `sortearPergunta()`, `sortearEvento()` e `aplicarEfeitosEvento()` (que
  delegavam para `domain/deckRules.js` e `domain/eventRules.js`) foram
  **inlinados diretamente em `turnEngine.js`** em vez de recriados como
  `Game.core.X()`. Isso é correto para o próprio `turnEngine.js`, mas
  quebrou silenciosamente qualquer outro consumidor externo desses nomes —
  e `game-debug.js` era o único. Como as ferramentas de debug só foram
  migradas agora (Fase 7), o gap não tinha aparecido antes.
- **Correção aplicada:** as 4 chamadas em `debugTools.js` agora chamam
  `Game.domain.deck.sortearPergunta(baralhos, questionsData, fase)` e
  `Game.domain.event.sortearEvento(eventos)` /
  `Game.domain.event.aplicarEfeitosEvento(evento, jogadores)` diretamente,
  em vez de depender de wrappers em `Game.core` que não existem mais.
- **Lição reforçada:** a checagem cruzada de chamadas `Game.X.*` contra os
  exports atuais (introduzida depois da REGRESSÃO-001) continua valendo a
  pena — encontrou um segundo caso do mesmo tipo de gap.

---

## Como usar este arquivo

- Ao encontrar um bug durante os testes de qualquer fase, adicione uma entrada
  aqui **antes de decidir se corrige na hora ou depois**.
- Sempre registre: status, local no código, sintoma, causa raiz (se souber) e
  fase prevista de correção.
- Ao corrigir, mude o status para `✅ Corrigido` e anote a fase/data em que
  foi resolvido.