import React, { useEffect, useRef, useState } from 'react';

interface MusicPlayerProps {
  src: string;
  volume: number;
  onVolumeChange: (vol: number) => void;
  autoPlay?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ src, volume, onVolumeChange, autoPlay = true, onExpandChange }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audioRef.current = audio;
    setError(false);

    const handleError = () => {
        setError(true);
        setIsPlaying(false);
    };

    audio.addEventListener('error', handleError);

    if (autoPlay) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }

    return () => {
      audio.removeEventListener('error', handleError);
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
    }
  }, [volume]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || error) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onVolumeChange(Number(e.target.value));
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (onExpandChange) onExpandChange(newState);
  };

  if (!src) return null;

  return (
    <div className="fixed top-20 right-2 z-[60] flex flex-col items-end gap-2 pointer-events-auto">
      <button 
        onClick={toggleExpand}
        className={`w-10 h-10 backdrop-blur-md border rounded-full flex items-center justify-center shadow-lg transition-all ${
           error 
             ? 'bg-red-900/80 border-red-500 text-white'
             : isPlaying 
                ? 'bg-gray-900/80 border-orange-500/50 text-orange-400' 
                : 'bg-red-900/80 border-red-500/50 text-red-400'
        }`}
      >
        {error ? '⚠️' : (isPlaying ? '🎵' : '🔇')}
      </button>

      {isExpanded && (
        <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-600 p-4 rounded-xl shadow-2xl flex flex-col gap-3 w-48" onClick={(e) => e.stopPropagation()}>
           <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">📻 Radio</span>
              <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="text-gray-500 hover:text-white text-xs font-bold px-1">✕</button>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={togglePlay} disabled={error} className={`w-10 h-10 flex items-center justify-center rounded-full text-white shadow-inner ${error ? 'bg-gray-700' : isPlaying ? 'bg-orange-600' : 'bg-green-600'}`}>
                {error ? '✕' : (isPlaying ? 'II' : '▶')}
              </button>
              <div className="flex-1 overflow-hidden">
                 <div className="text-[10px] text-gray-400 font-bold uppercase">Status</div>
                 <div className={`text-xs font-mono truncate ${error ? 'text-red-400' : isPlaying ? 'text-orange-400' : 'text-gray-500'}`}>{error ? 'Error' : isPlaying ? 'Playing' : 'Paused'}</div>
              </div>
           </div>
           <div className="space-y-1 bg-black/20 p-2 rounded-lg">
              <div className="flex justify-between text-[10px] text-gray-400 font-bold"><span>VOLUME</span><span className="text-orange-300">{volume}%</span></div>
              <input type="range" min="0" max="100" value={volume} onChange={handleVolumeChange} disabled={error} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-orange-500" />
           </div>
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;