
import React, { useEffect, useState } from 'react';
import { Play, Trophy, Settings as SettingsIcon, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { generateLore } from '../services/geminiService';
import { SQUIRREL_CHARACTERS } from '../constants';
import { SquirrelCharacter, SaveSlot } from '../types';

interface MainMenuProps {
  onStart: () => void;
  onSettings: () => void;
  selectedCharacter: SquirrelCharacter;
  onSelectCharacter: (char: SquirrelCharacter) => void;
  currentSlot: SaveSlot | null;
  onSwitchSlot: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, onSettings, selectedCharacter, onSelectCharacter, currentSlot, onSwitchSlot }) => {
  const [lore, setLore] = useState<string>("Loading arcane squirrel wisdom...");

  useEffect(() => {
    generateLore().then(setLore);
  }, []);

  return (
    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Flair */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute text-4xl animate-bounce" 
                style={{ 
                    top: `${Math.random() * 100}%`, 
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 5 + 2}s`
                }}>
                {Math.random() > 0.5 ? '🌰' : '🧟'}
            </div>
        ))}
      </div>
      
      {currentSlot && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-gray-800/80 p-2 px-4 rounded-full border border-gray-600 cursor-pointer hover:bg-gray-700 transition" onClick={onSwitchSlot}>
            <Save size={16} className="text-amber-400" />
            <span className="text-sm font-bold text-gray-200">{currentSlot.name}</span>
            <span className="text-xs text-gray-500 ml-2">Switch Slot</span>
        </div>
      )}

      <div className="z-10 text-center p-8 bg-gray-800/80 backdrop-blur rounded-2xl border border-gray-600 shadow-2xl max-w-5xl w-full flex flex-col md:flex-row gap-8 items-center mb-12">
        
        {/* Left: Title and Controls */}
        <div className="flex-1 flex flex-col items-center md:items-start">
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 mb-4 pixel-font drop-shadow-sm text-left leading-tight">
            SQUIRRELVIVOR<br/>NUTPOCOLYPSE
            </h1>
            
            {currentSlot && (
                <div className="flex gap-4 mb-4 text-sm w-full bg-gray-900/50 p-2 rounded border border-gray-700">
                    <div className="flex-1 flex flex-col items-center">
                        <span className="text-gray-400 text-xs">HIGH SCORE</span>
                        <span className="font-bold text-yellow-400">{currentSlot.stats.highestScore}</span>
                    </div>
                    <div className="w-px bg-gray-700"></div>
                    <div className="flex-1 flex flex-col items-center">
                        <span className="text-gray-400 text-xs">MAX WAVE</span>
                        <span className="font-bold text-blue-400">{currentSlot.stats.maxWaveReached}</span>
                    </div>
                </div>
            )}

            <div className="mb-6 italic text-gray-400 text-sm font-serif text-left min-h-[40px]">
                "{lore}"
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button 
                    onClick={onStart}
                    className="flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-4 px-8 rounded-lg transform transition hover:scale-105 shadow-lg text-xl"
                >
                    <Play fill="currentColor" /> START GAME
                </button>
                
                <button 
                    onClick={onSettings}
                    className="flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg transition text-lg"
                >
                    <SettingsIcon /> SETTINGS
                </button>
            </div>
            <div className="mt-4 text-gray-500 text-xs">
                WASD / Arrows to move.
            </div>
        </div>

        {/* Right: Character Select */}
        <div className="flex-1 w-full bg-gray-900/50 p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-bold text-amber-400 mb-4 pixel-font">CHOOSE YOUR SQUIRREL</h2>
            
            <div className="flex flex-col gap-4">
                <div className="flex justify-center gap-4">
                    {SQUIRREL_CHARACTERS.map(char => (
                        <button 
                            key={char.id}
                            onClick={() => onSelectCharacter(char)}
                            className={`relative p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 w-24
                                ${selectedCharacter.id === char.id 
                                    ? 'bg-gray-700 border-amber-500 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                                    : 'bg-gray-800 border-gray-600 hover:border-gray-400 opacity-70 hover:opacity-100'}`}
                        >
                            <div 
                                className="text-4xl filter drop-shadow-md transition-all" 
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
                <div className="bg-gray-800 p-4 rounded border border-gray-700 mt-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                        <span style={{ filter: selectedCharacter.filter }}>{selectedCharacter.emoji}</span> 
                        {selectedCharacter.name}
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">{selectedCharacter.description}</p>

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
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* Credits Footer */}
      <div className="absolute bottom-4 text-gray-500 text-xs font-mono text-center z-20 leading-relaxed">
          SQUIRRELVIVOR NUTPOCOLYPSE<br/>
          Authored by Racer The Squirrel, Dirt McGirt and Gemini<br/>
          <a href="https://randomly.wtf" target="_blank" rel="noreferrer" className="text-amber-600 hover:text-amber-400 transition">https://randomly.wtf</a>
      </div>
    </div>
  );
};
