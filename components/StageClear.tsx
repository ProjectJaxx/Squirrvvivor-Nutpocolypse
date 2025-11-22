
import React from 'react';
import { ArrowRight, Home, Trophy, Shield, Skull } from 'lucide-react';

interface StageClearProps {
  stage: number;
  score: number;
  kills: number;
  nuts: number;
  onContinue: () => void;
  onExtract: () => void;
}

export const StageClear: React.FC<StageClearProps> = ({ stage, score, kills, nuts, onContinue, onExtract }) => {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border-4 border-green-500 p-6 md:p-8 rounded-xl max-w-lg w-full text-center shadow-2xl animate-in zoom-in duration-300">
        <h2 className="text-4xl md:text-5xl font-bold text-green-400 pixel-font mb-2">STAGE CLEARED!</h2>
        <p className="text-gray-400 mb-6">The area is secure... for now.</p>
        
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg mb-6 border border-gray-700">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-700 p-3 rounded">
                    <div className="text-[10px] md:text-xs text-gray-400">STAGE</div>
                    <div className="text-xl md:text-2xl text-white font-bold">{stage}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                    <div className="text-[10px] md:text-xs text-gray-400">NUTS COLLECTED</div>
                    <div className="text-lg md:text-xl text-yellow-400 font-bold">+{nuts}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded flex items-center justify-center gap-2">
                    <Skull className="text-red-500" size={18} />
                    <div className="text-lg md:text-xl text-white font-bold">{kills}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded flex items-center justify-center gap-2">
                    <Trophy className="text-yellow-500" size={18} />
                    <div className="text-lg md:text-xl text-white font-bold">{score}</div>
                </div>
            </div>
            
            <div className="bg-red-900/30 border border-red-900/50 p-3 rounded text-left">
                <h4 className="text-red-400 font-bold text-sm mb-1 flex items-center gap-2">
                    <Shield size={14} /> NEXT STAGE WARNING
                </h4>
                <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Enemy HP: +50%</li>
                    <li>• Enemy Damage: +20%</li>
                    <li>• New Hazards Detected</li>
                </ul>
            </div>
        </div>

        <div className="flex flex-col gap-3">
            <button 
                onClick={onContinue}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white transition shadow-lg transform hover:scale-105"
            >
                <ArrowRight size={24} /> CONTINUE TO STAGE {stage + 1}
            </button>
            
            <button 
                onClick={onExtract}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-gray-300 transition border border-gray-600"
            >
                <Home size={18} /> EXTRACT (SAVE & QUIT)
            </button>
        </div>
      </div>
    </div>
  );
};
