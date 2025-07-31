'use client';

import { useEffect, useState } from 'react';

interface LoadingAnimationProps {
  size?: number;
  color?: string;
}

export function LoadingAnimation({
  size = 40,
  color = '#f97316',
}: LoadingAnimationProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 15) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const pawPrints = Array(8)
    .fill(0)
    .map((_, i) => {
      const angle = (i * 45 + rotation) % 360;
      const radian = (angle * Math.PI) / 180;
      const x = Math.cos(radian) * size;
      const y = Math.sin(radian) * size;
      const opacity = 0.3 + 0.7 * (1 - ((angle + 180) % 360) / 360);

      return (
        <div
          key={i}
          className="absolute"
          style={{
            transform: `translate(${x}px, ${y}px)`,
            opacity,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
              fill={color}
            />
            <path
              d="M18 12C19.1046 12 20 11.1046 20 10C20 8.89543 19.1046 8 18 8C16.8954 8 16 8.89543 16 10C16 11.1046 16.8954 12 18 12Z"
              fill={color}
            />
            <path
              d="M6 12C7.10457 12 8 11.1046 8 10C8 8.89543 7.10457 8 6 8C4.89543 8 4 8.89543 4 10C4 11.1046 4.89543 12 6 12Z"
              fill={color}
            />
            <path
              d="M16 18C17.1046 18 18 17.1046 18 16C18 14.8954 17.1046 14 16 14C14.8954 14 14 14.8954 14 16C14 17.1046 14.8954 18 16 18Z"
              fill={color}
            />
            <path
              d="M8 18C9.10457 18 10 17.1046 10 16C10 14.8954 9.10457 14 8 14C6.89543 14 6 14.8954 6 16C6 17.1046 6.89543 18 8 18Z"
              fill={color}
            />
          </svg>
        </div>
      );
    });

  return (
    <div className="relative" style={{ width: size * 2.5, height: size * 2.5 }}>
      <div className="absolute inset-0 flex items-center justify-center">
        {pawPrints}
      </div>
    </div>
  );
}
