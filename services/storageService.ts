
import { SaveSlot, PlayerStats } from '../types';

const STORAGE_KEY = 'nutty_survivors_saves_v1';
const MAX_SLOTS = 5;

export const INITIAL_STATS: PlayerStats = {
    totalKills: 0,
    totalTimePlayed: 0,
    totalGamesPlayed: 0,
    maxWaveReached: 0,
    highestScore: 0,
    totalDeaths: 0
};

export const getSlots = (): SaveSlot[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to parse save data", e);
        return [];
    }
};

export const createSlot = (name: string): SaveSlot | null => {
    const slots = getSlots();
    if (slots.length >= MAX_SLOTS) return null;

    const newSlot: SaveSlot = {
        id: crypto.randomUUID(),
        name: name || `Player ${slots.length + 1}`,
        created: Date.now(),
        lastPlayed: Date.now(),
        stats: { ...INITIAL_STATS }
    };

    slots.push(newSlot);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    return newSlot;
};

export const updateSlotStats = (slotId: string, runStats: { kills: number, time: number, score: number, wave: number }) => {
    const slots = getSlots();
    const idx = slots.findIndex(s => s.id === slotId);
    if (idx === -1) return;

    const slot = slots[idx];
    slot.lastPlayed = Date.now();
    
    // Update Stats
    slot.stats.totalGamesPlayed += 1;
    slot.stats.totalDeaths += 1;
    slot.stats.totalKills += runStats.kills;
    slot.stats.totalTimePlayed += runStats.time; // assuming time is in seconds here? Or frames? Let's assume seconds passed in
    slot.stats.highestScore = Math.max(slot.stats.highestScore, runStats.score);
    slot.stats.maxWaveReached = Math.max(slot.stats.maxWaveReached, runStats.wave);

    slots[idx] = slot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    return slot; // return updated slot
};

export const deleteSlot = (slotId: string) => {
    const slots = getSlots();
    const newSlots = slots.filter(s => s.id !== slotId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSlots));
    return newSlots;
};
