
import React, { useState } from 'react';

interface GameLogoProps {
  className?: string;
  showText?: boolean;
  style?: React.CSSProperties;
}

export const GameLogo: React.FC<GameLogoProps> = ({ className = "w-32 h-32", showText = false, style }) => {
  const [error, setError] = useState(false);
  
  // Use raw.githubusercontent.com for direct image access
  const LOGO_SRC = "https://raw.githubusercontent.com/ProjectJaxx/Squirrvvivor-Nutpocolypse/c4b089647635aba7162adc71d7bf21da14b04ac0/public/assets/graphics/squirvivortrans.png";

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`} style={style}>
      {!error ? (
        <img 
          src={LOGO_SRC} 
          alt="SquirrelVivor" 
          className="w-full h-full object-contain drop-shadow-xl"
          onError={() => setError(true)}
        />
      ) : (
        // Text Fallback if image fails
        <div className="w-full h-full flex items-center justify-center bg-amber-900/20 rounded-full border-4 border-amber-600/50 p-4">
           <span className="text-4xl md:text-5xl">🐿️</span>
        </div>
      )}
      
      {showText && (
        <div className="mt-4 text-center">
             <h1 className="text-4xl md:text-6xl font-bold text-amber-500 pixel-font leading-none tracking-tight drop-shadow-lg" 
                 style={{ textShadow: '4px 4px 0px #000', fontFamily: 'Impact, sans-serif' }}>
                SQUIRREL<span className="text-gray-100">VIVOR</span>
            </h1>
            <h2 className="text-lg md:text-2xl font-bold text-red-500 tracking-[0.2em] bg-gray-900/80 px-2 inline-block transform -skew-x-12 mt-2 border border-red-900">
                NUTPOCOLYPSE
            </h2>
        </div>
      )}
    </div>
  );
};
