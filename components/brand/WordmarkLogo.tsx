import { brand } from '@/lib/constants';
import { PrimaryLogo } from './PrimaryLogo';

type WordmarkSize = 'sm' | 'md' | 'lg' | 'xl';

const map: Record<WordmarkSize, { height: number; font: number }> = {
  sm: { height: 40, font: 20 },
  md: { height: 60, font: 28 },
  lg: { height: 100, font: 48 },
  xl: { height: 140, font: 64 },
};

interface WordmarkLogoProps {
  size?: WordmarkSize;
  color?: string;
}

export function WordmarkLogo({ size = 'md', color = brand.colors.light }: WordmarkLogoProps) {
  const { height, font } = map[size];

  return (
    <div className="flex items-center gap-4" aria-label="Spruked wordmark">
      <PrimaryLogo size={height * 0.8} color={color} />
      <span
        className="tracking-tight capitalize"
        style={{ fontSize: font, lineHeight: 1, color, fontWeight: brand.font.weights.medium }}
      >
        spruked
      </span>
    </div>
  );
}
