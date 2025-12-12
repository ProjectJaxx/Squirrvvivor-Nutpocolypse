
import React from 'react';
import { Player } from '../types';
import { Skull, Clock } from 'lucide-react';

interface GameHUDProps {
    player: Player;
    score: number;
    kills: number;
    nuts: number;
    time: number;
    wave: number;
    maxWaveTime: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({ player, score, kills, nuts, time, wave, maxWaveTime }) => {
    
    // Format Time
    const mins = Math.floor(time / 3600);
    const secs = Math.floor((time % 3600) / 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Calculate Percentages
    const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
    const xpPct = Math.max(0, Math.min(100, (player.xp / player.nextLevelXp) * 100));

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20">
            
            {/* TOP BAR */}
            <div className="flex items-start justify-between">
                
                {/* Score & Nuts */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur px-4 py-2 rounded-full border border-gray-700">
                        <span className="text-amber-400 font-bold text-xl drop-shadow-sm">{score}</span>
                        <span className="text-xs text-gray-400 font-bold tracking-widest uppercase">SCORE</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur px-4 py-1 rounded-full border border-gray-700 w-fit">
                        <span className="text-xl">🥜</span>
                        <span className="text-white font-bold">{nuts}</span>
                    </div>
                </div>

                {/* Timer */}
                <div className="flex flex-col items-center">
                    <div className="bg-gray-900/90 text-white font-mono text-3xl font-bold px-6 py-2 rounded-lg border-b-4 border-gray-700 shadow-lg flex items-center gap-3">
                        <Clock size={24} className="text-gray-400" />
                        {timeStr}
                    </div>
                    {/* Boss/Wave Warning could go here */}
                </div>

                {/* Kills & Level */}
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3 bg-red-900/80 backdrop-blur px-4 py-2 rounded-full border border-red-800">
                        <Skull className="text-white" size={20} />
                        <span className="text-white font-bold text-xl">{kills}</span>
                    </div>
                    <div className="bg-gray-900/80 backdrop-blur px-3 py-1 rounded text-xs text-gray-400 border border-gray-700">
                        WAVE {wave}
                    </div>
                </div>
            </div>

            {/* BOTTOM BAR - STATS */}
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-1 mb-4">
                
                {/* HP Bar */}
                <div className="relative w-full h-8 bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 shadow-xl">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300 ease-out"
                        style={{ width: `${hpPct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md z-10">
                        <span className="mr-1">HP</span> {Math.ceil(player.hp)} / {Math.ceil(player.maxHp)}
                    </div>
                </div>

                {/* XP Bar */}
                <div className="relative w-full h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700 mt-1">
                     <div 
                        className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${xpPct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 z-10">
                        LVL {player.level}
                    </div>
                </div>
            </div>
        </div>
    );
};
