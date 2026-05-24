// src/app/components/ReserveModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./Button";
import type { ProductWithStock } from "@/types";

interface ReserveModalProps {
  product: ProductWithStock;
  onClose: () => void;
}

export function ReserveModal({ product, onClose }: ReserveModalProps) {
  const router = useRouter();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    product.stockLevels.find((s) => s.available > 0)?.warehouseId ?? ""
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStock = product.stockLevels.find(
    (s) => s.warehouseId === selectedWarehouseId
  );

  async function handleReserve() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouseId,
          quantity,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(
          `Not enough stock — only ${data.available ?? 0} unit(s) available.`
        );
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Success — go to checkout page
      router.push(`/checkout/${data.id}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reserve Item</h2>
            <p className="text-sm text-slate-500 mt-0.5">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Warehouse selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Warehouse
            </label>
            <div className="space-y-2">
              {product.stockLevels.map((s) => (
                <label
                  key={s.warehouseId}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedWarehouseId === s.warehouseId
                      ? "border-indigo-500 bg-indigo-50"
                      : s.available === 0
                      ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="warehouse"
                      value={s.warehouseId}
                      checked={selectedWarehouseId === s.warehouseId}
                      disabled={s.available === 0}
                      onChange={() => {
                        setSelectedWarehouseId(s.warehouseId);
                        setQuantity(1);
                      }}
                      className="text-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {s.warehouse.name}
                      </p>
                      <p className="text-xs text-slate-500">{s.warehouse.location}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      s.available === 0
                        ? "bg-red-50 text-red-600"
                        : s.available <= 3
                        ? "bg-orange-50 text-orange-600"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {s.available === 0 ? "Out of stock" : `${s.available} avail.`}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
              >
                −
              </button>
              <span className="w-10 text-center font-semibold text-slate-800 text-lg">
                {quantity}
              </span>
              <button
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(q + 1, selectedStock?.available ?? 1)
                  )
                }
                disabled={quantity >= (selectedStock?.available ?? 0)}
                className="w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Info */}
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your reservation holds stock for 10 minutes.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            loading={loading}
            disabled={!selectedWarehouseId || (selectedStock?.available ?? 0) === 0}
            onClick={handleReserve}
          >
            Reserve Now
          </Button>
        </div>
      </div>
    </div>
  );
}
