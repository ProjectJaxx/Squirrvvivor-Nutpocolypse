
// Simple Web Audio API Synth for Retro SFX
// No external assets required!

export const SFX_TYPES = {
    SHOOT: 'SHOOT',
    HIT_ENEMY: 'HIT_ENEMY',
    HIT_PLAYER: 'HIT_PLAYER',
    COLLECT: 'COLLECT',
    LEVEL_UP: 'LEVEL_UP',
    EXPLOSION: 'EXPLOSION',
    UI_CLICK: 'UI_CLICK'
};

class SoundEngine {
    ctx: AudioContext | null = null;
    volume: number = 1.0;

    constructor() {
        const AudioCtor = (window.AudioContext || (window as any).webkitAudioContext);
        if (AudioCtor) {
            this.ctx = new AudioCtor();
        }
    }

    setVolume(vol: number) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    play(type: string) {
        if (!this.ctx || this.volume <= 0) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Master Volume Application
        // SFX are naturally loud, so we scale down a bit by default
        const vol = this.volume * 0.3; 

        switch (type) {
            case SFX_TYPES.SHOOT:
                // Pew Pew: High pitch sliding down rapidly
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
                gain.gain.setValueAtTime(vol, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;

            case SFX_TYPES.HIT_ENEMY:
                // Short noise/crunch (Simulated with low square wave)
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.linearRampToValueAtTime(100, t + 0.05);
                gain.gain.setValueAtTime(vol * 0.8, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.05);
                break;

            case SFX_TYPES.HIT_PLAYER:
                // Oof: Descending low sine
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.linearRampToValueAtTime(50, t + 0.3);
                gain.gain.setValueAtTime(vol, t);
                gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;

            case SFX_TYPES.COLLECT:
                // Ding: High sine ping
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, t);
                osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
                gain.gain.setValueAtTime(vol * 0.6, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                osc.start(t);
                osc.stop(t + 0.15);
                break;

            case SFX_TYPES.EXPLOSION:
                // Boom: Low sawtooth decay
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, t);
                osc.frequency.exponentialRampToValueAtTime(10, t + 0.4);
                gain.gain.setValueAtTime(vol, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc.start(t);
                osc.stop(t + 0.4);
                break;

            case SFX_TYPES.LEVEL_UP:
                // Power up arpeggio
                this.playTone(523.25, t, 0.1, 'square', vol); // C5
                this.playTone(659.25, t + 0.1, 0.1, 'square', vol); // E5
                this.playTone(783.99, t + 0.2, 0.2, 'square', vol); // G5
                this.playTone(1046.50, t + 0.3, 0.4, 'square', vol); // C6
                break;
            
            case SFX_TYPES.UI_CLICK:
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, t);
                gain.gain.setValueAtTime(vol * 0.5, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.05);
                break;
        }
    }

    playTone(freq: number, time: number, duration: number, type: OscillatorType, vol: number) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        osc.start(time);
        osc.stop(time + duration);
    }
}

export const sfx = new SoundEngine();
