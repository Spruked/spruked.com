import { useId } from 'react';
import { brand } from '@/lib/constants';

interface CircularStampProps {
  size?: number;
  color?: string;
  className?: string;
}

export function CircularStamp({ size = 240, color = brand.colors.light, className }: CircularStampProps) {
  const topArcId = useId();
  const bottomArcId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Spruked stamp"
    >
      <circle cx="100" cy="100" r="95" stroke={color} strokeWidth="3" />
      <path id={topArcId} d="M 25,100 A 75,75 0 0,1 175,100" fill="none" />
      <text
        fill={color}
        fontSize="16"
        fontWeight="700"
        letterSpacing="8"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
      >
        <textPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">
          SPRUKED
        </textPath>
      </text>
      <path id={bottomArcId} d="M 175,100 A 75,75 0 0,1 25,100" fill="none" />
      <text
        fill={color}
        fontSize="11"
        fontWeight="400"
        letterSpacing="3"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
      >
        <textPath href={`#${bottomArcId}`} startOffset="50%" textAnchor="middle">
          TRUTH WITH TEETH
        </textPath>
      </text>
      <g transform="translate(100, 100) scale(0.35)">
        <path
          d="M -60 -40 L -60 20 Q -60 60 -30 60 L 30 60 Q 60 60 60 20 L 60 -40"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line x1="-45" y1="45" x2="45" y2="-45" stroke={brand.colors.truth} strokeWidth="10" strokeLinecap="round" />
      </g>
    </svg>
  );
}
