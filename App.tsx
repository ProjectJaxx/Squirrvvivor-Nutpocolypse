
import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { UpgradeMenu } from './components/UpgradeMenu';
import { GameOver } from './components/GameOver';
import { SettingsMenu } from './components/SettingsMenu';
import { SaveSlots } from './components/SaveSlots';
import { PauseMenu } from './components/PauseMenu';
import { AppState, Upgrade, SquirrelCharacter, SaveSlot, StageDuration } from './types';
import { SQUIRREL_CHARACTERS } from './constants';
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
  
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);
  const [onUpgradeSelect, setOnUpgradeSelect] = useState<(u: Upgrade) => void>(() => {});
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [stageDuration, setStageDuration] = useState<StageDuration>('STANDARD');
  
  const [selectedCharacter, setSelectedCharacter] = useState<SquirrelCharacter>(SQUIRREL_CHARACTERS[0]);
  const [currentSlot, setCurrentSlot] = useState<SaveSlot | null>(null);

  useEffect(() => {
    loadAssets().then(() => {
      setAppState('SAVE_SELECT');
    }).catch(err => {
      console.error("Failed to load assets", err);
      // Handle asset loading error, maybe show an error message
    });
  }, []);

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
  };

  const quitGame = () => {
    setGameActive(false);
    setAppState('MENU');
  };

  const handleGameOver = (score: number, timeSurvived: number, kills: number) => {
    setGameActive(false);
    setFinalScore(score);
    setFinalTime(timeSurvived);
    setFinalKills(kills);
    setAppState('GAME_OVER');
    
    if (currentSlot) {
        const estimatedWave = Math.floor(timeSurvived / (45 * 60)) + 1;
        const updated = updateSlotStats(currentSlot.id, {
            score,
            time: Math.floor(timeSurvived / 60),
            kills,
            wave: estimatedWave
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
              character={selectedCharacter}
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
          selectedCharacter={selectedCharacter}
          onSelectCharacter={setSelectedCharacter}
          currentSlot={currentSlot}
          onSwitchSlot={() => setAppState('SAVE_SELECT')}
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
          onRestart={startGame}
          onMenu={() => setAppState('MENU')}
        />
      )}
    </div>
  );
};

export default App;
