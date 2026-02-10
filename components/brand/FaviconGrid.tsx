import { brand } from '@/lib/constants';
import { PrimaryLogo } from './PrimaryLogo';

interface FaviconGridProps {
  color?: string;
}

export function FaviconGrid({ color = brand.colors.light }: FaviconGridProps) {
  const sizes = [16, 32, 64, 128];

  return (
    <div className="flex flex-wrap gap-8 items-end">
      {sizes.map((size) => (
        <div key={size} className="text-center text-xs text-gray-400 font-medium">
          <div className="bg-dark rounded-lg p-4 mb-2 border border-gray-800">
            <PrimaryLogo color={color} size={size + 40} />
          </div>
          {size}×{size}
        </div>
      ))}
    </div>
  );
}
