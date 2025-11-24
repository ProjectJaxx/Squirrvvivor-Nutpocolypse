import React from 'react';

interface GameLogoProps {
  className?: string;
  showText?: boolean;
  style?: React.CSSProperties;
}

export const GameLogo: React.FC<GameLogoProps> = ({ className = "w-32 h-32", showText = false, style }) => {
  return (
    // FIX: Add style prop to allow for inline styles
    <div className={`flex flex-col items-center justify-center ${className}`} style={style}>
      <img 
        src="./public/assets/graphics/logotrans.svg" 
        alt="Game Logo" 
        className="w-full h-full object-contain drop-shadow-xl"
        onError={(e) => {
            // Hide image if file not found so it doesn't look broken
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement?.classList.add('bg-gray-800', 'rounded-full', 'border-2', 'border-gray-600');
        }}
      />
      
      {showText && (
        <div className="mt-4 text-center">
             <h1 className="text-4xl md:text-6xl font-bold text-amber-500 pixel-font leading-none tracking-tight drop-shadow-lg" 
                 style={{ textShadow: '4px 4px 0px #000' }}>
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
