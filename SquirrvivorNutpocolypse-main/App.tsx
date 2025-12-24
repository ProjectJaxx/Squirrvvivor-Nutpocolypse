import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import GameEngine from './components/GameEngine';
import MusicPlayer from './components/MusicPlayer';
import { 
  GameState, Character, SaveData, CompanionType, EntityType, Difficulty, GameResults, GameSettings 
} from './types';
import { 
  CHARACTERS, ARMORY_UPGRADES, COMPANIONS, ACTIVE_ABILITIES, IN_GAME_UPGRADES, ASSETS, DIFFICULTY_SETTINGS, STAGE_SETS, TOTAL_STAGES, getStageInfo
} from './constants';
import { sfx, SFX_TYPES } from './utils/sfx';

const INITIAL_SAVE: SaveData = {
  playerName: 'Survivor',
  peanuts: 0,
  unlockedCharacters: ['racer'],
  unlockedCompanions: [],
  upgrades: {},
  abilityLevels: {},
  equippedAbilities: [],
  maxStageReached: 1
};

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 100,
  musicVolume: 80,
  sfxVolume: 100,
  damageNumbers: true,
  screenShake: true,
  showTooltips: true
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [saveData, setSaveData] = useState<SaveData>(INITIAL_SAVE);
  const [selectedChar, setSelectedChar] = useState<Character>(CHARACTERS[0]);
  const [saveSlot, setSaveSlot] = useState<string | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.HARD);
  const [selectedStage, setSelectedStage] = useState(1);
  
  const [activeTooltip, setActiveTooltip] = useState<{ text: string, x: number, y: number } | null>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [gameKey, setGameKey] = useState(0);
  // Add ref to store the player state reference passed from GameEngine to apply level up upgrades
  const activePlayerRef = useRef<any>(null);
  const [menuTrack, setMenuTrack] = useState<string>('');
  const [slots, setSlots] = useState<{key: string, label: string, data: SaveData | null}[]>(() => {
    const defaultSlots = [0, 1, 2].map(i => ({ key: `slot_${i}`, label: `Slot ${i + 1}`, data: null }));
    try {
      if (typeof localStorage === 'undefined') return defaultSlots;
      return [0, 1, 2].map(i => {
        const key = `slot_${i}`;
        let data: SaveData | null = null;
        try {
          const raw = localStorage.getItem(`squirvivor_${key}`);
          if (raw) data = JSON.parse(raw);
        } catch (e) { }
        return { key, label: `Slot ${i + 1}`, data };
      });
    } catch (e) {
      return defaultSlots;
    }
  });

  const [bgIndex, setBgIndex] = useState(0);
  const [upgradeOptions, setUpgradeOptions] = useState<any[]>([]);
  const [gameOverStats, setGameOverStats] = useState<GameResults>({ peanuts: 0, enemiesKilled: 0, bossesKilled: 0, duration: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const refreshSlots = () => {
    const loaded = [0, 1, 2].map(i => {
      const key = `slot_${i}`;
      let data: SaveData | null = null;
      try {
        const raw = localStorage.getItem(`squirvivor_${key}`);
        if (raw) data = JSON.parse(raw);
      } catch (e) { }
      return { key, label: `Slot ${i + 1}`, data };
    });
    setSlots(loaded);
  };

  useEffect(() => {
    refreshSlots();
    const trackNum = Math.floor(Math.random() * 7) + 1;
    const audioKey = `GAMEPLAY_${trackNum}` as keyof typeof ASSETS.AUDIO;
    const trackUrl = ASSETS.AUDIO[audioKey];
    setMenuTrack(trackUrl || ASSETS.AUDIO.GAMEPLAY);
  }, []);

  useEffect(() => {
    const preloadAssets = async () => {
      const imageUrls: string[] = [];
      const traverse = (obj: any) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string' && (obj[key].startsWith('http') || obj[key].startsWith('data:'))) imageUrls.push(obj[key]);
          else if (typeof obj[key] === 'object') traverse(obj[key]);
        }
      };
      traverse(ASSETS);
      let loaded = 0;
      const total = imageUrls.length;
      if (total === 0) {
        setIsLoading(false);
        return;
      }
      const promises = imageUrls.map(url => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = () => { loaded++; setLoadProgress(Math.floor((loaded / total) * 100)); resolve(url); };
          img.onerror = () => { loaded++; setLoadProgress(Math.floor((loaded / total) * 100)); resolve(null); };
        });
      });
      await Promise.all(promises);
      setTimeout(() => setIsLoading(false), 500);
    };
    preloadAssets();
  }, []);

  useEffect(() => {
     try {
       const savedSettings = localStorage.getItem(`squirvivor_settings`);
       if (savedSettings) setSettings(JSON.parse(savedSettings));
     } catch(e) {}
  }, []);

  useEffect(() => {
    if (saveSlot) localStorage.setItem(`squirvivor_${saveSlot}`, JSON.stringify(saveData));
  }, [saveData, saveSlot]);

  useEffect(() => {
    localStorage.setItem(`squirvivor_settings`, JSON.stringify(settings));
  }, [settings]);

  const startGame = () => {
    setGameKey(prev => prev + 1);
    setGameState(GameState.PLAYING);
    setGameOverStats({ peanuts: 0, enemiesKilled: 0, bossesKilled: 0, duration: 0 });
    sfx.play(SFX_TYPES.UI_CLICK);
  };

  const handleSlotSelect = (slot: {key: string, data: SaveData | null}) => {
    sfx.play(SFX_TYPES.UI_CLICK);
    if (slot.data) {
      setSaveData(slot.data);
      setSelectedStage(slot.data.maxStageReached || 1);
      setSaveSlot(slot.key);
      setGameState(GameState.MENU);
    } else {
      setPendingSlot(slot.key);
      setNewPlayerName('');
    }
  };

  const handleDeleteSlot = (e: React.MouseEvent, slotKey: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this save?")) {
      localStorage.removeItem(`squirvivor_${slotKey}`);
      refreshSlots();
      if (saveSlot === slotKey) setSaveSlot(null);
    }
  };

  const confirmNewGame = () => {
    if (!pendingSlot) return;
    const nameToUse = newPlayerName.trim() || 'Survivor';
    const newSaveData = { ...INITIAL_SAVE, playerName: nameToUse };
    localStorage.setItem(`squirvivor_${pendingSlot}`, JSON.stringify(newSaveData));
    refreshSlots(); 
    setSaveData(newSaveData);
    setSelectedStage(1);
    setSaveSlot(pendingSlot);
    setGameState(GameState.MENU);
    setPendingSlot(null);
    sfx.play(SFX_TYPES.UI_CLICK);
  };

  const handleGameOver = (results: GameResults, won: boolean) => {
    setGameState(won ? GameState.VICTORY : GameState.GAME_OVER);
    setGameOverStats(results);
    setSaveData(prev => {
      let nextStage = prev.maxStageReached;
      if (won && selectedStage === prev.maxStageReached && prev.maxStageReached < TOTAL_STAGES) {
        nextStage = prev.maxStageReached + 1;
      }
      return { ...prev, peanuts: prev.peanuts + results.peanuts, maxStageReached: nextStage };
    });
  };

  // Fixed handleLevelUp to capture and store the player state reference passed from GameEngine
  const handleLevelUp = (level: number, playerState?: any) => {
    setGameState(GameState.LEVEL_UP);
    if (playerState) activePlayerRef.current = playerState;
    const shuffled = [...IN_GAME_UPGRADES].sort(() => 0.5 - Math.random());
    setUpgradeOptions(shuffled.slice(0, 3));
  };

  const togglePause = () => {
    if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
    else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
    sfx.play(SFX_TYPES.UI_CLICK);
  };

  const currentMusicTrack = useMemo(() => {
    if (gameState === GameState.MENU || gameState === GameState.CHAR_SELECT || gameState === GameState.SETTINGS || gameState === GameState.ARMORY || !saveSlot) {
        return menuTrack;
    }
    const stageNum = selectedStage;
    if (stageNum <= 3) return ASSETS.AUDIO.GAMEPLAY;
    if (stageNum <= 7) return ASSETS.AUDIO.GAMEPLAY_1;
    if (stageNum <= 11) return ASSETS.AUDIO.GAMEPLAY_2;
    if (stageNum <= 15) return ASSETS.AUDIO.GAMEPLAY_3;
    if (stageNum <= 19) return ASSETS.AUDIO.GAMEPLAY_4;
    if (stageNum <= 23) return ASSETS.AUDIO.GAMEPLAY_5;
    if (stageNum <= 27) return ASSETS.AUDIO.GAMEPLAY_6;
    return ASSETS.AUDIO.GAMEPLAY_7;
  }, [gameState, selectedStage, menuTrack, saveSlot]);

  const purchaseUpgrade = (id: string, cost: number) => {
    if (saveData.peanuts >= cost) {
      setSaveData(prev => ({
        ...prev, peanuts: prev.peanuts - cost, upgrades: { ...prev.upgrades, [id]: (prev.upgrades[id] || 0) + 1 }
      }));
      sfx.play(SFX_TYPES.COLLECT);
    }
  };

  const purchaseAbility = (id: string, cost: number) => {
    if (saveData.peanuts >= cost) {
       setSaveData(prev => ({
        ...prev, peanuts: prev.peanuts - cost, abilityLevels: { ...prev.abilityLevels, [id]: (prev.abilityLevels[id] || 0) + 1 }
      }));
      sfx.play(SFX_TYPES.COLLECT);
    }
  };

  const toggleAbilityEquip = (id: string) => {
    if ((saveData.abilityLevels[id] || 0) === 0) return;
    setSaveData(prev => {
      const isEquipped = prev.equippedAbilities.includes(id);
      let newEquipped = [...prev.equippedAbilities];
      if (isEquipped) newEquipped = newEquipped.filter(aid => aid !== id);
      else {
        if (newEquipped.length < 2) newEquipped.push(id);
        else { newEquipped.shift(); newEquipped.push(id); }
      }
      return { ...prev, equippedAbilities: newEquipped };
    });
    sfx.play(SFX_TYPES.UI_CLICK);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center overflow-hidden touch-none">
         <img src={ASSETS.UI.LOADING_BG} alt="Loading Background" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm" />
         <div className="relative z-10 flex flex-col items-center w-full max-w-lg p-6">
            <img src={ASSETS.UI.LOGO} alt="Squirvivor" className="w-full h-auto max-h-64 object-contain mb-8 drop-shadow-[0_0_20px_rgba(255,165,0,0.6)] animate-pulse" />
            <h2 className="text-2xl font-black text-white tracking-widest mb-4">INITIALIZING...</h2>
            <div className="w-full h-6 bg-gray-900/80 rounded-full border-2 border-gray-700 overflow-hidden shadow-xl">
               <div className="h-full bg-gradient-to-r from-orange-600 to-yellow-500 transition-all duration-200" style={{ width: `${loadProgress}%` }} />
            </div>
         </div>
      </div>
    );
  }

  let mainContent;

  if (!saveSlot) {
    mainContent = (
      <div className="w-full h-[100dvh] bg-gray-900 flex flex-col items-center justify-center text-white p-4 relative overflow-y-auto touch-pan-y overscroll-none">
        <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
          <img src={ASSETS.UI.LOGO} className="w-full mb-12 h-32 md:h-auto object-contain shrink-0" alt="Squirvivor Logo" />
          {pendingSlot ? (
            <div className="bg-gray-800/90 backdrop-blur-md p-8 rounded-2xl border-2 border-orange-500 shadow-2xl w-full">
              <h2 className="text-2xl font-bold text-center text-orange-400 mb-2">New Game</h2>
              <input autoFocus type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Enter Name..." maxLength={12} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white text-lg outline-none mb-6" />
              <div className="flex gap-3">
                <button onClick={() => setPendingSlot(null)} className="flex-1 py-3 bg-gray-700 rounded-xl font-bold">Cancel</button>
                <button onClick={confirmNewGame} className="flex-1 py-3 bg-orange-600 rounded-xl font-bold">Start</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              {slots.map((slot) => (
                  <div key={slot.key} onClick={() => handleSlotSelect(slot)} className="p-6 bg-gray-800/90 backdrop-blur hover:bg-orange-900/80 rounded-xl border-2 border-gray-700 hover:border-orange-500 transition-all flex justify-between items-center cursor-pointer shadow-lg">
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-xl text-gray-200">{slot.label}</span>
                      <span className="text-xs text-orange-400 font-mono mt-1">{slot.data ? `${slot.data.playerName} • Stage ${slot.data.maxStageReached}` : 'Empty Slot'}</span>
                    </div>
                    {slot.data && <button onClick={(e) => handleDeleteSlot(e, slot.key)} className="p-2 text-gray-500 hover:text-red-500">🗑️</button>}
                  </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } else if (gameState === GameState.MENU) {
    const stats = {
        hp: Math.round(selectedChar.baseStats.hp + (saveData.upgrades['thick_fur'] || 0) * 10),
        speed: (selectedChar.baseStats.speed + (saveData.upgrades['quick_paws'] || 0) * 0.4).toFixed(1),
        damage: Math.round(selectedChar.baseStats.damage * (1 + (saveData.upgrades['sharp_teeth'] || 0) * 0.2))
    };
    const currentStageInfo = getStageInfo(selectedStage);
    mainContent = (
      <div className="w-full h-[100dvh] bg-slate-900 text-white overflow-y-auto flex flex-col">
        <div className="w-full max-w-5xl mx-auto p-4 flex justify-between items-center sticky top-0 bg-slate-900/80 backdrop-blur-md z-30">
           <img src={ASSETS.UI.LOGO} className="h-16 md:h-24 object-contain" alt="Squirvivor" />
           <div className="bg-yellow-900/80 px-4 py-2 rounded-full border border-yellow-500 text-yellow-300 font-mono text-xl shadow-lg flex items-center gap-2">
              <span>🥜</span> {saveData.peanuts}
            </div>
        </div>

        <div className="w-full max-w-6xl mx-auto p-4 flex-1 space-y-6 pb-24">
          {/* SECTION: CHARACTER PICKER */}
          <section className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700">
             <h3 className="text-lg font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
               <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" /> Select Survivor
             </h3>
             <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {CHARACTERS.map(char => (
                  <button key={char.id} onClick={() => { setSelectedChar(char); sfx.play(SFX_TYPES.UI_CLICK); }} className={`flex-shrink-0 p-3 rounded-xl border-2 transition-all w-28 ${selectedChar.id === char.id ? 'border-orange-500 bg-orange-500/20 shadow-[0_0_15px_rgba(255,165,0,0.3)]' : 'border-gray-600 bg-gray-900/50'}`}>
                    <div className="w-20 h-20 bg-gray-900 rounded-full mb-3 overflow-hidden border border-gray-800 mx-auto">
                      <img src={char.head} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-xs block text-center truncate">{char.name}</span>
                  </button>
                ))}
             </div>
             <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-black/40 p-3 rounded-xl border border-gray-700/50 text-center">
                  <div className="text-[10px] text-gray-500 font-black uppercase">Max HP</div>
                  <div className="font-mono text-lg font-bold text-green-400">{stats.hp}</div>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-gray-700/50 text-center">
                  <div className="text-[10px] text-gray-500 font-black uppercase">Agility</div>
                  <div className="font-mono text-lg font-bold text-blue-400">{stats.speed}</div>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-gray-700/50 text-center">
                  <div className="text-[10px] text-gray-500 font-black uppercase">Strength</div>
                  <div className="font-mono text-lg font-bold text-red-400">{stats.damage}</div>
                </div>
             </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SECTION: MISSION SELECT */}
            <section className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700 flex flex-col h-full">
              <h3 className="text-lg font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> Mission Target
              </h3>
              <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-gray-700">
                 <button onClick={() => { setSelectedStage(Math.max(1, selectedStage - 1)); sfx.play(SFX_TYPES.UI_CLICK); }} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-30 transition-colors" disabled={selectedStage <= 1}>◀</button>
                 <div className="text-center px-4">
                   <div className="text-sm font-black text-blue-400 uppercase mb-1">STAGE {selectedStage}</div>
                   <div className="text-xl font-black text-white truncate max-w-[120px]">{currentStageInfo.name}</div>
                 </div>
                 <button onClick={() => { setSelectedStage(Math.min(saveData.maxStageReached, selectedStage + 1)); sfx.play(SFX_TYPES.UI_CLICK); }} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-30 transition-colors" disabled={selectedStage >= saveData.maxStageReached}>▶</button>
              </div>
              <p className="text-xs text-gray-500 mt-4 italic text-center">"{currentStageInfo.description}"</p>
            </section>

            {/* SECTION: DIFFICULTY PICKER */}
            <section className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700 flex flex-col h-full">
              <h3 className="text-lg font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Difficulty
              </h3>
              <div className="grid grid-cols-2 gap-2">
                 {Object.entries(DIFFICULTY_SETTINGS).map(([key, config]) => (
                   <button 
                     key={key} 
                     onClick={() => { setDifficulty(key as Difficulty); sfx.play(SFX_TYPES.UI_CLICK); }}
                     className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center ${difficulty === key ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-black/20 hover:border-gray-500'}`}
                   >
                     <span className={`font-black text-sm uppercase ${config.color}`}>{config.label}</span>
                     <span className="text-[10px] text-gray-500 font-mono mt-1">
                       {config.duration === Infinity ? 'INF' : `${config.duration / 60}M`}
                     </span>
                   </button>
                 ))}
              </div>
              <div className="mt-4 p-3 bg-black/40 rounded-xl border border-gray-700/50">
                 <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Details</p>
                 <p className="text-xs text-orange-200/80 leading-tight">
                   {DIFFICULTY_SETTINGS[difficulty].description}
                 </p>
              </div>
            </section>
          </div>

          {/* MAIN ACTIONS */}
          <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setGameState(GameState.ARMORY); sfx.play(SFX_TYPES.UI_CLICK); }} className="py-4 bg-gray-800 hover:bg-gray-700 text-blue-400 font-black rounded-xl border-2 border-blue-500/30 transition-all flex flex-col items-center group">
                <span className="text-xl group-hover:scale-110 transition-transform">⚔️</span>
                <span className="text-xs tracking-widest mt-1">ARMORY</span>
              </button>
              <button onClick={startGame} className="py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-2xl rounded-xl shadow-[0_4px_20px_rgba(234,88,12,0.4)] transition-all flex flex-col items-center group">
                <span className="group-hover:scale-110 transition-transform">SURVIVE</span>
                <span className="text-[10px] tracking-widest opacity-80 mt-1">LAUNCH MISSION</span>
              </button>
          </div>
          
          <button onClick={() => { setSaveSlot(null); sfx.play(SFX_TYPES.UI_CLICK); }} className="w-full py-2 text-xs font-bold text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-[0.2em]">Change Player Profile</button>
        </div>
      </div>
    );
  } else if (gameState === GameState.SETTINGS) {
    mainContent = (
      <div className="w-full h-[100dvh] bg-slate-900 text-white p-6 flex flex-col items-center">
          <div className="w-full max-w-xl">
             <header className="flex justify-between items-center mb-10"><button onClick={() => setGameState(GameState.MENU)} className="text-gray-400 font-bold">← BACK</button><h2 className="text-3xl font-bold">Settings</h2><div className="w-12" /></header>
             <div className="space-y-6">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
                   <h3 className="font-bold text-orange-400">Audio</h3>
                   <div className="space-y-2"><label className="text-xs text-gray-500 uppercase">Music Volume</label><input type="range" min="0" max="100" value={settings.musicVolume} onChange={(e) => setSettings({...settings, musicVolume: parseInt(e.target.value)})} className="w-full h-2 bg-gray-700 rounded-lg accent-orange-500" /></div>
                   <div className="space-y-2"><label className="text-xs text-gray-500 uppercase">SFX Volume</label><input type="range" min="0" max="100" value={settings.sfxVolume} onChange={(e) => { const val = parseInt(e.target.value); setSettings({...settings, sfxVolume: val}); sfx.setVolume(val / 100); }} className="w-full h-2 bg-gray-700 rounded-lg accent-orange-500" /></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col gap-4">
                   <h3 className="font-bold text-blue-400">Gameplay</h3>
                   <label className="flex items-center justify-between"><span className="text-gray-300">Tooltips</span><input type="checkbox" checked={settings.showTooltips} onChange={(e) => setSettings({...settings, showTooltips: e.target.checked})} className="w-6 h-6 rounded accent-blue-500" /></label>
                   <label className="flex items-center justify-between"><span className="text-gray-300">Screen Shake</span><input type="checkbox" checked={settings.screenShake} onChange={(e) => setSettings({...settings, screenShake: e.target.checked})} className="w-6 h-6 rounded accent-blue-500" /></label>
                </div>
             </div>
          </div>
      </div>
    );
  } else if (gameState === GameState.ARMORY) {
     mainContent = (
      <div className="w-full h-[100dvh] bg-slate-900 text-white overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 pb-24">
          <header className="flex justify-between items-center mb-8 sticky top-0 bg-slate-900 z-20 py-4 border-b border-gray-800"><button onClick={() => setGameState(GameState.MENU)} className="text-gray-400 font-bold">← BACK</button><div className="flex items-center gap-4"><h2 className="text-2xl font-bold">Armory</h2><div className="bg-yellow-900/80 px-4 py-1 rounded-full border border-yellow-500 text-yellow-300 font-mono font-bold"><span>🥜</span> {saveData.peanuts}</div></div></header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
             {ARMORY_UPGRADES.map(upgrade => {
               const currentLevel = saveData.upgrades[upgrade.id] || 0;
               const cost = Math.floor(upgrade.cost * Math.pow(upgrade.mult, currentLevel));
               const isMaxed = currentLevel >= upgrade.maxLevel;
               const canAfford = saveData.peanuts >= cost;
               return (
                 <div key={upgrade.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col gap-3">
                    <div className="flex justify-between items-start"><div className="text-3xl">{upgrade.icon}</div><div className="text-[10px] font-bold bg-gray-900 px-2 py-1 rounded text-gray-500">LVL {currentLevel}/{upgrade.maxLevel}</div></div>
                    <h4 className="font-bold text-lg">{upgrade.name}</h4><p className="text-xs text-gray-400">{upgrade.desc}</p>
                    <button onClick={() => purchaseUpgrade(upgrade.id, cost)} disabled={isMaxed || !canAfford} className={`mt-auto py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${isMaxed ? 'bg-green-600/20 text-green-500' : canAfford ? 'bg-yellow-600' : 'bg-gray-700 text-gray-500'}`}>{isMaxed ? 'MAX' : (<><span>🥜</span> {cost}</>)}</button>
                 </div>
               )
             })}
          </div>
          <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Abilities</h3>
          <div className="grid grid-cols-1 gap-4">
             {ACTIVE_ABILITIES.map(ability => {
               const level = saveData.abilityLevels[ability.id] || 0;
               const isUnlocked = level > 0;
               const cost = Math.floor(ability.baseCost * Math.pow(1.5, level));
               const canAfford = saveData.peanuts >= cost;
               const isEquipped = saveData.equippedAbilities.includes(ability.id);
               return (
                 <div key={ability.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col md:flex-row items-center gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${ability.color}`}>{ability.icon}</div>
                    <div className="flex-1 text-center md:text-left"><h4 className="font-bold">{ability.name}</h4><p className="text-xs text-gray-400">{ability.description}</p></div>
                    <div className="flex gap-2 w-full md:w-auto">
                       {isUnlocked && <button onClick={() => toggleAbilityEquip(ability.id)} className={`flex-1 md:w-28 py-2 rounded-lg font-bold text-xs ${isEquipped ? 'bg-green-600' : 'bg-gray-700'}`}>{isEquipped ? 'EQUIPPED' : 'EQUIP'}</button>}
                       <button onClick={() => purchaseAbility(ability.id, cost)} disabled={!canAfford} className={`flex-1 md:w-28 py-2 rounded-lg font-bold text-xs ${canAfford ? 'bg-yellow-600' : 'bg-gray-700 text-gray-500'}`}><span>{isUnlocked ? 'UPGRADE' : 'UNLOCK'}</span> <span>🥜{cost}</span></button>
                    </div>
                 </div>
               );
             })}
          </div>
        </div>
      </div>
     );
  } else {
    mainContent = (
      <div className="w-full h-[100dvh] relative bg-black touch-none">
        <GameEngine 
          key={gameKey}
          character={selectedChar}
          saveData={saveData}
          difficulty={difficulty}
          stage={selectedStage}
          onGameOver={handleGameOver}
          onLevelUp={() => handleLevelUp(0)} 
          onLevelUpWithState={(level, pState) => handleLevelUp(level, pState)}
          gameState={gameState}
          onResume={() => setGameState(GameState.PLAYING)}
          onTogglePause={togglePause}
          settings={settings}
          onUpdateSettings={setSettings}
        />
        {gameState === GameState.PAUSED && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
             <div className="bg-gray-900 border-2 border-orange-500/50 p-8 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col gap-6">
                <h2 className="text-3xl font-black text-center text-orange-400 tracking-widest">PAUSED</h2>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400"><span>MUSIC VOLUME</span><span>{settings.musicVolume}%</span></div>
                      <input type="range" min="0" max="100" value={settings.musicVolume} onChange={(e) => setSettings({...settings, musicVolume: parseInt(e.target.value)})} className="w-full h-2 bg-gray-800 rounded-lg accent-orange-500" />
                   </div>
                   <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400"><span>SFX VOLUME</span><span>{settings.sfxVolume}%</span></div>
                      <input type="range" min="0" max="100" value={settings.sfxVolume} onChange={(e) => { const val = parseInt(e.target.value); setSettings({...settings, sfxVolume: val}); sfx.setVolume(val / 100); }} className="w-full h-2 bg-gray-800 rounded-lg accent-orange-500" />
                   </div>
                   <button onClick={() => { setSettings({...settings, showTooltips: !settings.showTooltips}); sfx.play(SFX_TYPES.UI_CLICK); }} className="w-full py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs font-bold text-gray-300 flex justify-between px-4 items-center">
                      <span>TOOLTIPS</span>
                      <span className={settings.showTooltips ? 'text-green-500' : 'text-red-500'}>{settings.showTooltips ? 'ON' : 'OFF'}</span>
                   </button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                   <button onClick={() => { setGameState(GameState.PLAYING); sfx.play(SFX_TYPES.UI_CLICK); }} className="py-4 bg-orange-600 text-white font-black rounded-xl tracking-widest text-xl shadow-lg shadow-orange-900/40">RESUME</button>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={startGame} className="py-3 bg-blue-600 text-white font-bold rounded-xl text-sm">RESTART</button>
                      <button onClick={() => { setGameState(GameState.MENU); sfx.play(SFX_TYPES.UI_CLICK); }} className="py-3 bg-red-600 text-white font-bold rounded-xl text-sm">QUIT</button>
                   </div>
                </div>
             </div>
          </div>
        )}
        {gameState === GameState.LEVEL_UP && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
             <h2 className="text-4xl font-black text-yellow-400 mb-6 drop-shadow-lg uppercase tracking-tighter">Choose a Mutation</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
                {upgradeOptions.map((upgrade, idx) => (
                  <button key={idx} onClick={() => { 
                    // Fixed: Using activePlayerRef.current which stores the state reference passed from GameEngine
                    if (activePlayerRef.current) upgrade.apply(activePlayerRef.current); 
                    setGameState(GameState.PLAYING); 
                    sfx.play(SFX_TYPES.COLLECT); 
                  }} className="bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-yellow-400 rounded-xl p-6 flex flex-col items-center gap-4 transition-all group shadow-xl">
                     <div className="text-5xl group-hover:scale-110 transition-transform">{upgrade.icon}</div>
                     <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-1 uppercase">{upgrade.name}</h3>
                        <p className="text-gray-400 text-xs italic">{upgrade.description}</p>
                     </div>
                  </button>
                ))}
             </div>
          </div>
        )}
        {(gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && (
           <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300">
              <h2 className={`text-4xl md:text-6xl font-black mb-8 uppercase tracking-widest ${gameState === GameState.VICTORY ? 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]'}`}>{gameState === GameState.VICTORY ? 'STAGE CLEARED!' : 'DEFEATED'}</h2>
              <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-lg text-center">
                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700"><div className="text-2xl">💀</div><div className="text-xl font-black">{gameOverStats.enemiesKilled}</div><div className="text-[10px] text-gray-500">KILLS</div></div>
                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700"><div className="text-2xl">🥜</div><div className="text-xl font-black">{gameOverStats.peanuts}</div><div className="text-[10px] text-gray-500">NUTS</div></div>
                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700"><div className="text-2xl">⏱️</div><div className="text-xl font-black">{Math.floor(gameOverStats.duration/60)}:{(Math.floor(gameOverStats.duration)%60).toString().padStart(2, '0')}</div><div className="text-[10px] text-gray-500">TIME</div></div>
              </div>
              <div className="flex flex-col w-full max-w-sm gap-3">
                  <button onClick={startGame} className="w-full py-4 bg-orange-600 text-white font-black text-xl rounded-xl shadow-lg">RETRY</button>
                  <button onClick={() => { setGameState(GameState.MENU); sfx.play(SFX_TYPES.UI_CLICK); }} className="w-full py-3 bg-gray-700 text-gray-300 font-bold rounded-xl">MAIN MENU</button>
              </div>
           </div>
        )}
      </div>
    );
  }

  return (
    <>
      <MusicPlayer key={currentMusicTrack} src={currentMusicTrack} volume={settings.musicVolume} onVolumeChange={(vol) => setSettings({...settings, musicVolume: vol})} autoPlay={true} />
      {settings.showTooltips && activeTooltip && (
        <div className="fixed z-[200] pointer-events-none bg-slate-900/95 border border-orange-500/50 text-white p-3 rounded-xl shadow-2xl backdrop-blur-md max-w-xs" style={{ left: Math.min(activeTooltip.x + 20, window.innerWidth - 300), top: Math.min(activeTooltip.y + 20, window.innerHeight - 100) }}>
          <p className="text-xs font-bold">{activeTooltip.text}</p>
        </div>
      )}
      {mainContent}
    </>
  );
};

export default App;