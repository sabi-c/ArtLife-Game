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
}
