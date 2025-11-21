
import React, { useEffect, useState } from 'react';
import { Play, Trophy, Settings as SettingsIcon, ChevronLeft, ChevronRight, Save, Palette, Upload, Wand2, Loader } from 'lucide-react';
import { generateLore, generateCharacterSprite } from '../services/geminiService';
import { SQUIRREL_CHARACTERS } from '../constants';
import { setPlayerSkin, assets } from '../services/assetService';
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
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [customSkinUrl, setCustomSkinUrl] = useState<string | null>(null);

  useEffect(() => {
    generateLore().then(setLore);
    // Check if a custom skin is already loaded
    if (assets.PLAYER_SKIN) {
        setCustomSkinUrl(assets.PLAYER_SKIN.src);
    }
  }, []);

  const handleGenerateSkin = async () => {
      if (!genPrompt) return;
      setIsGenerating(true);
      const base64 = await generateCharacterSprite(genPrompt);
      if (base64) {
          await setPlayerSkin(base64);
          setCustomSkinUrl(base64);
      }
      setIsGenerating(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
              if (ev.target?.result) {
                  const res = ev.target.result as string;
                  await setPlayerSkin(res);
                  setCustomSkinUrl(res);
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const clearCustomSkin = () => {
      delete assets['PLAYER_SKIN'];
      setCustomSkinUrl(null);
  };

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
            <span className="text-xs text-gray-500 ml-2">Switch</span>
        </div>
      )}

      <div className="z-10 text-center p-4 md:p-8 bg-gray-800/80 backdrop-blur rounded-2xl border border-gray-600 shadow-2xl max-w-6xl w-full flex flex-col md:flex-row gap-4 md:gap-8 items-stretch mb-8 md:mb-12 max-h-[95vh] overflow-y-auto md:overflow-visible">
        
        {/* Left: Title and Controls */}
        <div className="flex-1 flex flex-col items-center md:items-start w-full">
            <h1 className="text-3xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 mb-4 pixel-font drop-shadow-sm text-center md:text-left leading-tight">
            SQUIRRELVIVOR<br/>NUTPOCOLYPSE
            </h1>
            
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

            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto md:mx-0 mt-auto">
                <button 
                    onClick={onStart}
                    className="flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-3 md:py-4 px-8 rounded-lg transform transition hover:scale-105 shadow-lg text-lg md:text-xl"
                >
                    <Play fill="currentColor" /> START GAME
                </button>
                
                <button 
                    onClick={onSettings}
                    className="flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg transition text-base md:text-lg"
                >
                    <SettingsIcon /> SETTINGS
                </button>
            </div>
            <div className="mt-4 text-gray-500 text-xs hidden md:block">
                WASD / Arrows to move.
            </div>
        </div>

        {/* Right: Character Select & Workshop */}
        <div className="flex-1 w-full bg-gray-900/50 p-4 md:p-6 rounded-xl border border-gray-700 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-bold text-amber-400 pixel-font">{showWorkshop ? 'SKIN WORKSHOP' : 'CHOOSE SQUIRREL'}</h2>
                <button onClick={() => setShowWorkshop(!showWorkshop)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded flex items-center gap-1">
                    <Palette size={12} /> {showWorkshop ? 'Back' : 'Workshop'}
                </button>
            </div>
            
            {showWorkshop ? (
                <div className="flex flex-col gap-4 h-full">
                    <div className="bg-gray-800 p-4 rounded border border-gray-600 flex-1 flex flex-col items-center justify-center min-h-[150px]">
                        {isGenerating ? (
                            <div className="flex flex-col items-center text-amber-400">
                                <Loader className="animate-spin mb-2" size={32} />
                                <span className="text-xs">Generating Pixels...</span>
                            </div>
                        ) : customSkinUrl ? (
                            <div className="relative group">
                                <img src={customSkinUrl} alt="Custom Skin" className="w-40 h-8 object-contain pixelated bg-gray-700 rounded" style={{imageRendering: 'pixelated'}} />
                                <button onClick={clearCustomSkin} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg">X</button>
                                <div className="mt-2 text-xs text-center text-green-400">Active Skin Loaded</div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 text-xs">
                                No custom skin loaded.<br/>Using default character sprite.
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">AI Generation Prompt</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={genPrompt}
                                    onChange={(e) => setGenPrompt(e.target.value)}
                                    placeholder="e.g. Cyborg squirrel with laser eye"
                                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm text-white focus:border-amber-500 outline-none"
                                />
                                <button 
                                    onClick={handleGenerateSkin}
                                    disabled={isGenerating || !genPrompt}
                                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white p-2 rounded"
                                >
                                    <Wand2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="text-center text-xs text-gray-500">- OR -</div>

                        <label className="flex items-center justify-center gap-2 w-full bg-gray-700 hover:bg-gray-600 cursor-pointer text-white py-2 rounded text-sm transition">
                            <Upload size={16} /> Upload 160x32 PNG
                            <input type="file" accept="image/png" onChange={handleFileUpload} className="hidden" />
                        </label>
                        
                        <div className="text-[10px] text-gray-500 text-center">
                            Requires 160x32px PNG. 5-Frame Horizontal Strip.<br/>
                            (Idle, Run, Run, Run, Idle)
                        </div>
                    </div>
                </div>
            ) : (
                <>
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
                                    style={{ filter: customSkinUrl ? 'none' : char.filter }}
                                >
                                    {customSkinUrl ? '🎨' : char.emoji}
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
                            <span style={{ filter: customSkinUrl ? 'none' : selectedCharacter.filter }}>{customSkinUrl ? '🎨' : selectedCharacter.emoji}</span> 
                            {selectedCharacter.name}
                        </h3>
                        <p className="text-xs text-gray-400 mb-4 leading-tight">{selectedCharacter.description}</p>
                        
                        {customSkinUrl && (
                            <div className="mb-4 bg-purple-900/30 border border-purple-500/30 p-2 rounded text-xs text-purple-200 flex items-center gap-2">
                                <Palette size={12} /> Custom Skin Active
                            </div>
                        )}

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
                </>
            )}
        </div>

      </div>

      {/* Credits Footer */}
      <div className="absolute bottom-2 md:bottom-4 text-gray-500 text-[10px] md:text-xs font-mono text-center z-20 leading-relaxed px-4">
          SQUIRRELVIVOR NUTPOCOLYPSE | By Racer The Squirrel, Dirt McGirt and Gemini
      </div>
    </div>
  );
};
