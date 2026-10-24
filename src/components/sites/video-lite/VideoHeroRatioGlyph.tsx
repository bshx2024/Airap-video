export function VideoHeroRatioGlyph({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(':').map(Number);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null;
  }
  const scale = 18 / Math.max(w, h);
  return (
    <span className="flex h-[18px] items-center justify-center">
      <span
        className="block rounded-[3px] border-[1.5px] border-current"
        style={{ width: w * scale, height: h * scale }}
      />
    </span>
  );
}
