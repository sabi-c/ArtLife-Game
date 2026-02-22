export class WebAudioService {
    static ctx = null;
    static initialized = false;

    static init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
        } catch (e) {
            console.warn('[WebAudioService] Web Audio API not supported', e);
        }
    }

    /** Ensure context is running (browsers suspend it until user interaction) */
    static async resume() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    static playTone(type, freq, duration, vol = 0.1, freqSlide = 0) {
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        // Attack-Decay envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.frequency.setValueAtTime(freq, now);
        if (freqSlide !== 0) {
            osc.frequency.exponentialRampToValueAtTime(freq + freqSlide, now + duration);
        }

        osc.start(now);
        osc.stop(now + duration);

        // Cleanup
        setTimeout(() => {
            gain.disconnect();
        }, duration * 1000 + 100);
    }

    // ── Pre-configured Sound Effects ──

    static type() {
        // Very fast, quiet, high-pitched click for typewriter text
        // Varies slightly in pitch for texture
        const f = 800 + Math.random() * 400;
        this.playTone('sine', f, 0.03, 0.05);
    }

    static hover() {
        // Subtle interface blip
        this.playTone('square', 300, 0.05, 0.03);
    }

    static select() {
        // Confirm/Select rising tone
        this.playTone('square', 440, 0.15, 0.05, 150);
        setTimeout(() => this.playTone('square', 550, 0.2, 0.05, 200), 100);
    }

    static error() {
        // Dissonant low buzz
        this.playTone('sawtooth', 150, 0.3, 0.08, -50);
        this.playTone('sawtooth', 140, 0.3, 0.08, -50);
    }

    static success() {
        // Pleasant chime chord
        this.playTone('sine', 523.25, 0.4, 0.05); // C5
        this.playTone('sine', 659.25, 0.4, 0.05); // E5
        this.playTone('sine', 783.99, 0.5, 0.05, 100); // G5 rising
    }

    // ── Haggle Battle Sound Effects ──

    static tactic() {
        // Rising synth blip — tactic selected
        this.playTone('square', 350, 0.08, 0.06, 200);
        setTimeout(() => this.playTone('square', 500, 0.1, 0.05, 100), 60);
    }

    static hit() {
        // Punchy impact — tactic succeeded
        this.playTone('square', 600, 0.08, 0.08);
        setTimeout(() => this.playTone('sine', 800, 0.15, 0.06, 200), 50);
    }

    static miss() {
        // Descending sad tone — tactic failed
        this.playTone('triangle', 400, 0.2, 0.06, -150);
    }

    static penalty() {
        // Low rumble — patience lost or stat penalty
        this.playTone('sawtooth', 120, 0.25, 0.06, -30);
    }

    static dealSuccess() {
        // Triumphant 4-note fanfare — deal closed
        this.playTone('square', 440, 0.15, 0.06);
        setTimeout(() => this.playTone('square', 554, 0.15, 0.06), 120);
        setTimeout(() => this.playTone('square', 659, 0.15, 0.06), 240);
        setTimeout(() => this.playTone('sine', 880, 0.4, 0.07, 100), 360);
    }

    static dealFail() {
        // Descending minor — deal failed
        this.playTone('triangle', 440, 0.2, 0.06);
        setTimeout(() => this.playTone('triangle', 370, 0.2, 0.06), 150);
        setTimeout(() => this.playTone('sawtooth', 300, 0.3, 0.05, -50), 300);
    }

    static superEffective() {
        // Quick ascending sparkle — critical hit
        this.playTone('sine', 700, 0.06, 0.07);
        setTimeout(() => this.playTone('sine', 900, 0.06, 0.07), 50);
        setTimeout(() => this.playTone('sine', 1100, 0.1, 0.06, 200), 100);
    }

    // ── Scene & Notification Sounds ──

    static notify() {
        // Short ping — notification arrived
        this.playTone('sine', 880, 0.1, 0.05);
        setTimeout(() => this.playTone('sine', 1100, 0.15, 0.04), 80);
    }

    static levelUp() {
        // 3-note ascending fanfare — milestone
        this.playTone('square', 523, 0.2, 0.05);
        setTimeout(() => this.playTone('square', 659, 0.2, 0.05), 150);
        setTimeout(() => this.playTone('sine', 784, 0.4, 0.06, 100), 300);
    }

    static sceneEnter() {
        // Soft ascending whoosh — entering a new scene
        this.playTone('sine', 200, 0.15, 0.04, 400);
        setTimeout(() => this.playTone('sine', 400, 0.1, 0.03), 100);
    }

    static sceneExit() {
        // Soft descending — leaving a scene
        this.playTone('sine', 400, 0.12, 0.04, -200);
    }

    static doorEnter() {
        // Two quick taps — entering a building
        this.playTone('triangle', 300, 0.08, 0.05);
        setTimeout(() => this.playTone('triangle', 450, 0.12, 0.04), 100);
    }

    static itemPickup() {
        // Quick sparkle — found an item
        this.playTone('sine', 600, 0.08, 0.06);
        setTimeout(() => this.playTone('sine', 800, 0.08, 0.05), 60);
        setTimeout(() => this.playTone('sine', 1000, 0.12, 0.04), 120);
    }
}
