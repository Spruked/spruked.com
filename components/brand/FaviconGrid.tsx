import { brand } from '@/lib/constants';

interface FaviconGridProps {
  color?: string;
}

export function FaviconGrid({ color = brand.colors.light }: FaviconGridProps) {
  const colors = ['blk', 'wht'];
  const sizes = [96, 256, 512];

  return (
    <div className="flex flex-wrap gap-8 items-end">
      {colors.map((col) => (
        <div key={col} className="text-center">
          <p className="text-xs text-gray-400 font-medium mb-2 uppercase">{col === 'blk' ? 'Black' : 'White'}</p>
          <div className="flex gap-4">
            {sizes.map((size) => (
              <div key={size} className="text-center text-xs text-gray-400 font-medium">
                <div className="bg-dark rounded-lg p-4 mb-2 border border-gray-800">
                  <img
                    src={`/assets/img/Ulogo${size}${col}.png`}
                    alt={`Favicon ${size}x${size} ${col}`}
                    width={size > 256 ? 64 : size > 96 ? 48 : 32}
                    height={size > 256 ? 64 : size > 96 ? 48 : 32}
                    className="object-contain"
                  />
                </div>
                {size}×{size}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
