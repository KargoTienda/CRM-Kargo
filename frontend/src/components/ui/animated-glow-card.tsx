import React, { ReactNode } from 'react';

interface CardCanvasProps {
  children: ReactNode;
  className?: string;
}

interface CardProps {
  children: ReactNode;
  className?: string;
}

const CardCanvas = ({ children, className = "" }: CardCanvasProps) => {
  return (
    <div className={`card-canvas ${className}`}>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter width="3000%" x="-1000%" height="3000%" y="-1000%" id="unopaq">
          <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 3 0" />
        </filter>
      </svg>
      <div className="card-backdrop" />
      {children}
    </div>
  );
};

const Card = ({ children, className = "" }: CardProps) => {
  return (
    <div className={`glow-card ${className}`}>
      <div className="border-element border-left" />
      <div className="border-element border-right" />
      <div className="border-element border-top" />
      <div className="border-element border-bottom" />
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

export { CardCanvas, Card };
