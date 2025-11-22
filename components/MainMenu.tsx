
import React, { useEffect, useState } from 'react';
import { Play, Settings as SettingsIcon, Save, Palette, Hammer, Zap } from 'lucide-react';
import { generateLore } from '../services/geminiService';
import { SQUIRREL_CHARACTERS } from '../constants';
import { SquirrelCharacter, SaveSlot } from '../types';

interface MainMenuProps {
  onStart: () => void;
  onSettings: () => void;
  onBaseUpgrades: () => void;
  selectedCharacter: SquirrelCharacter;
  onSelectCharacter: (char: SquirrelCharacter) => void;
  currentSlot: SaveSlot | null;
  onSwitchSlot: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, onSettings, onBaseUpgrades, selectedCharacter, onSelectCharacter, currentSlot, onSwitchSlot }) => {
  const [lore, setLore] = useState<string>("Loading arcane squirrel wisdom...");
  const [logoError, setLogoError] = useState(false);
  const [bgError, setBgError] = useState(false);

  useEffect(() => {
    generateLore().then(setLore);
  }, []);

  return (
    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background - Single large logo image */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
         {!bgError && (
             <img 
                src="./public/assets/graphics/logo.png"
                alt=""
                onError={() => setBgError(true)}
                className="w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] object-contain animate-pulse" 
                style={{ animationDuration: '8s' }}
             />
         )}
      </div>
      
      {currentSlot && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800/80 p-2 px-4 rounded-full border border-gray-600 cursor-pointer hover:bg-gray-700 transition" onClick={onSwitchSlot}>
                <Save size={16} className="text-amber-400" />
                <span className="text-sm font-bold text-gray-200">{currentSlot.name}</span>
                <span className="text-xs text-gray-500 ml-2">Switch</span>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-800/80 p-2 px-4 rounded-full border border-yellow-600/50">
                <span className="text-lg">🥜</span>
                <span className="text-sm font-bold text-yellow-400">{currentSlot.stats.totalNuts || 0}</span>
            </div>
        </div>
      )}

      <div className="z-10 text-center p-4 md:p-8 bg-gray-800/80 backdrop-blur rounded-2xl border border-gray-600 shadow-2xl max-w-6xl w-full flex flex-col md:flex-row gap-4 md:gap-8 items-stretch mb-8 md:mb-12 max-h-[95vh] overflow-y-auto md:overflow-visible">
        
        {/* Left: Title and Controls */}
        <div className="flex-1 flex flex-col items-center md:items-start w-full">
            {!logoError ? (
                <img 
                    src="./public/assets/graphics/logotrans.png" 
                    alt="SQUIRRELVIVOR NUTPOCOLYPSE" 
                    onError={() => setLogoError(true)}
                    className="w-full max-w-xs md:max-w-sm mx-auto md:mx-0 mb-6 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                />
            ) : (
                <div className="mb-6 text-center md:text-left">
                    <h1 className="text-4xl md:text-6xl font-bold text-amber-500 pixel-font leading-tight">
                        SQUIRREL<span className="text-white">VIVOR</span>
                    </h1>
                    <h2 className="text-xl md:text-2xl font-bold text-red-500 tracking-widest">NUTPOCOLYPSE</h2>
                </div>
            )}

            {currentSlot && (
                <div className="flex gap-4 mb-4 text-sm w-full bg-gray-900/50 p-2 rounded border border-gray-700 justify-center md:justify-start">
                    <div className="flex flex-col items-center px-2">
                        <span className="text-gray-400 text-[10px]">HIGH SCORE</span>
                        <span className="font-bold text-yellow-400">{currentSlot.stats.highestScore}</span>
                    </div>
                    <div className="w-px bg-gray-700"></div>
                    <div className="flex flex-col items-center px-2">
                        <span className="text-gray-400 text-[10px]">MAX WAVE</span>
                        <span className="font-bold text-blue-400">{currentSlot.stats.maxWaveReached}</span>
                    </div>
                </div>
            )}

            <div className="mb-4 md:mb-6 italic text-gray-400 text-xs md:text-sm font-serif text-center md:text-left min-h-[30px]">
                "{lore}"
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto md:mx-0 mt-auto">
                <button 
                    onClick={onStart}
                    className="col-span-2 flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-3 md:py-4 px-8 rounded-lg transform transition hover:scale-105 shadow-lg text-lg md:text-xl"
                >
                    <Play fill="currentColor" /> START GAME
                </button>
                
                <button 
                    onClick={onBaseUpgrades}
                    className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-yellow-400 font-bold py-3 px-6 rounded-lg transition text-sm md:text-base border border-yellow-600/30"
                >
                    <Hammer size={18} /> UPGRADES
                </button>

                <button 
                    onClick={onSettings}
                    className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg transition text-sm md:text-base"
                >
                    <SettingsIcon size={18} /> SETTINGS
                </button>
            </div>
        </div>

        {/* Right: Character Select */}
        <div className="flex-1 w-full bg-gray-900/50 p-4 md:p-6 rounded-xl border border-gray-700 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-bold text-amber-400 pixel-font">CHOOSE SQUIRREL</h2>
            </div>
            
            <div className="flex justify-center md:justify-start gap-2 md:gap-4 overflow-x-auto pb-2">
                {SQUIRREL_CHARACTERS.map(char => (
                    <button 
                        key={char.id}
                        onClick={() => onSelectCharacter(char)}
                        className={`relative p-3 md:p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 min-w-[80px] w-24
                            ${selectedCharacter.id === char.id 
                                ? 'bg-gray-700 border-amber-500 scale-105 md:scale-110 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                                : 'bg-gray-800 border-gray-600 hover:border-gray-400 opacity-70 hover:opacity-100'}`}
                    >
                        <div 
                            className="text-3xl md:text-4xl filter drop-shadow-md transition-all" 
                            style={{ filter: char.filter }}
                        >
                            {char.emoji}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-300">
                            {char.name.split(' ')[0]}
                        </div>
                    </button>
                ))}
            </div>

            {/* Selected Stats */}
            <div className="bg-gray-800 p-3 md:p-4 rounded border border-gray-700 mt-2 flex-1">
                <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2 mb-1">
                    <span style={{ filter: selectedCharacter.filter }}>{selectedCharacter.emoji}</span> 
                    {selectedCharacter.name}
                </h3>
                <p className="text-xs text-gray-400 mb-4 leading-tight">{selectedCharacter.description}</p>

                <div className="space-y-2">
                    <div>
                        <div className="flex justify-between text-xs text-gray-300 mb-1">
                            <span>HEALTH</span>
                            <span>{selectedCharacter.hp} HP</span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-red-500 h-full" 
                                style={{ width: `${(selectedCharacter.hp / 160) * 100}%` }}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-gray-300 mb-1">
                            <span>SPEED</span>
                            <span>{selectedCharacter.speed}</span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-blue-500 h-full" 
                                style={{ width: `${(selectedCharacter.speed / 6) * 100}%` }}
                            />
                        </div>
                    </div>
                    
                    {/* Active Ability Display */}
                    {selectedCharacter.activeAbility && (
                        <div className="mt-4 pt-2 border-t border-gray-700">
                            <div className="flex items-center gap-2 text-xs text-yellow-400 mb-1">
                                <Zap size={12} />
                                <span className="font-bold uppercase">{selectedCharacter.activeAbility.name}</span>
                            </div>
                            <div className="text-[10px] text-gray-400">
                                Cooldown: {Math.round(selectedCharacter.activeAbility.cooldown / 60)}s | Duration: {Math.round(selectedCharacter.activeAbility.duration / 60)}s
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>

      {/* Credits Footer */}
      <div className="absolute bottom-2 md:bottom-4 text-gray-500 text-[10px] md:text-xs font-mono text-center z-20 leading-relaxed px-4">
          SQUIRRELVIVOR NUTPOCOLYPSE | By Racer The Squirrel, Dirt McGirt and Gemini
      </div>
    </div>
  );
};
