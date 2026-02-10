interface ColorSwatchProps {
  name: string;
  hex: string;
  description: string;
  inverted?: boolean;
}

export function ColorSwatch({ name, hex, description, inverted = false }: ColorSwatchProps) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-800 bg-dark/80">
      <div
        className="h-40"
        style={{
          background: hex,
          borderBottom: inverted ? '1px solid #e0e0e0' : 'none',
        }}
      />
      <div className="p-6 space-y-3">
        <div className="text-2xl font-bold tracking-tight">{name}</div>
        <div className="font-mono text-gray-400">{hex}</div>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
