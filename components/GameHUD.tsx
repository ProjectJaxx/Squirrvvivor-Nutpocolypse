
import React from 'react';
import { Player } from '../types';
import { Skull, Clock, Trophy, Pause } from 'lucide-react';

interface GameHUDProps {
    player: Player;
    score: number;
    kills: number;
    nuts: number;
    time: number;
    wave: number;
    maxWaveTime: number;
    onPause?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ player, score, kills, nuts, time, wave, maxWaveTime, onPause }) => {
    
    // Format Time
    const mins = Math.floor(time / 3600);
    const secs = Math.floor((time % 3600) / 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Calculate Percentages
    const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
    const xpPct = Math.max(0, Math.min(100, (player.xp / player.nextLevelXp) * 100));

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col p-4 z-20">
            
            {/* TOP ROW: Stats & Timer */}
            <div className="flex items-end justify-between w-full mb-2 pointer-events-auto">
                
                {/* LEFT: Kills & Wave */}
                <div className="flex flex-col gap-2 items-start">
                    <div className="flex items-center gap-2 bg-red-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-red-800 shadow-lg transform hover:scale-105 transition-transform">
                        <Skull className="text-white" size={20} />
                        <span className="text-white font-bold text-xl">{kills}</span>
                    </div>
                    <div className="bg-gray-900/80 backdrop-blur px-3 py-1 rounded text-sm text-gray-300 border border-gray-600 font-mono shadow-sm">
                        WAVE {wave}
                    </div>
                </div>

                {/* CENTER: Timer (Click to Pause) */}
                <div className="flex-1 flex justify-center pb-1">
                     <button 
                        onClick={onPause}
                        className="bg-gray-900/90 backdrop-blur-md text-white font-mono text-4xl font-bold px-8 py-2 rounded-xl border-2 border-gray-700 shadow-2xl flex items-center gap-3 transform -translate-y-2 cursor-pointer hover:border-amber-500/50 hover:scale-105 active:scale-95 transition-all group"
                        title="Pause Game"
                     >
                        <Clock size={28} className="text-amber-500 group-hover:text-amber-400" />
                        <span className="tracking-widest drop-shadow-md">{timeStr}</span>
                    </button>
                </div>

                {/* RIGHT: Nuts & Score */}
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-amber-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-amber-700 shadow-lg transform hover:scale-105 transition-transform">
                        <span className="text-xl">🥜</span>
                        <span className="text-white font-bold text-xl">{nuts}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur px-3 py-1 rounded-full border border-gray-600 shadow-sm">
                        <Trophy size={16} className="text-yellow-400" />
                        <span className="text-yellow-400 font-bold text-sm">{score}</span>
                    </div>
                </div>
            </div>

            {/* BARS: Full Width */}
            <div className="w-full flex flex-col gap-1 pointer-events-auto shadow-2xl">
                {/* HP Bar */}
                <div className="relative w-full h-8 bg-gray-900/90 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-700 via-red-600 to-red-500 transition-all duration-300 ease-out"
                        style={{ width: `${hpPct}%` }}
                    />
                    {/* Gloss effect */}
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10"></div>
                    
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-10 tracking-wider">
                        <span className="mr-2 text-red-200">HP</span> {Math.ceil(player.hp)} / {Math.ceil(player.maxHp)}
                    </div>
                </div>

                {/* XP Bar */}
                <div className="relative w-full h-4 bg-gray-900/90 rounded-full overflow-hidden border border-gray-600 shadow-md mt-1">
                     <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300 ease-out"
                        style={{ width: `${xpPct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 z-10 drop-shadow-md">
                        LEVEL {player.level}
                    </div>
                </div>
            </div>
        </div>
    );
};
