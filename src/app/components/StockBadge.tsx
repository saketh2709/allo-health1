// src/app/components/StockBadge.tsx
interface StockBadgeProps {
  available: number;
}

export function StockBadge({ available }: StockBadgeProps) {
  if (available === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Out of stock
      </span>
    );
  }
  if (available <= 3) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        Only {available} left!
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      {available} in stock
    </span>
  );
}
