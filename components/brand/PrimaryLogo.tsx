import { brand } from '@/lib/constants';

interface PrimaryLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

export function PrimaryLogo({ size = 120, className, color = brand.colors.light }: PrimaryLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Spruked primary mark"
    >
      <path
        d="M 40 60 L 40 120 Q 40 160 70 160 L 130 160 Q 160 160 160 120 L 160 60"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="55"
        y1="145"
        x2="145"
        y2="55"
        stroke={brand.colors.truth}
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}
