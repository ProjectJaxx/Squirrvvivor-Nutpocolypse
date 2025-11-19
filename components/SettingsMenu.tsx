
import React from 'react';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';

interface SettingsMenuProps {
  soundEnabled: boolean;
  toggleSound: () => void;
  onBack: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ soundEnabled, toggleSound, onBack }) => {
  return (
    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 bg-opacity-95 backdrop-blur-sm">
      <div className="bg-gray-800 p-8 rounded-2xl border border-amber-600/30 shadow-2xl max-w-md w-full text-center animate-in fade-in zoom-in duration-200">
        <h2 className="text-4xl font-bold text-amber-400 pixel-font mb-8">SETTINGS</h2>
        
        <div className="flex items-center justify-between bg-gray-700/50 p-6 rounded-xl mb-8 border border-gray-600">
          <div className="flex flex-col items-start">
            <span className="text-xl text-gray-100 font-bold">Sound Effects</span>
            <span className="text-sm text-gray-400">Toggle game audio</span>
          </div>
          
          <button 
            onClick={toggleSound}
            className={`p-4 rounded-full transition-all duration-200 transform hover:scale-110 ${soundEnabled ? 'bg-green-600 text-white shadow-lg shadow-green-900/30' : 'bg-red-600 text-gray-200 shadow-lg shadow-red-900/30'}`}
          >
            {soundEnabled ? <Volume2 size={28} /> : <VolumeX size={28} />}
          </button>
        </div>

        <button 
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full bg-gray-700 hover:bg-gray-600 border border-gray-500 text-white font-bold py-4 px-6 rounded-xl transition transform hover:-translate-y-0.5"
        >
          <ArrowLeft size={20} /> BACK TO MENU
        </button>
      </div>
    </div>
  );
};
