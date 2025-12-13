
import React from 'react';
import { Player } from '../types';
import { Skull, Clock, Trophy, AlertTriangle, Timer } from 'lucide-react';

interface GameHUDProps {
    player: Player;
    score: number;
    kills: number;
    nuts: number;
    time: number;
    wave: number;
    maxWaveTime: number;
    onPause?: () => void;
    boss?: { name: string, hp: number, maxHp: number, color: string } | null;
    extractionTimer?: number | null;
}

export const GameHUD: React.FC<GameHUDProps> = ({ player, score, kills, nuts, time, wave, maxWaveTime, onPause, boss, extractionTimer }) => {
    
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
                <div className="flex-1 flex flex-col items-center gap-2">
                     <button 
                        onClick={onPause}
                        className="bg-gray-900/30 backdrop-blur-sm text-white/90 font-mono text-xl font-bold px-4 py-1 rounded-lg border border-gray-700/30 shadow-lg flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 active:scale-95 transition-all group"
                        title="Pause Game"
                     >
                        <Clock size={16} className="text-amber-500/80 group-hover:text-amber-400" />
                        <span className="tracking-widest drop-shadow-md">{timeStr}</span>
                    </button>

                    {/* EXTRACTION TIMER */}
                    {extractionTimer !== null && extractionTimer !== undefined && (
                        <div className="flex items-center gap-2 bg-red-950/80 backdrop-blur-sm px-4 py-2 rounded-lg border-2 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse">
                            <Timer size={20} className="text-red-400" />
                            <span className="text-red-200 font-bold font-mono text-2xl">
                                {Math.ceil(extractionTimer / 60)}s
                            </span>
                            <span className="text-[10px] text-red-300 uppercase tracking-widest font-bold">Extraction</span>
                        </div>
                    )}
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

            {/* BOSS BAR OVERLAY (If active) */}
            {boss && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 w-3/4 md:w-1/2 flex flex-col items-center animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                        <span className="text-red-500 font-bold text-sm tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{boss.name}</span>
                        <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                    </div>
                    <div className="w-full h-4 bg-gray-900/80 rounded-full border-2 border-red-900/50 overflow-hidden shadow-lg relative">
                        {/* Background Pulse */}
                        <div className="absolute inset-0 bg-red-900/20 animate-pulse" />
                        
                        <div 
                            className="h-full transition-all duration-300 ease-out"
                            style={{ 
                                width: `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`,
                                backgroundColor: boss.color,
                                boxShadow: `0 0 10px ${boss.color}`
                            }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white/80 drop-shadow-md">
                                {Math.ceil(boss.hp)} / {Math.ceil(boss.maxHp)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

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
