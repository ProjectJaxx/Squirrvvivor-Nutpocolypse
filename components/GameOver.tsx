
import React, { useEffect, useState } from 'react';
import { RefreshCcw, Home, Skull, Trophy, Star } from 'lucide-react';
import { generateDeathMessage } from '../services/geminiService';

interface GameOverProps {
  score: number;
  timeSurvived: number;
  kills: number;
  nuts: number;
  won: boolean;
  onRestart: () => void;
  onMenu: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ score, timeSurvived, kills, nuts, won, onRestart, onMenu }) => {
  const [message, setMessage] = useState("Consulting the Nutty Oracle...");

  useEffect(() => {
    if (won) {
        setMessage("Victory! The park is safe... for now.");
    } else {
        generateDeathMessage(score, "Robo-Zombie").then(setMessage);
    }
  }, [score, won]);

  const minutes = Math.floor(timeSurvived / 60 / 60);
  const seconds = Math.floor((timeSurvived / 60) % 60);

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className={`bg-gray-900 border-4 ${won ? 'border-yellow-500' : 'border-red-800'} p-6 md:p-8 rounded-xl max-w-lg w-full text-center shadow-2xl`}>
        <h2 className={`text-4xl md:text-5xl font-bold ${won ? 'text-yellow-400' : 'text-red-500'} pixel-font mb-6`}>
            {won ? "STAGE CLEARED!" : "YOU DIED"}
        </h2>
        
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg mb-6 border border-gray-700">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-700 p-3 rounded">
                    <div className="text-[10px] md:text-xs text-gray-400">SCORE</div>
                    <div className="text-xl md:text-2xl text-amber-400 font-bold">{score}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                    <div className="text-[10px] md:text-xs text-gray-400">TIME</div>
                    <div className="text-lg md:text-xl text-white font-mono">{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded flex items-center justify-center gap-2">
                    <Skull className="text-red-500" size={18} />
                    <div className="text-lg md:text-xl text-white font-bold">{kills}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded flex items-center justify-center gap-2">
                    <span className="text-xl">🥜</span>
                    <div className="text-lg md:text-xl text-yellow-300 font-bold">+{nuts}</div>
                </div>
            </div>
            
            <div className="h-px bg-gray-700 w-full my-4"></div>
            
            <p className="text-amber-200 italic font-serif text-sm md:text-lg">
                "{message}"
            </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button 
                onClick={onMenu}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-white transition"
            >
                <Home size={20} /> MENU
            </button>
            <button 
                onClick={onRestart}
                className={`flex items-center justify-center gap-2 px-8 py-3 ${won ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} rounded-lg font-bold text-white transition shadow-lg`}
            >
                <RefreshCcw size={20} /> {won ? 'PLAY AGAIN' : 'TRY AGAIN'}
            </button>
        </div>
      </div>
    </div>
  );
};
