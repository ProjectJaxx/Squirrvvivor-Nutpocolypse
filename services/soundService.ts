
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

export type SoundType = 'NUT' | 'CANNON' | 'FEATHER' | 'AURA' | 'EXPLOSION' | 'HIT' | 'DEATH' | 'LEVELUP' | 'COLLECT' | 'WARNING' | 'BUY';

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
        case 'BUY': {
            // Coin purchase jingle
            const now = ctx.currentTime;
            // Double high ping
            const freqs = [1500, 2000];
            freqs.forEach((f, i) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + (i * 0.1));
                
                const gain = ctx.createGain();
                gain.connect(masterGain);
                gain.gain.setValueAtTime(0.2, now + (i * 0.1));
                gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 0.2);
                
                osc.connect(gain);
                osc.start(now + (i * 0.1));
                osc.stop(now + (i * 0.1) + 0.2);
            });
            break;
        }
    }
  } catch (e) {
      console.warn("Audio play failed", e);
  }
};

// --- PROCEDURAL MUSIC ENGINE ---

let isMusicPlaying = false;
let nextNoteTime = 0.0;
let current16thNote = 0;
let musicTimerID: number | undefined;
let musicBiome = 'PARK';
let musicGain: GainNode | null = null;

const TEMPO = 120.0;
const LOOKAHEAD = 25.0; // ms
const SCHEDULE_AHEAD_TIME = 0.1; // s

const SCALES: Record<string, number[]> = {
    PARK: [0, 2, 4, 7, 9], // Major Pentatonic (Happy, Bright)
    PARKING_LOT: [0, 3, 5, 6, 7, 10], // Blues Scale (Gritty, Cool)
    MARS: [0, 2, 4, 6, 8, 10] // Whole Tone (Spacey, Unsettling)
};

// Frequency helper
const noteToFreq = (stepsFromRoot: number, rootFreq = 220) => {
    return rootFreq * Math.pow(2, stepsFromRoot / 12);
};

const getScaleNote = (index: number, scale: number[], octaveOffset = 0) => {
    const len = scale.length;
    const octave = Math.floor(index / len) + octaveOffset;
    const degree = ((index % len) + len) % len; // handle negative modulation
    return noteToFreq(scale[degree] + octave * 12);
};

const scheduleNote = (beatNumber: number, time: number, ctx: AudioContext) => {
    if (!musicGain) return;
    
    const scale = SCALES[musicBiome] || SCALES.PARK;
    
    // 1. Kick (Quarter notes)
    if (beatNumber % 4 === 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(musicGain);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    // 2. Snare (Beats 4, 12 in 16th grid -> 2 and 4 quarter)
    if (beatNumber % 16 === 4 || beatNumber % 16 === 12) {
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        const gain = ctx.createGain();
        
        noise.connect(noiseFilter);
        noiseFilter.connect(gain);
        gain.connect(musicGain);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        
        noise.start(time);
        noise.stop(time + 0.2);
    }

    // 3. HiHat (Every 16th, louder on 8ths)
    if (beatNumber % 2 === 0) { // 8th notes
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;
        const gain = ctx.createGain();

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);

        // Accent beats
        const volume = (beatNumber % 4 === 0) ? 0.15 : 0.05;
        
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        
        noise.start(time);
        noise.stop(time + 0.05);
    }

    // 4. Bass (16th notes, pattern based on biome)
    if (beatNumber % 4 === 0 || beatNumber % 16 === 14) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = musicBiome === 'MARS' ? 'sine' : (musicBiome === 'PARKING_LOT' ? 'sawtooth' : 'square');
        osc.connect(gain);
        gain.connect(musicGain);

        // Simple bass line logic
        let noteIdx = 0; // Root
        if (beatNumber % 16 === 14) noteIdx = 2; // Variation
        
        // Mars wobbles
        if (musicBiome === 'MARS') {
             osc.frequency.setValueAtTime(getScaleNote(noteIdx, scale, -2), time);
             osc.frequency.linearRampToValueAtTime(getScaleNote(noteIdx+1, scale, -2), time + 0.2);
        } else {
             osc.frequency.setValueAtTime(getScaleNote(noteIdx, scale, -2), time);
        }

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
    }

    // 5. Lead Melody (Sparse, generated)
    // Play on random 16ths but aligned to musical grid somewhat
    // Using a pseudo-random pattern based on beatNumber so it loops consistently-ish
    const pattern = [0, -1, 2, -1, 4, 2, 0, -1, 5, 4, -1, 2, 7, -1, 0, -1]; // -1 = rest
    const melodyNote = pattern[beatNumber % 16];
    
    if (melodyNote !== -1 && Math.random() > 0.2) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = musicBiome === 'MARS' ? 'triangle' : 'sine';
        
        if (musicBiome === 'PARKING_LOT') {
            // Distortion effect simulated by gain clipping or type
            osc.type = 'square';
        }
        
        osc.connect(gain);
        gain.connect(musicGain);

        const freq = getScaleNote(melodyNote, scale, 0);
        osc.frequency.setValueAtTime(freq, time);
        
        if (musicBiome === 'MARS') {
            // Slide
            osc.frequency.linearRampToValueAtTime(freq * 1.05, time + 0.2);
        }

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

        osc.start(time);
        osc.stop(time + 0.4);
    }
};

const scheduler = () => {
    const ctx = getCtx();
    if (!ctx) return;

    // Schedule ahead
    while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
        scheduleNote(current16thNote, nextNoteTime, ctx);
        const secondsPerBeat = 60.0 / TEMPO;
        nextNoteTime += 0.25 * secondsPerBeat; // Advance by 16th note
        current16thNote++;
        if (current16thNote === 16) current16thNote = 0;
    }
    
    musicTimerID = window.setTimeout(scheduler, LOOKAHEAD);
};

export const playMusic = (biome: string) => {
    if (isMusicPlaying) {
        // Just switch biome if already playing
        musicBiome = biome;
        return;
    }

    const ctx = getCtx();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    isMusicPlaying = true;
    musicBiome = biome;
    current16thNote = 0;
    nextNoteTime = ctx.currentTime + 0.1;

    // Master Music Gain
    if (!musicGain) {
        musicGain = ctx.createGain();
        musicGain.connect(ctx.destination);
        musicGain.gain.value = 0.25; // Slightly quieter than SFX
    }

    scheduler();
};

export const stopMusic = () => {
    isMusicPlaying = false;
    if (musicTimerID) {
        window.clearTimeout(musicTimerID);
        musicTimerID = undefined;
    }
};
