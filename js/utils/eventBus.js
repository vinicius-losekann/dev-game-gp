// ============================================
// PM: The KPI Master - Event Bus
// ============================================
// Pub/Sub central para comunicação entre módulos.
// Fase 0 do roadmap: primeiro passo para desacoplar
// game-core / game-ui / game-network via eventos,
// em vez de chamadas diretas entre eles.
//
// Uso:
//   Game.bus.on('player:answered', (payload) => { ... });
//   Game.bus.emit('player:answered', { playerId, correct });
// ============================================

class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Registra um listener para um evento.
     * @returns {Function} função para cancelar a inscrição (unsubscribe)
     */
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
        return () => this.off(event, callback);
    }

    /**
     * Remove um listener específico de um evento.
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    /**
     * Dispara um evento, chamando todos os listeners inscritos.
     * Erros em um listener não interrompem os demais.
     */
    emit(event, payload) {
        if (!this.listeners[event]) return;
        this.listeners[event].slice().forEach(cb => {
            try {
                cb(payload);
            } catch (err) {
                console.error(`[EventBus] Erro no listener de "${event}":`, err);
            }
        });
    }

    /**
     * Registra um listener que executa apenas uma vez.
     */
    once(event, callback) {
        const wrapper = (payload) => {
            this.off(event, wrapper);
            callback(payload);
        };
        this.on(event, wrapper);
    }
}

// Instância única e global — outros scripts (main.js, game-core.js, etc.)
// vão pendurar essa referência em Game.bus.
window.bus = window.bus || new EventBus();