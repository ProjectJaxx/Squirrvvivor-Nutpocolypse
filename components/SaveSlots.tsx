
import React, { useState, useEffect } from 'react';
import { SaveSlot } from '../types';
import { getSlots, createSlot, deleteSlot } from '../services/storageService';
import { Trash2, Plus, Play, Skull, Clock, Trophy } from 'lucide-react';

interface SaveSlotsProps {
  onSelect: (slot: SaveSlot) => void;
}

export const SaveSlots: React.FC<SaveSlotsProps> = ({ onSelect }) => {
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    setSlots(getSlots());
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const slot = createSlot(newName);
    if (slot) {
      setSlots(getSlots());
      setIsCreating(false);
      setNewName('');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this save? This cannot be undone.")) {
        setSlots(deleteSlot(id));
    }
  };

  return (
    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      
      <div className="z-10 w-full max-w-5xl p-8">
        <h1 className="text-5xl md:text-6xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 mb-2 pixel-font drop-shadow-sm">
            SQUIRRELVIVOR<br className="md:hidden"/> NUTPOCOLYPSE
        </h1>
        <p className="text-center text-gray-400 mb-12 font-serif italic">Select a save slot to continue...</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {slots.map((slot) => (
            <div key={slot.id} className="bg-gray-800 border border-gray-600 hover:border-amber-500 rounded-xl p-6 flex flex-col relative group transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-900/20">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-white">{slot.name}</h3>
                        <p className="text-xs text-gray-500">Last Played: {new Date(slot.lastPlayed).toLocaleDateString()}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(slot.id); }} className="p-2 text-gray-600 hover:text-red-500 hover:bg-gray-700 rounded-full transition">
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="flex-1 space-y-2 mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-300">
                        <span className="flex items-center gap-2"><Trophy size={14} className="text-yellow-500"/> Max Wave</span>
                        <span className="font-mono font-bold">{slot.stats.maxWaveReached}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-300">
                        <span className="flex items-center gap-2"><Skull size={14} className="text-red-500"/> Kills</span>
                        <span className="font-mono font-bold">{slot.stats.totalKills}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-300">
                        <span className="flex items-center gap-2"><Clock size={14} className="text-blue-500"/> Play Time</span>
                        <span className="font-mono font-bold">{Math.floor(slot.stats.totalTimePlayed / 60)}m</span>
                    </div>
                </div>

                <button 
                    onClick={() => onSelect(slot)}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition shadow-lg"
                >
                    <Play size={20} fill="currentColor" /> PLAY
                </button>
            </div>
          ))}

          {slots.length < 5 && (
             <div className="bg-gray-800/50 border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] transition-colors cursor-pointer" onClick={() => setIsCreating(true)}>
                 {!isCreating ? (
                    <>
                        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <Plus size={32} />
                        </div>
                        <span className="text-gray-400 font-bold">NEW GAME</span>
                    </>
                 ) : (
                    <form onSubmit={handleCreate} className="w-full flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white text-center">Name Your Save</h3>
                        <input 
                            autoFocus
                            type="text" 
                            maxLength={12}
                            placeholder="Enter Name..." 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white text-center focus:border-amber-500 outline-none"
                        />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold text-sm">CANCEL</button>
                            <button type="submit" className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold text-sm">CREATE</button>
                        </div>
                    </form>
                 )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
