
import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-center">
      <div className="text-6xl mb-4 animate-spin">🌰</div>
      <h1 className="text-2xl font-bold text-amber-400 pixel-font">LOADING ASSETS...</h1>
      <p className="text-gray-400 mt-2">Gathering the nuts!</p>
    </div>
  );
};
