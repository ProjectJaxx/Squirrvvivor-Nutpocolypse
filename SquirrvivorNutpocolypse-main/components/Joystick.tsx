
import React, { useRef, useState, useEffect } from 'react';

interface JoystickProps {
  onMove: (angle: number | null, force: number) => void;
}

const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  const radius = 50;

  const handleStart = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Relative coordinates within the container
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    setActive(true);
    setOrigin({ x: relX, y: relY });
    setPosition({ x: 0, y: 0 });
    onMove(null, 0);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!active || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    const dx = relX - origin.x;
    const dy = relY - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(distance, radius);
    
    const x = clampedDist * Math.cos(angle);
    const y = clampedDist * Math.sin(angle);

    setPosition({ x, y });
    onMove(angle, clampedDist / radius);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(null, 0);
  };

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 w-full h-[40%] z-50 touch-none"
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => active && handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {/* Visual Feedback - Only shows when active */}
      {active && (
        <div 
          className="absolute w-32 h-32 bg-white/10 rounded-full border-2 border-white/30 backdrop-blur-sm pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{ left: origin.x, top: origin.y }}
        >
          <div
            className="w-12 h-12 bg-orange-500/80 rounded-full shadow-lg"
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`
            }}
          />
        </div>
      )}
      
      {/* Hint Text */}
      {!active && (
        <div className="absolute bottom-4 w-full text-center text-white/20 text-sm font-bold pointer-events-none animate-pulse">
           TOUCH ANYWHERE TO MOVE
        </div>
      )}
    </div>
  );
};

export default Joystick;
