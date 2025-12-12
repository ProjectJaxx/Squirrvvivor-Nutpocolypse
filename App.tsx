
import React, { useState, useEffect, Component, ErrorInfo, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { UpgradeMenu } from './components/UpgradeMenu';
import { GameOver } from './components/GameOver';
import { SettingsMenu } from './components/SettingsMenu';
import { SaveSlots } from './components/SaveSlots';
import { PauseMenu } from './components/PauseMenu';
import { BaseUpgrades } from './components/BaseUpgrades';
import { StageClear } from './components/StageClear';
import { GameHUD } from './components/GameHUD';
import { AppState, Upgrade, SquirrelCharacter, SaveSlot, StageDuration, Player } from './types';
import { SQUIRREL_CHARACTERS, BASE_UPGRADES_LIST } from './constants';
import { updateSlotStats } from './services/storageService';
import { loadAssets } from './services/assetService';
import { LoadingScreen } from './components/LoadingScreen';

// Error Boundary to catch crashes and avoid white screen of death
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  public state = { hasError: false, error: null as Error | null };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    // State initialization moved to property declaration
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-8 text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Ouch! The game crashed.</h1>
          <p className="text-gray-400 mb-4">Something went wrong in the nuts and bolts.</p>
          <pre className="bg-gray-800 p-4 rounded text-left overflow-auto max-w-full text-xs text-red-300 font-mono mb-6">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="bg-amber-600 hover:bg-amber-500 px-6 py-3 rounded font-bold"
          >
            Reload Game
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('LOADING');
  const [previousAppState, setPreviousAppState] = useState<AppState>('MENU');
  const [gameActive, setGameActive] = useState(false);
  
  const [hudStats, setHudStats] = useState({
      score: 0,
      kills: 0,
      nuts: 0,
      time: 0,
      wave: 1,
      player: undefined as Player | undefined
  });

  const [finalScore, setFinalScore] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [finalKills, setFinalKills] = useState(0);
  const [finalNuts, setFinalNuts] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  
  const [currentStage, setCurrentStage] = useState(1);
  const [runPlayer, setRunPlayer] = useState<Player | undefined>(undefined);
  
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);
  const [onUpgradeSelect, setOnUpgradeSelect] = useState<(u: Upgrade) => void>(() => {});
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [stageDuration, setStageDuration] = useState<StageDuration>('STANDARD');
  
  const [selectedCharacter, setSelectedCharacter] = useState<SquirrelCharacter>(SQUIRREL_CHARACTERS[0]);
  const [currentSlot, setCurrentSlot] = useState<SaveSlot | null>(null);
  const [effectiveCharacter, setEffectiveCharacter] = useState<SquirrelCharacter>(SQUIRREL_CHARACTERS[0]);

  useEffect(() => {
    // Force transition after a short timeout even if assets hang, to prevent stuck loading
    const timer = setTimeout(() => {
        setAppState(prev => prev === 'LOADING' ? 'SAVE_SELECT' : prev);
    }, 2000);

    loadAssets().then(() => {
      setAppState('SAVE_SELECT');
      clearTimeout(timer);
    }).catch(err => {
      console.error("Failed to load assets", err);
      setAppState('SAVE_SELECT');
    });
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!currentSlot) {
        setEffectiveCharacter(selectedCharacter);
        return;
    }
    const upgrades = currentSlot.permanentUpgrades || {};
    const char = { ...selectedCharacter };
    BASE_UPGRADES_LIST.forEach(def => {
        const level = upgrades[def.id] || 0;
        if (level > 0) {
            const totalBoost = level * def.increment;
            if (def.statKey === 'hp') char.hp += totalBoost;
            else if (def.statKey === 'speed') char.speed += totalBoost;
            else if (def.statKey === 'magnetRadius') char.magnetRadius = (char.magnetRadius || 150) + totalBoost;
            else if (def.statKey === 'maxCompanions') char.maxCompanions = (char.maxCompanions || 0) + totalBoost;
            else if (def.statKey === 'damage') char.damageBonus = (char.damageBonus || 0) + totalBoost;
            else if (def.statKey === 'cooldown') char.cooldownReduction = (char.cooldownReduction || 0) + totalBoost;
            else if (def.statKey === 'revive') char.revives = (char.revives || 0) + totalBoost;
            else if (def.statKey === 'ability') {
                if (char.activeAbility) {
                    char.activeAbility = { ...char.activeAbility };
                    char.activeAbility.cooldown = char.activeAbility.cooldown * (1 - totalBoost);
                    char.activeAbility.duration = char.activeAbility.duration * (1 + totalBoost);
                }
            }
        }
    });
    setEffectiveCharacter(char);
  }, [selectedCharacter, currentSlot]);

  const handleSlotSelect = (slot: SaveSlot) => {
    setCurrentSlot(slot);
    setAppState('MENU');
  };

  const startGame = () => {
    setGameActive(true);
    setAppState('GAME');
    setFinalScore(0);
    setFinalTime(0);
    setFinalKills(0);
    setFinalNuts(0);
    setGameWon(false);
    setCurrentStage(1);
    setRunPlayer(undefined); 
    setHudStats({ score: 0, kills: 0, nuts: 0, time: 0, wave: 1, player: undefined });
  };

  const quitGame = () => {
    setGameActive(false);
    setAppState('MENU');
    setRunPlayer(undefined);
    setCurrentStage(1);
  };

  const handleStageComplete = (player: Player, score: number, kills: number, nuts: number) => {
      setRunPlayer(player);
      setFinalScore(score);
      setFinalKills(kills);
      setFinalNuts(nuts);
      setGameActive(false); 
      setAppState('STAGE_CLEAR');
  };

  const continueToNextStage = () => {
      setCurrentStage(prev => prev + 1);
      setGameActive(true);
      setAppState('GAME');
  };

  const extractFromRun = () => {
      handleGameOver(finalScore, 180 * 60 * currentStage, finalKills, finalNuts, true);
  };

  const handleGameOver = (score: number, timeSurvived: number, kills: number, nuts: number, won: boolean) => {
    setGameActive(false);
    setFinalScore(score);
    setFinalTime(timeSurvived);
    setFinalKills(kills);
    setFinalNuts(nuts);
    setGameWon(won);
    setAppState('GAME_OVER');
    setRunPlayer(undefined);
    
    if (currentSlot) {
        const totalTime = (180 * 60 * (currentStage - 1)) + timeSurvived;
        const updated = updateSlotStats(currentSlot.id, {
            score,
            time: Math.floor(totalTime / 60),
            kills,
            wave: currentStage * 5,
            nuts
        });
        if (updated) setCurrentSlot(updated);
    }
  };

  const handleLevelUp = (upgrades: Upgrade[], selectCallback: (u: Upgrade) => void) => {
    setAvailableUpgrades(upgrades);
    setOnUpgradeSelect(() => selectCallback); 
    setAppState('LEVEL_UP');
  };

  const confirmUpgrade = (upgrade: Upgrade) => {
    onUpgradeSelect(upgrade);
    setAppState('GAME');
  };

  const togglePause = () => {
    setAppState(prev => prev === 'GAME' ? 'PAUSED' : 'GAME');
  };

  const openSettings = () => {
    setPreviousAppState(appState);
    setAppState('SETTINGS');
  };

  const closeSettings = () => {
    setAppState(previousAppState);
  };

  // Optimize stats update to avoid re-creating function every render
  const handleStatsUpdate = useCallback((stats: any) => {
      setHudStats(prev => ({...prev, ...stats}));
  }, []);
  
  return (
    <ErrorBoundary>
        <div className="w-screen h-screen relative bg-gray-900 overflow-hidden select-none font-sans">
        
        {/* GAME LAYER */}
        {gameActive && (
            <div className="absolute inset-0">
                {/* HUD OVERLAY - Only visible when playing */}
                {appState === 'GAME' && hudStats.player && (
                    <GameHUD 
                        player={hudStats.player}
                        score={hudStats.score}
                        kills={hudStats.kills}
                        nuts={hudStats.nuts}
                        time={hudStats.time}
                        wave={currentStage} // Using stage as wave
                        maxWaveTime={180 * 60}
                        onPause={togglePause}
                    />
                )}
                
                <GameCanvas 
                key={`stage-${currentStage}`} 
                onGameOver={handleGameOver} 
                onStageComplete={handleStageComplete}
                onLevelUp={handleLevelUp}
                paused={appState !== 'GAME'}
                character={effectiveCharacter} 
                initialPlayer={runPlayer} 
                stageNumber={currentStage}
                soundEnabled={soundEnabled}
                musicEnabled={musicEnabled}
                stageDuration={stageDuration}
                onTogglePause={togglePause}
                onStatsUpdate={handleStatsUpdate}
                />
            </div>
        )}
        
        {/* MENUS & SCREENS LAYER */}
        {appState !== 'GAME' && (
            <div className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center justify-center">
                <div className="pointer-events-auto w-full h-full">
                    {appState === 'LOADING' && <LoadingScreen />}
                    {appState === 'SAVE_SELECT' && <SaveSlots onSelect={handleSlotSelect} />}
                    {appState === 'MENU' && (
                        <MainMenu 
                        onStart={startGame} 
                        onSettings={openSettings} 
                        onBaseUpgrades={() => setAppState('BASE_UPGRADES')}
                        selectedCharacter={selectedCharacter}
                        onSelectCharacter={setSelectedCharacter}
                        currentSlot={currentSlot}
                        onSwitchSlot={() => setAppState('SAVE_SELECT')}
                        />
                    )}
                    {appState === 'BASE_UPGRADES' && currentSlot && (
                        <BaseUpgrades 
                            slot={currentSlot} 
                            onBack={() => setAppState('MENU')}
                            onUpdateSlot={setCurrentSlot}
                        />
                    )}
                    {appState === 'STAGE_CLEAR' && (
                        <StageClear 
                            stage={currentStage}
                            score={finalScore}
                            kills={finalKills}
                            nuts={finalNuts}
                            onContinue={continueToNextStage}
                            onExtract={extractFromRun}
                        />
                    )}
                    {appState === 'SETTINGS' && (
                        <SettingsMenu 
                        soundEnabled={soundEnabled} 
                        toggleSound={() => setSoundEnabled(!soundEnabled)}
                        musicEnabled={musicEnabled}
                        toggleMusic={() => setMusicEnabled(!musicEnabled)}
                        stageDuration={stageDuration}
                        setStageDuration={setStageDuration} 
                        onBack={closeSettings} 
                        />
                    )}
                    {appState === 'PAUSED' && (
                        <PauseMenu 
                            onResume={togglePause}
                            onSettings={openSettings}
                            onQuit={quitGame}
                        />
                    )}
                    {appState === 'LEVEL_UP' && (
                        <UpgradeMenu 
                        upgrades={availableUpgrades} 
                        onSelect={confirmUpgrade} 
                        />
                    )}
                    {appState === 'GAME_OVER' && (
                        <GameOver 
                        score={finalScore} 
                        timeSurvived={finalTime}
                        kills={finalKills}
                        nuts={finalNuts}
                        won={gameWon}
                        onRestart={startGame}
                        onMenu={() => setAppState('MENU')}
                        />
                    )}
                </div>
            </div>
        )}
        </div>
    </ErrorBoundary>
  );
};

export default App;
