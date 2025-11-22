
import React, { useState } from 'react';
import { Upgrade } from '../types';
import { Sparkles } from 'lucide-react';

interface UpgradeMenuProps {
  upgrades: Upgrade[];
  onSelect: (upgrade: Upgrade) => void;
}

export const UpgradeMenu: React.FC<UpgradeMenuProps> = ({ upgrades, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  if (!upgrades || upgrades.length === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-4">
            <div className="text-white text-center">
                <h2 className="text-2xl font-bold mb-2">LEVEL UP!</h2>
                <p className="text-gray-400 mb-4">No upgrades available...</p>
                <button 
                    onClick={() => onSelect({ id: 'EMPTY', name: 'Empty', description: '', rarity: 'COMMON', icon: '', apply: () => {} })}
                    className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
                >
                    Continue
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
      <div className="bg-gray-800 border-4 border-amber-600 rounded-lg p-4 md:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto transform transition-all scale-100">
        <div className="text-center mb-4 md:mb-8 flex flex-col items-center">
            {!imgError ? (
                <img 
                    src="/public/assets/graphics/logo.png" 
                    alt="Level Up" 
                    onError={() => setImgError(true)}
                    className="w-16 h-16 mb-2 object-contain drop-shadow-lg animate-pulse" 
                />
            ) : (
                <div className="text-4xl mb-2">🌰</div>
            )}
            <h2 className="text-3xl md:text-4xl font-bold text-amber-400 pixel-font mb-2">LEVEL UP!</h2>
            <p className="text-gray-400 text-sm">Choose your destiny, squirrel.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upgrades.map((upgrade, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(upgrade)}
              className="group relative bg-gray-700 hover:bg-gray-600 border-2 border-gray-600 hover:border-amber-400 rounded-xl p-4 md:p-6 flex flex-row md:flex-col items-center text-left md:text-center transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-amber-900/20"
            >
              <div className="text-4xl md:text-6xl mr-4 md:mr-0 md:mb-4 group-hover:scale-110 transition-transform duration-200 shrink-0">{upgrade.icon}</div>
              
              <div className="flex flex-col flex-1 w-full">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-1">{upgrade.name}</h3>
                  <p className="text-xs md:text-sm text-gray-300 mb-2 leading-tight">{upgrade.description}</p>
                  
                  <div className={`mt-auto self-start md:self-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider 
                    ${upgrade.rarity === 'LEGENDARY' ? 'bg-purple-900 text-purple-200' : 
                      upgrade.rarity === 'EPIC' ? 'bg-pink-900 text-pink-200' :
                      upgrade.rarity === 'RARE' ? 'bg-blue-900 text-blue-200' : 'bg-gray-600 text-gray-200'}`}>
                    {upgrade.rarity}
                  </div>
              </div>
              
              <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Sparkles className="text-amber-400 w-6 h-6 animate-spin-slow" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
