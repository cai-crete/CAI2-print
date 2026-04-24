'use client';

interface InfiniteGridProps {
  zoom: number;
  offset: { x: number; y: number };
}

export function InfiniteGrid({ zoom, offset }: InfiniteGridProps) {
  const minor = Math.round(12 * (zoom / 100));
  const major = minor * 5;
  const showMinor = minor >= 6;

  const bpx = Math.round(offset.x);
  const bpy = Math.round(offset.y);

  const lineColor      = 'rgba(0,0,0,0.04)';
  const lineColorMajor = 'rgba(0,0,0,0.14)';

  const bgImages = [
    `linear-gradient(to right,  ${lineColorMajor} 1px, transparent 1px)`,
    `linear-gradient(to bottom, ${lineColorMajor} 1px, transparent 1px)`,
    ...(showMinor ? [
      `linear-gradient(to right,  ${lineColor} 1px, transparent 1px)`,
      `linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
    ] : []),
  ];

  const bgSizes = [
    `${major}px ${major}px`,
    `${major}px ${major}px`,
    ...(showMinor ? [`${minor}px ${minor}px`, `${minor}px ${minor}px`] : []),
  ];

  const bgPos = `calc(50% + ${bpx}px) calc(50% + ${bpy}px)`;
  const bgPositions = [bgPos, bgPos, ...(showMinor ? [bgPos, bgPos] : [])];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: bgImages.join(', '),
        backgroundSize: bgSizes.join(', '),
        backgroundPosition: bgPositions.join(', '),
      }}
    />
  );
}
