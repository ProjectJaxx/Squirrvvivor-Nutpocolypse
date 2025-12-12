
import React from 'react';
import { Player } from '../types';
import { Skull, Clock, Trophy } from 'lucide-react';

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
        <div className="absolute inset-0 pointer-events-none flex flex-col p-2 z-20">
            
            {/* TOP ROW: Stats & Timer */}
            <div className="flex items-start justify-between w-full mb-1 pointer-events-auto">
                
                {/* LEFT: Kills & Wave */}
                <div className="flex flex-col gap-1 items-start">
                    <div className="flex items-center gap-1.5 bg-red-900/40 backdrop-blur-sm px-2 py-1 rounded-md border border-red-800/30 shadow-sm">
                        <Skull className="text-white/90" size={14} />
                        <span className="text-white/90 font-bold text-xs">{kills}</span>
                    </div>
                    <div className="bg-gray-900/40 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] text-gray-300/90 border border-gray-600/30 font-mono shadow-sm">
                        WAVE {wave}
                    </div>
                </div>

                {/* CENTER: Timer (Click to Pause) */}
                <div className="flex-1 flex justify-center">
                     <button 
                        onClick={onPause}
                        className="bg-gray-900/30 backdrop-blur-sm text-white/90 font-mono text-xl font-bold px-4 py-1 rounded-lg border border-gray-700/30 shadow-lg flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 active:scale-95 transition-all group"
                        title="Pause Game"
                     >
                        <Clock size={16} className="text-amber-500/80 group-hover:text-amber-400" />
                        <span className="tracking-widest drop-shadow-md">{timeStr}</span>
                    </button>
                </div>

                {/* RIGHT: Nuts & Score */}
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 bg-amber-900/40 backdrop-blur-sm px-2 py-1 rounded-md border border-amber-700/30 shadow-sm">
                        <span className="text-xs">🥜</span>
                        <span className="text-white/90 font-bold text-xs">{nuts}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-900/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-gray-600/30 shadow-sm">
                        <Trophy size={12} className="text-yellow-400/80" />
                        <span className="text-yellow-400/90 font-bold text-[10px]">{score}</span>
                    </div>
                </div>
            </div>

            {/* BARS: Full Width */}
            <div className="w-full flex flex-col gap-0.5 pointer-events-auto mt-1">
                {/* HP Bar */}
                <div className="relative w-full h-4 bg-gray-900/40 rounded-md overflow-hidden border border-gray-700/30 shadow-sm">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-700/70 via-red-600/70 to-red-500/70 transition-all duration-300 ease-out"
                        style={{ width: `${hpPct}%` }}
                    />
                    
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 drop-shadow-md z-10 tracking-wider">
                        {Math.ceil(player.hp)} / {Math.ceil(player.maxHp)}
                    </div>
                </div>

                {/* XP Bar */}
                <div className="relative w-full h-1.5 bg-gray-900/40 rounded-full overflow-hidden border border-gray-600/30 shadow-sm">
                     <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600/70 to-cyan-400/70 transition-all duration-300 ease-out"
                        style={{ width: `${xpPct}%` }}
                    />
                </div>
                
                {/* Level Display (Below bars) */}
                <div className="flex justify-center -mt-0.5">
                     <span className="text-[9px] font-bold text-white/60 bg-gray-900/40 px-2 rounded-full border border-gray-700/20">
                        LVL {player.level}
                     </span>
                </div>
            </div>
        </div>
    );
};
