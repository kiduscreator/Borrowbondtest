import React, { useState } from 'react';
import { Package, Cpu } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  resourceType?: 'PHYSICAL' | 'DIGITAL';
  className?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  resourceType = 'PHYSICAL',
  className = 'w-full h-full object-cover',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#121B2C] text-[#A4B0C4] p-6 text-center select-none ${className}`}
      >
        {resourceType === 'DIGITAL' ? (
          <Cpu className="w-8 h-8 text-[#8297FF] mb-2 opacity-80" />
        ) : (
          <Package className="w-8 h-8 text-[#5EEAD4] mb-2 opacity-80" />
        )}
        <span className="text-xs font-medium text-[#F3F6FC] line-clamp-1">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
