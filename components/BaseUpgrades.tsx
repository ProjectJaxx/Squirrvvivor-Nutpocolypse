
import React, { useState } from 'react';
import { SaveSlot } from '../types';
import { BASE_UPGRADES_LIST } from '../constants';
import { purchaseUpgrade } from '../services/storageService';
import { playSound } from '../services/soundService';
import { ArrowLeft, Hammer, CheckCircle2, ChevronRight } from 'lucide-react';

interface BaseUpgradesProps {
    slot: SaveSlot;
    onBack: () => void;
    onUpdateSlot: (s: SaveSlot) => void;
}

export const BaseUpgrades: React.FC<BaseUpgradesProps> = ({ slot, onBack, onUpdateSlot }) => {
    const [purchasingId, setPurchasingId] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);

    const handleBuy = (upgradeId: string) => {
        setPurchasingId(upgradeId);
        setTimeout(() => {
            const updatedSlot = purchaseUpgrade(slot.id, upgradeId);
            if (updatedSlot) {
                onUpdateSlot(updatedSlot);
                playSound('BUY');
            }
            setPurchasingId(null);
        }, 150); // Small delay for tactile feel
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
            <div className="w-full max-w-5xl p-6 flex items-center justify-between z-10">
                <button onClick={onBack} className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full border border-gray-600 transition-transform hover:scale-110">
                    <ArrowLeft />
                </button>
                
                <div className="flex items-center gap-3 bg-gray-800/90 backdrop-blur px-6 py-3 rounded-full border border-amber-500/50 shadow-lg animate-in slide-in-from-top-4">
                    <span className="text-2xl drop-shadow-md">🥜</span>
                    <span className="text-2xl font-bold text-amber-400 font-mono tracking-wider">{slot.stats.totalNuts || 0}</span>
                </div>
            </div>

            <div className="flex-1 w-full max-w-5xl overflow-y-auto p-4 md:p-8 pb-24">
                <div className="text-center mb-8 flex flex-col items-center">
                    {!imgError ? (
                        <img 
                            src="/public/assets/graphics/logo.png" 
                            alt="Acorn Armory" 
                            onError={() => setImgError(true)}
                            className="w-20 h-20 mb-4 object-contain drop-shadow-lg animate-bounce"
                            style={{ animationDuration: '3s' }}
                        />
                    ) : (
                        <div className="text-6xl mb-4 animate-bounce">🛡️</div>
                    )}
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-orange-500 mb-2 pixel-font drop-shadow-sm">
                        ACORN ARMORY
                    </h1>
                    <p className="text-gray-400 font-medium">Invest your nuts to grow stronger for the next run.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {BASE_UPGRADES_LIST.map(def => {
                        const currentLevel = slot.permanentUpgrades[def.id] || 0;
                        const isMaxed = currentLevel >= def.maxLevel;
                        const cost = calculateCost(def.baseCost, def.costMultiplier, currentLevel);
                        const canAfford = (slot.stats.totalNuts || 0) >= cost;

                        const currentBoost = currentLevel * def.increment;
                        const nextBoost = (currentLevel + 1) * def.increment;
                        
                        const formatVal = (val: number) => {
                            if (def.statKey === 'damage' || def.statKey === 'cooldown' || def.statKey === 'speed') {
                                return `+${Math.round(val * 100)}%`;
                            }
                            return `+${val}`;
                        };

                        return (
                            <div key={def.id} className={`
                                relative bg-gradient-to-br from-gray-800 to-gray-800/80 border p-5 rounded-2xl flex flex-col md:flex-row gap-5 items-stretch overflow-hidden transition-all duration-200
                                ${isMaxed ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-gray-700 hover:border-gray-500 hover:shadow-lg'}
                            `}>
                                {/* Background Icon Watermark */}
                                <div className="absolute -right-4 -bottom-4 text-9xl opacity-5 pointer-events-none select-none grayscale">
                                    {def.icon}
                                </div>

                                {/* Header & Icon */}
                                <div className="flex flex-row md:flex-col items-center gap-4 shrink-0">
                                    <div className={`
                                        w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-inner
                                        ${isMaxed ? 'bg-amber-900/30 text-amber-400 ring-2 ring-amber-500/30' : 'bg-gray-700/50 text-gray-300'}
                                    `}>
                                        {def.icon}
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Level</div>
                                        <div className={`text-xl font-mono font-bold ${isMaxed ? 'text-amber-500' : 'text-white'}`}>
                                            {currentLevel}<span className="text-gray-600 text-sm">/{def.maxLevel}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Info & Stats */}
                                <div className="flex-1 flex flex-col z-10">
                                    <h3 className="text-xl font-bold text-white mb-1">{def.name}</h3>
                                    <p className="text-sm text-gray-400 leading-snug mb-4 h-10">{def.description}</p>
                                    
                                    <div className="mt-auto bg-gray-900/50 rounded-lg p-3 border border-gray-700/50 flex items-center justify-between mb-4 md:mb-0">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase text-gray-500 font-bold">Current</span>
                                            <span className="text-sm font-mono text-gray-300">{formatVal(currentBoost)}</span>
                                        </div>
                                        {!isMaxed && (
                                            <>
                                                <ChevronRight className="text-gray-600" size={16} />
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] uppercase text-amber-500 font-bold">Next</span>
                                                    <span className="text-sm font-mono text-white font-bold">{formatVal(nextBoost)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="flex flex-col justify-center min-w-[110px] z-10">
                                    {!isMaxed ? (
                                        <button 
                                            onClick={() => handleBuy(def.id)}
                                            disabled={!canAfford || purchasingId === def.id}
                                            className={`
                                                relative w-full py-3 px-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all transform active:scale-95
                                                ${purchasingId === def.id ? 'bg-gray-600 cursor-wait scale-95' : 
                                                  canAfford 
                                                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/20' 
                                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-70'}
                                            `}
                                        >
                                            <span className="text-xs uppercase tracking-wide opacity-80">Buy</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-lg">🥜</span>
                                                <span>{cost}</span>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="w-full py-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col items-center justify-center text-amber-500 gap-1">
                                            <CheckCircle2 size={24} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Maxed</span>
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
