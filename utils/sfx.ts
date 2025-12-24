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

        const vol = this.volume * 0.3; 

        switch (type) {
            case SFX_TYPES.SHOOT:
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
                gain.gain.setValueAtTime(vol, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;
            case SFX_TYPES.HIT_ENEMY:
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.linearRampToValueAtTime(100, t + 0.05);
                gain.gain.setValueAtTime(vol * 0.8, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.05);
                break;
            case SFX_TYPES.HIT_PLAYER:
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.linearRampToValueAtTime(50, t + 0.3);
                gain.gain.setValueAtTime(vol, t);
                gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;
            case SFX_TYPES.COLLECT:
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, t);
                osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
                gain.gain.setValueAtTime(vol * 0.6, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                osc.start(t);
                osc.stop(t + 0.15);
                break;
            case SFX_TYPES.EXPLOSION:
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, t);
                osc.frequency.exponentialRampToValueAtTime(10, t + 0.4);
                gain.gain.setValueAtTime(vol, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc.start(t);
                osc.stop(t + 0.4);
                break;
            case SFX_TYPES.LEVEL_UP:
                this.playTone(523.25, t, 0.1, 'square', vol);
                this.playTone(659.25, t + 0.1, 0.1, 'square', vol);
                this.playTone(783.99, t + 0.2, 0.2, 'square', vol);
                this.playTone(1046.50, t + 0.3, 0.4, 'square', vol);
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