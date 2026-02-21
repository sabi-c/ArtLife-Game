/**
 * StateMachine.js — Lightweight finite state machine with queued transitions.
 * Pattern from monster-tamer reference implementation.
 *
 * Usage:
 *   const sm = new StateMachine('haggle', this);
 *   sm.addState('idle', { onEnter() {...}, onUpdate() {...}, onExit() {...} })
 *     .addState('negotiating', { ... });
 *   sm.setState('idle');
 *   // In scene update():
 *   sm.update();
 */
export class StateMachine {
    /**
     * @param {string} id       - Human-readable identifier for debug messages.
     * @param {object} [context] - `this` context for state callbacks. Defaults to the SM itself.
     */
    constructor(id, context) {
        this.id = id;
        this.context = context ?? this;
        this._states = new Map();
        this._currentState = null;
        this._queue = [];
    }

    /**
     * Register a state.
     * @param {string} name
     * @param {{ onEnter?: Function, onUpdate?: Function, onExit?: Function }} [config]
     * @returns {this}  — chainable
     */
    addState(name, config = {}) {
        this._states.set(name, { name, ...config });
        return this;
    }

    /**
     * Queue a transition to the named state.
     * The transition is processed at the start of the next update() call.
     * @param {string} name
     * @returns {this}
     */
    setState(name) {
        if (!this._states.has(name)) {
            console.warn(`[StateMachine:${this.id}] Unknown state: "${name}"`);
            return this;
        }
        this._queue.push(name);
        return this;
    }

    /**
     * Call once per frame from the scene's update() method.
     */
    update() {
        if (this._queue.length > 0) {
            const next = this._queue.shift();
            this._transition(next);
        }
        if (this._currentState?.onUpdate) {
            this._currentState.onUpdate.call(this.context);
        }
    }

    /** @private */
    _transition(name) {
        if (this._currentState?.onExit) {
            this._currentState.onExit.call(this.context);
        }
        this._currentState = this._states.get(name);
        if (this._currentState?.onEnter) {
            this._currentState.onEnter.call(this.context);
        }
    }

    /** @returns {boolean} */
    isCurrentState(name) {
        return this._currentState?.name === name;
    }

    /** @returns {string|null} */
    getCurrentStateName() {
        return this._currentState?.name ?? null;
    }

    /** Reset to no-state (useful on scene restart). */
    reset() {
        this._currentState = null;
        this._queue = [];
    }
}
