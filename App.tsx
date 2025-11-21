
import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { UpgradeMenu } from './components/UpgradeMenu';
import { GameOver } from './components/GameOver';
import { SettingsMenu } from './components/SettingsMenu';
import { SaveSlots } from './components/SaveSlots';
import { PauseMenu } from './components/PauseMenu';
import { BaseUpgrades } from './components/BaseUpgrades';
import { AppState, Upgrade, SquirrelCharacter, SaveSlot, StageDuration } from './types';
import { SQUIRREL_CHARACTERS, BASE_UPGRADES_LIST } from './constants';
import { updateSlotStats } from './services/storageService';
import { loadAssets } from './services/assetService';
import { LoadingScreen } from './components/LoadingScreen';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('LOADING');
  
  // Track previous state for returning from Settings
  const [previousAppState, setPreviousAppState] = useState<AppState>('MENU');
  
  // Keep game mounted but hidden/paused when navigating menus during a run
  const [gameActive, setGameActive] = useState(false);

  const [finalScore, setFinalScore] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [finalKills, setFinalKills] = useState(0);
  const [finalNuts, setFinalNuts] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);
  const [onUpgradeSelect, setOnUpgradeSelect] = useState<(u: Upgrade) => void>(() => {});
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [stageDuration, setStageDuration] = useState<StageDuration>('STANDARD');
  
  const [selectedCharacter, setSelectedCharacter] = useState<SquirrelCharacter>(SQUIRREL_CHARACTERS[0]);
  const [currentSlot, setCurrentSlot] = useState<SaveSlot | null>(null);
  const [effectiveCharacter, setEffectiveCharacter] = useState<SquirrelCharacter>(SQUIRREL_CHARACTERS[0]);

  useEffect(() => {
    loadAssets().then(() => {
      setAppState('SAVE_SELECT');
    }).catch(err => {
      console.error("Failed to load assets", err);
    });
  }, []);

  // Apply permanent upgrades to selected character whenever slot or char changes
  useEffect(() => {
    if (!currentSlot) {
        setEffectiveCharacter(selectedCharacter);
        return;
    }

    const upgrades = currentSlot.permanentUpgrades || {};
    const char = { ...selectedCharacter };

    // Iterate through base upgrades config and apply modifiers
    BASE_UPGRADES_LIST.forEach(def => {
        const level = upgrades[def.id] || 0;
        if (level > 0) {
            const totalBoost = level * def.increment;
            
            if (def.statKey === 'hp') {
                char.hp += totalBoost;
            } else if (def.statKey === 'speed') {
                char.speed += totalBoost;
            } else if (def.statKey === 'magnetRadius') {
                // Base magnet radius is defined in constants (150), but stored on player state usually.
                // We'll pass it via character prop to init.
                char.magnetRadius = (char.magnetRadius || 150) + totalBoost;
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
  };

  const quitGame = () => {
    setGameActive(false);
    setAppState('MENU');
  };

  const handleGameOver = (score: number, timeSurvived: number, kills: number, nuts: number, won: boolean) => {
    setGameActive(false);
    setFinalScore(score);
    setFinalTime(timeSurvived);
    setFinalKills(kills);
    setFinalNuts(nuts);
    setGameWon(won);
    setAppState('GAME_OVER');
    
    if (currentSlot) {
        const estimatedWave = Math.floor(timeSurvived / 60) + 1; // approx
        const updated = updateSlotStats(currentSlot.id, {
            score,
            time: Math.floor(timeSurvived / 60),
            kills,
            wave: estimatedWave,
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

  return (
    <div className="w-screen h-screen relative bg-gray-900 overflow-hidden">
      {/* Game Canvas persists in background if gameActive is true */}
      {gameActive && (
        <div className={appState === 'SETTINGS' ? 'hidden' : ''}>
            <GameCanvas 
              onGameOver={handleGameOver} 
              onLevelUp={handleLevelUp}
              paused={appState !== 'GAME'}
              character={effectiveCharacter} // Use modified character with perm upgrades
              soundEnabled={soundEnabled}
              musicEnabled={musicEnabled}
              stageDuration={stageDuration}
              onTogglePause={togglePause}
            />
        </div>
      )}
      
      {appState === 'LOADING' && (
        <LoadingScreen />
      )}

      {appState === 'SAVE_SELECT' && (
        <SaveSlots onSelect={handleSlotSelect} />
      )}

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
  );
};

export default App;
