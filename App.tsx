

import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { UpgradeMenu } from './components/UpgradeMenu';
import { GameOver } from './components/GameOver';
import { SettingsMenu } from './components/SettingsMenu';
import { SaveSlots } from './components/SaveSlots';
import { PauseMenu } from './components/PauseMenu';
import { BaseUpgrades } from './components/BaseUpgrades';
import { StageClear } from './components/StageClear';
import { AppState, Upgrade, SquirrelCharacter, SaveSlot, StageDuration, Player } from './types';
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
  
  // Staging Logic
  const [currentStage, setCurrentStage] = useState(1);
  const [runPlayer, setRunPlayer] = useState<Player | undefined>(undefined);
  
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
                char.magnetRadius = (char.magnetRadius || 150) + totalBoost;
            } else if (def.statKey === 'maxCompanions') {
                char.maxCompanions = (char.maxCompanions || 0) + totalBoost;
            } else if (def.statKey === 'damage') {
                char.damageBonus = (char.damageBonus || 0) + totalBoost;
            } else if (def.statKey === 'cooldown') {
                char.cooldownReduction = (char.cooldownReduction || 0) + totalBoost;
            } else if (def.statKey === 'revive') {
                char.revives = (char.revives || 0) + totalBoost;
            } else if (def.statKey === 'ability') {
                if (char.activeAbility) {
                    char.activeAbility = { ...char.activeAbility };
                    // Reduce cooldown by X%, Increase Duration by X%
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
    
    // Reset run stats
    setFinalScore(0);
    setFinalTime(0);
    setFinalKills(0);
    setFinalNuts(0);
    setGameWon(false);
    setCurrentStage(1);
    setRunPlayer(undefined); // Start fresh
  };

  const quitGame = () => {
    setGameActive(false);
    setAppState('MENU');
    setRunPlayer(undefined);
    setCurrentStage(1);
  };

  const handleStageComplete = (player: Player, score: number, kills: number, nuts: number) => {
      setRunPlayer(player); // Save player state
      setFinalScore(score);
      setFinalKills(kills);
      setFinalNuts(nuts);
      // Unmount game temporarily to show stage clear screen
      setGameActive(false); 
      setAppState('STAGE_CLEAR');
  };

  const continueToNextStage = () => {
      setCurrentStage(prev => prev + 1);
      setGameActive(true); // Re-mount GameCanvas with new stage prop and initialPlayer
      setAppState('GAME');
  };

  const extractFromRun = () => {
      // Treat as a win, save stats
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
        // Accumulate total time across stages roughly
        const totalTime = (180 * 60 * (currentStage - 1)) + timeSurvived;
        const estimatedWave = Math.floor(totalTime / 60) + 1; 
        const updated = updateSlotStats(currentSlot.id, {
            score,
            time: Math.floor(totalTime / 60),
            kills,
            wave: currentStage * 5, // Approximate deep wave count
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
              key={`stage-${currentStage}`} // Force remount on stage change to init state properly
              onGameOver={handleGameOver} 
              onStageComplete={handleStageComplete}
              onLevelUp={handleLevelUp}
              paused={appState !== 'GAME'}
              character={effectiveCharacter} // Used for base visual init
              initialPlayer={runPlayer} // Used for stats hydration on stage 2+
              stageNumber={currentStage}
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
  );
};

export default App;
