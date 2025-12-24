
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import GameEngine from './components/GameEngine.tsx';
import MusicPlayer from './components/MusicPlayer.tsx';
import { 
  GameState, Character, SaveData, CompanionType, EntityType, Difficulty, GameResults, GameSettings, Upgrade 
} from './types.ts';
import { 
  CHARACTERS, ARMORY_UPGRADES, COMPANIONS, ACTIVE_ABILITIES, IN_GAME_UPGRADES, ASSETS, DIFFICULTY_SETTINGS, STAGE_SETS, TOTAL_STAGES, getStageInfo
} from './constants.ts';
import { sfx, SFX_TYPES } from './utils/sfx.ts';

const INITIAL_SAVE: SaveData = {
  playerName: 'Survivor',
  peanuts: 0,
  unlockedCharacters: ['racer'],
  unlockedCompanions: [],
  upgrades: {},
  abilityLevels: {},
  companionLevels: {},
  equippedAbilities: [],
  equippedCompanions: [],
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
  const [armoryTab, setArmoryTab] = useState<'BASE' | 'COMPANIONS' | 'ABILITIES'>('BASE');
  
  const [activeTooltip, setActiveTooltip] = useState<{ text: string, x: number, y: number } | null>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [gameKey, setGameKey] = useState(0);
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

  const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);
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
      const data = { ...slot.data, companionLevels: slot.data.companionLevels || {} };
      setSaveData(data);
      setSelectedStage(data.maxStageReached || 1);
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

  const purchaseCompanionUpgrade = (id: string, cost: number) => {
    if (saveData.peanuts >= cost) {
      setSaveData(prev => ({
        ...prev, 
        peanuts: prev.peanuts - cost, 
        companionLevels: { ...prev.companionLevels, [id]: (prev.companionLevels[id] || 0) + 1 }
      }));
      sfx.play(SFX_TYPES.COLLECT);
    }
  };

  const unlockCompanion = (id: CompanionType, cost: number) => {
    if (saveData.peanuts >= cost) {
        setSaveData(prev => ({
            ...prev,
            peanuts: prev.peanuts - cost,
            unlockedCompanions: [...prev.unlockedCompanions, id],
            companionLevels: { ...prev.companionLevels, [id]: 1 }
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

  const toggleCompanionEquip = (id: string) => {
    setSaveData(prev => {
      const isEquipped = (prev.equippedCompanions || []).includes(id);
      let newEquipped = [...(prev.equippedCompanions || [])];
      if (isEquipped) newEquipped = newEquipped.filter(cid => cid !== id);
      else {
        if (newEquipped.length < 2) newEquipped.push(id);
        else { newEquipped.shift(); newEquipped.push(id); }
      }
      return { ...prev, equippedCompanions: newEquipped };
    });
    sfx.play(SFX_TYPES.UI_CLICK);
  };

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'Rare': return { border: 'border-blue-500 shadow-blue-500/20', bg: 'bg-blue-900/40', text: 'text-blue-400', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]' };
      case 'Epic': return { border: 'border-purple-500 shadow-purple-500/20', bg: 'bg-purple-900/40', text: 'text-purple-400', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]' };
      case 'Legendary': return { border: 'border-orange-500 shadow-orange-500/20', bg: 'bg-orange-900/40', text: 'text-orange-400', glow: 'shadow-[0_0_25px_rgba(249,115,22,0.4)]' };
      default: return { border: 'border-slate-600 shadow-slate-600/10', bg: 'bg-slate-800/60', text: 'text-slate-300', glow: '' };
    }
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
          <section className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700">
             <h3 className="text-lg font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
               <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" /> Select Survivor
             </h3>
             <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {CHARACTERS.map(char => (
                  <button key={char.id} onClick={() => { setSelectedChar(char); sfx.play(SFX_TYPES.UI_CLICK); }} className={`flex-shrink-0 p-3 rounded-xl border-2 transition-all w-28 ${selectedChar.id === char.id ? 'border-orange-500 bg-orange-500/20 shadow-[0_0_15px_rgba(255,165,0,0.3)]' : 'border-gray-600 bg-gray-900/50'}`}>
                    <div className="w-20 h-20 bg-gray-900 rounded-full mb-3 overflow-hidden border border-gray-800 mx-auto">
                      <img src={char.head} className={`w-full h-full object-cover ${(char.id === 'peaches' || char.id === 'maxine') ? 'object-top' : ''}`} />
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

          <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setGameState(GameState.ARMORY); sfx.play(SFX_TYPES.UI_CLICK); }} className="py-4 bg-gray-800 hover:bg-gray-700 text-blue-400 font-black rounded-xl border-2 border-blue-500/30 transition-all flex flex-col items-center group">
                <span className="text-xl group-hover:scale-110 transition-transform">⚔️</span>
                <span className="text-xs tracking-widest mt-1 uppercase">Drey</span>
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
  } else if (gameState === GameState.ARMORY) {
     mainContent = (
      <div className="w-full h-[100dvh] bg-slate-900 text-white overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 pb-24">
          <header className="flex justify-between items-center mb-8 sticky top-0 bg-slate-900 z-30 py-4 border-b border-gray-800">
            <button onClick={() => setGameState(GameState.MENU)} className="text-gray-400 font-bold hover:text-white transition-colors">← BACK</button>
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black tracking-tighter uppercase italic">The Drey</h2>
              <div className="bg-yellow-900/80 px-4 py-1 rounded-full border border-yellow-500 text-yellow-300 font-mono font-bold shadow-lg"><span>🥜</span> {saveData.peanuts}</div>
            </div>
          </header>

          <nav className="flex gap-2 mb-8 bg-gray-800/50 p-1 rounded-xl border border-gray-700/50 sticky top-16 z-20 backdrop-blur-md shadow-xl">
             <button onClick={() => setArmoryTab('BASE')} className={`flex-1 py-3 rounded-lg font-black text-xs tracking-widest uppercase transition-all ${armoryTab === 'BASE' ? 'bg-orange-600 text-white shadow-lg scale-[1.02]' : 'hover:bg-gray-700 text-gray-400'}`}>Squirvivor Lab</button>
             <button onClick={() => setArmoryTab('COMPANIONS')} className={`flex-1 py-3 rounded-lg font-black text-xs tracking-widest uppercase transition-all ${armoryTab === 'COMPANIONS' ? 'bg-blue-600 text-white shadow-lg scale-[1.02]' : 'hover:bg-gray-700 text-gray-400'}`}>Scurry Station</button>
             <button onClick={() => setArmoryTab('ABILITIES')} className={`flex-1 py-3 rounded-lg font-black text-xs tracking-widest uppercase transition-all ${armoryTab === 'ABILITIES' ? 'bg-purple-600 text-white shadow-lg scale-[1.02]' : 'hover:bg-gray-700 text-gray-400'}`}>Ability Forge</button>
          </nav>
          
          {armoryTab === 'BASE' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {ARMORY_UPGRADES.map(upgrade => {
                  const currentLevel = saveData.upgrades[upgrade.id] || 0;
                  const cost = Math.floor(upgrade.cost * Math.pow(upgrade.mult, currentLevel));
                  const isMaxed = currentLevel >= upgrade.maxLevel;
                  const canAfford = saveData.peanuts >= cost;
                  return (
                    <div key={upgrade.id} className="bg-gray-800/80 backdrop-blur p-5 rounded-2xl border border-gray-700 flex flex-col gap-4 shadow-xl hover:border-orange-500/50 transition-colors">
                       <div className="flex justify-between items-start">
                          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-3xl shadow-inner">{upgrade.icon}</div>
                          <div className="text-[10px] font-black bg-gray-900 px-2 py-1 rounded text-orange-400 border border-orange-500/20">LVL {currentLevel}/{upgrade.maxLevel}</div>
                       </div>
                       <div>
                          <h4 className="font-black text-lg uppercase tracking-tight">{upgrade.name}</h4>
                          <p className="text-xs text-gray-400 font-medium leading-relaxed">{upgrade.desc}</p>
                       </div>
                       <button onClick={() => purchaseUpgrade(upgrade.id, cost)} disabled={isMaxed || !canAfford} className={`mt-auto py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${isMaxed ? 'bg-green-900/20 text-green-500 border border-green-500/30' : canAfford ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg' : 'bg-gray-700 text-gray-500'}`}>{isMaxed ? 'OPTIMIZED' : (<><span>🥜</span> {cost}</>)}</button>
                    </div>
                  )
                })}
             </div>
          )}

          {armoryTab === 'COMPANIONS' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {COMPANIONS.map(companion => {
                  const isUnlocked = saveData.unlockedCompanions.includes(companion.id);
                  const isEquipped = (saveData.equippedCompanions || []).includes(companion.id);
                  const currentLevel = saveData.companionLevels[companion.id] || 0;
                  const upgradeCost = Math.floor(companion.cost * 0.5 * Math.pow(companion.growthMult, currentLevel));
                  const isMaxed = currentLevel >= companion.maxLevel;
                  const canAffordUpgrade = saveData.peanuts >= upgradeCost;
                  const canAffordUnlock = saveData.peanuts >= companion.cost;

                  return (
                    <div key={companion.id} className={`bg-gray-800/80 p-5 rounded-2xl border-2 transition-all flex flex-col gap-4 shadow-xl ${isEquipped ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 hover:border-blue-500/30'}`}>
                       <div className="flex justify-between items-start">
                          <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center text-4xl shadow-inner">{companion.icon}</div>
                          {isUnlocked && <div className="text-[10px] font-black bg-blue-900/50 px-2 py-1 rounded text-blue-300 border border-blue-500/30 italic uppercase">Veterancy: LVL {currentLevel}</div>}
                       </div>
                       <div>
                          <h4 className="font-black text-xl uppercase tracking-tighter italic">{companion.name}</h4>
                          <p className="text-xs text-gray-400 font-medium mb-2 leading-relaxed">{companion.desc}</p>
                       </div>
                       <div className="flex flex-col gap-2 mt-auto">
                          {!isUnlocked ? (
                             <button onClick={() => unlockCompanion(companion.id, companion.cost)} disabled={!canAffordUnlock} className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${canAffordUnlock ? 'bg-yellow-600 hover:bg-yellow-500 shadow-lg' : 'bg-gray-700 text-gray-500'}`}>Recruit • <span>🥜 {companion.cost}</span></button>
                          ) : (
                             <>
                                <button onClick={() => toggleCompanionEquip(companion.id)} className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isEquipped ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{isEquipped ? 'DEPLOYED' : 'ASSIGN TO SQUAD'}</button>
                                <button onClick={() => purchaseCompanionUpgrade(companion.id, upgradeCost)} disabled={isMaxed || !canAffordUpgrade} className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border-2 ${isMaxed ? 'border-green-500/30 text-green-500 opacity-50' : canAffordUpgrade ? 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/10' : 'border-gray-700 text-gray-500'}`}>{isMaxed ? 'MAX VETERANCY' : (<>Train Veterans • <span>🥜 {upgradeCost}</span></>)}</button>
                             </>
                          )}
                       </div>
                    </div>
                  );
                })}
             </div>
          )}

          {armoryTab === 'ABILITIES' && (
             <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {ACTIVE_ABILITIES.map(ability => {
                  const level = saveData.abilityLevels[ability.id] || 0;
                  const isUnlocked = level > 0;
                  const cost = Math.floor(ability.baseCost * Math.pow(1.5, level));
                  const canAfford = saveData.peanuts >= cost;
                  const isEquipped = saveData.equippedAbilities.includes(ability.id);
                  return (
                    <div key={ability.id} className={`bg-gray-800/80 p-5 rounded-2xl border-2 transition-all flex flex-col md:flex-row items-center gap-5 shadow-xl ${isEquipped ? 'border-purple-500 bg-purple-900/10' : 'border-gray-700 hover:border-purple-500/30'}`}>
                       <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-4xl shadow-xl border-b-4 border-black/30 ${ability.color}`}>{ability.icon}</div>
                       <div className="flex-1 text-center md:text-left">
                          <h4 className="font-black text-xl uppercase tracking-tighter">{ability.name}</h4>
                          <p className="text-xs text-gray-400 font-medium leading-relaxed">{ability.description}</p>
                          {isUnlocked && <div className="mt-1 text-[10px] font-black text-purple-400 uppercase italic">Power Level: {level}</div>}
                       </div>
                       <div className="flex gap-2 w-full md:w-auto">
                          {isUnlocked && <button onClick={() => toggleAbilityEquip(ability.id)} className={`flex-1 md:w-32 py-3 rounded-xl font-black text-xs uppercase tracking-widest ${isEquipped ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{isEquipped ? 'LOADED' : 'MOUNT'}</button>}
                          <button onClick={() => purchaseAbility(ability.id, cost)} disabled={!canAfford} className={`flex-1 md:w-32 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex flex-col items-center justify-center transition-all ${canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg' : 'bg-gray-700 text-gray-500'}`}><span>{isUnlocked ? 'UPGRADE' : 'FORGE'}</span> <span className="text-[10px] opacity-80">🥜 {cost}</span></button>
                       </div>
                    </div>
                  );
                })}
             </div>
          )}
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
             <div className="bg-gray-900 border-2 border-orange-500/50 p-8 rounded-2xl w-full max-sm shadow-2xl flex flex-col gap-6">
                <h2 className="text-3xl font-black text-center text-orange-400 tracking-widest">PAUSED</h2>
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
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-500 overflow-hidden">
             <div className="relative z-10 w-full max-w-3xl flex flex-col items-center">
                <div className="text-center mb-6">
                    <h2 className="text-4xl md:text-5xl font-black text-white drop-shadow-2xl uppercase tracking-tighter italic">MUTATION READY</h2>
                    <p className="text-orange-400 font-bold tracking-[0.3em] uppercase text-[10px] mt-1">Evolve your Squirvivor</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full px-4">
                  {upgradeOptions.map((upgrade, idx) => {
                    const rarity = getRarityStyles(upgrade.rarity);
                    return (
                      <button key={idx} onClick={() => { if (activePlayerRef.current) upgrade.apply(activePlayerRef.current); setGameState(GameState.PLAYING); sfx.play(SFX_TYPES.COLLECT); }} className={`group relative flex flex-col items-center p-5 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-1 ${rarity.bg} ${rarity.border} ${rarity.glow} animate-in zoom-in-50 duration-500 shadow-2xl`}>
                         <div className={`text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300`}>{upgrade.icon}</div>
                         <div className="text-center w-full">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 inline-block bg-black/50 border border-white/10 ${rarity.text}`}>{upgrade.rarity}</span>
                            <h3 className="text-lg font-black text-white mb-1 uppercase leading-none tracking-tight">{upgrade.name}</h3>
                            <p className="text-slate-400 text-[10px] font-medium leading-snug px-1 line-clamp-3">"{upgrade.description}"</p>
                         </div>
                      </button>
                    );
                  })}
                </div>
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
      {mainContent}
    </>
  );
};

export default App;
