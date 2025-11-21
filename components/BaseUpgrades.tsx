
import React, { useState } from 'react';
import { SaveSlot } from '../types';
import { BASE_UPGRADES_LIST } from '../constants';
import { purchaseUpgrade } from '../services/storageService';
import { ArrowLeft, Hammer, Coins } from 'lucide-react';

interface BaseUpgradesProps {
    slot: SaveSlot;
    onBack: () => void;
    onUpdateSlot: (s: SaveSlot) => void;
}

export const BaseUpgrades: React.FC<BaseUpgradesProps> = ({ slot, onBack, onUpdateSlot }) => {
    const [purchasingId, setPurchasingId] = useState<string | null>(null);

    const handleBuy = (upgradeId: string) => {
        setPurchasingId(upgradeId);
        setTimeout(() => {
            const updatedSlot = purchaseUpgrade(slot.id, upgradeId);
            if (updatedSlot) {
                onUpdateSlot(updatedSlot);
            }
            setPurchasingId(null);
        }, 200); // Fake delay for effect
    };

    const calculateCost = (baseCost: number, multiplier: number, level: number) => {
        let cost = baseCost;
        for(let i=0; i<level; i++) {
            cost = Math.floor(cost * multiplier);
        }
        return cost;
    };

    return (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 overflow-hidden">
            {/* Header with Nuts Display */}
            <div className="w-full max-w-4xl p-6 flex items-center justify-between z-10">
                <button onClick={onBack} className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full border border-gray-600">
                    <ArrowLeft />
                </button>
                
                <div className="flex items-center gap-3 bg-gray-800 px-6 py-3 rounded-full border border-yellow-600 shadow-lg">
                    <span className="text-2xl">🥜</span>
                    <span className="text-2xl font-bold text-yellow-400">{slot.stats.totalNuts || 0}</span>
                </div>
            </div>

            <div className="flex-1 w-full max-w-4xl overflow-y-auto p-6 pb-20">
                <h1 className="text-3xl md:text-4xl font-bold text-center text-white mb-2 pixel-font">BASE UPGRADES</h1>
                <p className="text-center text-gray-400 mb-8">Spend nuts to permanently boost your squirrel.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {BASE_UPGRADES_LIST.map(def => {
                        const currentLevel = slot.permanentUpgrades[def.id] || 0;
                        const isMaxed = currentLevel >= def.maxLevel;
                        const cost = calculateCost(def.baseCost, def.costMultiplier, currentLevel);
                        const canAfford = (slot.stats.totalNuts || 0) >= cost;

                        return (
                            <div key={def.id} className={`bg-gray-800 border ${isMaxed ? 'border-yellow-500' : 'border-gray-600'} p-6 rounded-xl flex flex-col md:flex-row gap-4 items-center md:items-stretch relative overflow-hidden`}>
                                {isMaxed && (
                                    <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded">MAXED</div>
                                )}
                                
                                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-3xl shrink-0">
                                    {def.icon}
                                </div>

                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-xl font-bold text-white">{def.name}</h3>
                                    <p className="text-sm text-gray-400 mb-3">{def.description}</p>
                                    
                                    <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                                        {[...Array(def.maxLevel)].map((_, i) => (
                                            <div key={i} className={`h-2 w-full max-w-[20px] rounded-sm ${i < currentLevel ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                                        ))}
                                        <span className="text-xs text-gray-500 ml-2">Lvl {currentLevel}/{def.maxLevel}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center items-center min-w-[100px]">
                                    {!isMaxed ? (
                                        <button 
                                            onClick={() => handleBuy(def.id)}
                                            disabled={!canAfford || purchasingId === def.id}
                                            className={`w-full py-2 px-4 rounded font-bold flex items-center justify-center gap-2 transition
                                                ${purchasingId === def.id ? 'bg-gray-600 cursor-wait' : 
                                                  canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                                        >
                                            <span className="text-sm">🥜 {cost}</span>
                                        </button>
                                    ) : (
                                        <div className="text-yellow-500 font-bold flex items-center gap-2">
                                            <Hammer size={20} /> DONE
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
