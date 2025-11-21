
import { SaveSlot, PlayerStats } from '../types';
import { BASE_UPGRADES_LIST } from '../constants';

const STORAGE_KEY = 'nutty_survivors_saves_v1';
const MAX_SLOTS = 5;

export const INITIAL_STATS: PlayerStats = {
    totalKills: 0,
    totalTimePlayed: 0,
    totalGamesPlayed: 0,
    maxWaveReached: 0,
    highestScore: 0,
    totalDeaths: 0,
    totalNuts: 0
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
        stats: { ...INITIAL_STATS },
        permanentUpgrades: {} // Init empty upgrades
    };

    slots.push(newSlot);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    return newSlot;
};

export const updateSlotStats = (slotId: string, runStats: { kills: number, time: number, score: number, wave: number, nuts: number }) => {
    const slots = getSlots();
    const idx = slots.findIndex(s => s.id === slotId);
    if (idx === -1) return;

    const slot = slots[idx];
    slot.lastPlayed = Date.now();
    
    // Update Stats
    slot.stats.totalGamesPlayed += 1;
    slot.stats.totalDeaths += 1;
    slot.stats.totalKills += runStats.kills;
    slot.stats.totalTimePlayed += runStats.time; // assuming time is in seconds here
    slot.stats.highestScore = Math.max(slot.stats.highestScore, runStats.score);
    slot.stats.maxWaveReached = Math.max(slot.stats.maxWaveReached, runStats.wave);
    slot.stats.totalNuts = (slot.stats.totalNuts || 0) + runStats.nuts;

    slots[idx] = slot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    return slot; // return updated slot
};

export const purchaseUpgrade = (slotId: string, upgradeId: string): SaveSlot | null => {
    const slots = getSlots();
    const idx = slots.findIndex(s => s.id === slotId);
    if (idx === -1) return null;

    const slot = slots[idx];
    const def = BASE_UPGRADES_LIST.find(u => u.id === upgradeId);
    if (!def) return null;

    const currentLevel = slot.permanentUpgrades[upgradeId] || 0;
    if (currentLevel >= def.maxLevel) return null;

    // Calculate cost
    let cost = def.baseCost;
    for (let i = 0; i < currentLevel; i++) {
        cost = Math.floor(cost * def.costMultiplier);
    }

    if (slot.stats.totalNuts < cost) return null; // Not enough nuts

    // Apply purchase
    slot.stats.totalNuts -= cost;
    slot.permanentUpgrades[upgradeId] = currentLevel + 1;

    slots[idx] = slot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    return slot;
};

export const deleteSlot = (slotId: string) => {
    const slots = getSlots();
    const newSlots = slots.filter(s => s.id !== slotId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSlots));
    return newSlots;
};
