import React from 'react';
import { ArrowLeft, Volume2, VolumeX, Music, Music2, Timer } from 'lucide-react';
import { SettingsMenuProps, StageDuration } from '../types';

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ 
    soundEnabled, toggleSound, 
    musicEnabled, toggleMusic,
    stageDuration, setStageDuration,
    onBack 
}) => {
  const durationOptions: StageDuration[] = ['STANDARD', 'LONG', 'EPIC'];

  return (
    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 bg-opacity-95 backdrop-blur-sm">
      <div className="bg-gray-800 p-8 rounded-2xl border border-amber-600/30 shadow-2xl max-w-md w-full text-center animate-in fade-in zoom-in duration-200">
        <h2 className="text-4xl font-bold text-amber-400 pixel-font mb-8">SETTINGS</h2>
        
        <div className="space-y-4 mb-8">
            {/* SFX Toggle */}
            <div className="flex items-center justify-between bg-gray-700/50 p-4 rounded-xl border border-gray-600">
              <div className="flex flex-col items-start text-left">
                <span className="text-lg text-gray-100 font-bold">Sound Effects</span>
                <span className="text-xs text-gray-400">Combat sounds</span>
              </div>
              
              <button 
                onClick={toggleSound}
                className={`p-3 rounded-full transition-all duration-200 transform hover:scale-110 ${soundEnabled ? 'bg-green-600 text-white shadow-lg shadow-green-900/30' : 'bg-red-600 text-gray-200 shadow-lg shadow-red-900/30'}`}
              >
                {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
            </div>

            {/* Music Toggle */}
            <div className="flex items-center justify-between bg-gray-700/50 p-4 rounded-xl border border-gray-600">
              <div className="flex flex-col items-start text-left">
                <span className="text-lg text-gray-100 font-bold">Music</span>
                <span className="text-xs text-gray-400">Procedural beats</span>
              </div>
              
              <button 
                onClick={toggleMusic}
                className={`p-3 rounded-full transition-all duration-200 transform hover:scale-110 ${musicEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'bg-gray-600 text-gray-400 shadow-lg'}`}
              >
                {musicEnabled ? <Music2 size={24} /> : <Music size={24} />}
              </button>
            </div>

            {/* Stage Duration */}
            <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
              <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-lg text-gray-100 font-bold">
                    <Timer size={20} />
                    <span>Run Duration</span>
                  </div>
              </div>
              <div className="flex justify-between gap-2">
                {durationOptions.map(opt => (
                  <button 
                    key={opt}
                    onClick={() => setStageDuration(opt)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      stageDuration === opt 
                      ? 'bg-amber-600 text-white shadow-md' 
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
        </div>

        <button 
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full bg-gray-700 hover:bg-gray-600 border border-gray-500 text-white font-bold py-4 px-6 rounded-xl transition transform hover:-translate-y-0.5"
        >
          <ArrowLeft size={20} /> BACK
        </button>
      </div>
    </div>
  );
};
