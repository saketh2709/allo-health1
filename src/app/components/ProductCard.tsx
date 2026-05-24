// src/app/components/ProductCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "./Button";
import { StockBadge } from "./StockBadge";
import { ReserveModal } from "./ReserveModal";
import { formatPrice } from "@/lib/utils";
import type { ProductWithStock } from "@/types";

interface ProductCardProps {
  product: ProductWithStock;
}

export function ProductCard({ product }: ProductCardProps) {
  const [showModal, setShowModal] = useState(false);

  const totalAvailable = product.stockLevels.reduce(
    (sum, s) => sum + s.available,
    0
  );

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
        {/* Product image */}
        <div className="relative aspect-square bg-slate-50">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-5 gap-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 leading-snug">
              {product.name}
            </h3>
            <span className="text-lg font-bold text-indigo-600 whitespace-nowrap">
              {formatPrice(product.price)}
            </span>
          </div>

          {product.description && (
            <p className="text-sm text-slate-500 line-clamp-2">
              {product.description}
            </p>
          )}

          {/* Stock per warehouse */}
          <div className="space-y-1.5">
            {product.stockLevels.map((s) => (
              <div key={s.warehouseId} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{s.warehouse.name}</span>
                <StockBadge available={s.available} />
              </div>
            ))}
          </div>

          <div className="mt-auto pt-1">
            <Button
              className="w-full"
              disabled={totalAvailable === 0}
              onClick={() => setShowModal(true)}
            >
              {totalAvailable === 0 ? "Out of Stock" : "Reserve"}
            </Button>
          </div>
        </div>
      </div>

      {showModal && (
        <ReserveModal product={product} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
