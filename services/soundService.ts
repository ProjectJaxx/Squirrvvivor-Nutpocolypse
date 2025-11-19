
let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// Helper to create noise buffer for explosions/crow sounds
let noiseBuffer: AudioBuffer | null = null;
const getNoiseBuffer = (ctx: AudioContext) => {
    if (!noiseBuffer) {
        const bufferSize = ctx.sampleRate * 2; // 2 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noiseBuffer = buffer;
    }
    return noiseBuffer;
};

export type SoundType = 'NUT' | 'CANNON' | 'FEATHER' | 'AURA' | 'EXPLOSION' | 'HIT' | 'DEATH' | 'LEVELUP' | 'COLLECT' | 'WARNING';

export const playSound = (type: SoundType) => {
  const ctx = getCtx();
  if (!ctx) return;
  
  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  
  // Global volume adjustment
  masterGain.gain.value = 0.3;

  try {
    switch (type) {
        case 'NUT': {
            // High pitch 'thwip'
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            
            const gain = ctx.createGain();
            gain.connect(masterGain);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        }
        case 'CANNON': {
            // Low 'boom'
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

            const gain = ctx.createGain();
            gain.connect(masterGain);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        }
        case 'FEATHER': {
            // High frequency noise sweep 'shhh'
            const noise = ctx.createBufferSource();
            noise.buffer = getNoiseBuffer(ctx);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.linearRampToValueAtTime(4000, now + 0.1);

            const gain = ctx.createGain();
            gain.connect(masterGain);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            noise.connect(filter);
            filter.connect(gain);
            noise.start(now);
            noise.stop(now + 0.1);
            break;
        }
        case 'AURA': {
            // Low eerie wobble
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(150, now + 0.3);

            const gain = ctx.createGain();
            gain.connect(masterGain);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);

            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        }
        case 'EXPLOSION': {
            // Heavy noise decay
            const noise = ctx.createBufferSource();
            noise.buffer = getNoiseBuffer(ctx);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.5);

            const gain = ctx.createGain();
            gain.connect(masterGain);
            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            noise.connect(filter);
            filter.connect(gain);
            noise.start(now);
            noise.stop(now + 0.5);
            break;
        }
        case 'HIT': {
            // Short tick
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

            const gain = ctx.createGain();
            gain.connect(masterGain);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        }
        case 'DEATH': {
            // Crunch
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);
            
            const gain = ctx.createGain();
            gain.connect(masterGain);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        }
        case 'COLLECT': {
            // Ding
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(1800, now + 0.1);

            const gain = ctx.createGain();
            gain.connect(masterGain);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        }
        case 'LEVELUP': {
            // Major arpeggio
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
            const now = ctx.currentTime;
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                osc.type = 'square';
                osc.frequency.value = freq;
                
                const gain = ctx.createGain();
                gain.connect(masterGain);
                gain.gain.setValueAtTime(0.1, now + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
                
                osc.connect(gain);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.3);
            });
            break;
        }
        case 'WARNING': {
            // Siren - Alternating high pitch
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            
            // Two-tone siren
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.setValueAtTime(800, now + 0.4);
            osc.frequency.setValueAtTime(600, now + 0.8);
            osc.frequency.setValueAtTime(800, now + 1.2);
            osc.frequency.setValueAtTime(600, now + 1.6);
            
            const gain = ctx.createGain();
            gain.connect(masterGain);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 1.8);
            gain.gain.linearRampToValueAtTime(0, now + 2.0);
            
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 2.0);
            break;
        }
    }
  } catch (e) {
      console.warn("Audio play failed", e);
  }
};
