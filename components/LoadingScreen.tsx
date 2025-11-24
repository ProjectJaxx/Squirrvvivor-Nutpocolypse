import React from 'react';
import { GameLogo } from './GameLogo';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-center">
      <GameLogo className="w-48 h-48 animate-bounce" />
      <h1 className="text-2xl font-bold text-amber-400 pixel-font mt-8">LOADING VECTOR ENGINE...</h1>
      <p className="text-gray-400 mt-2">Sharpening the nuts!</p>
    </div>
  );
};
