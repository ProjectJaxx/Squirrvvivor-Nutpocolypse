
import React, { useEffect } from 'react';
import { Play, Settings, Home } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onSettings: () => void;
  onQuit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onSettings, onQuit }) => {
  // Handle Escape to resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onResume();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResume]);

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-gray-800 border-2 border-amber-600/50 p-8 rounded-xl max-w-sm w-full text-center shadow-2xl">
        <h2 className="text-4xl font-bold text-white pixel-font mb-8 tracking-wider">PAUSED</h2>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={onResume}
            className="flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 px-6 rounded-lg transition transform hover:scale-105 shadow-lg"
          >
            <Play fill="currentColor" size={20} /> RESUME
          </button>
          
          <button 
            onClick={onSettings}
            className="flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg transition hover:bg-gray-600"
          >
            <Settings size={20} /> SETTINGS
          </button>

          <div className="h-px bg-gray-700 my-2"></div>

          <button 
            onClick={onQuit}
            className="flex items-center justify-center gap-3 bg-red-900/50 hover:bg-red-900/80 text-red-200 font-bold py-3 px-6 rounded-lg transition border border-red-900/50"
          >
            <Home size={20} /> QUIT TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};
