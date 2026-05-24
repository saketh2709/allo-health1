// src/app/checkout/[id]/CheckoutClient.tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Countdown } from "@/app/components/Countdown";
import { Button } from "@/app/components/Button";
import { formatPrice } from "@/lib/utils";
import type { Reservation, Product, Warehouse } from "@/types";

type ReservationWithRelations = Reservation & {
  product: (Product & { createdAt: string; updatedAt: string }) | null;
  warehouse: (Warehouse & { createdAt: string; updatedAt: string }) | null;
};

interface CheckoutClientProps {
  reservation: ReservationWithRelations;
}

type UIStatus = "pending" | "confirmed" | "released" | "expired" | "error";

export function CheckoutClient({ reservation: initial }: CheckoutClientProps) {
  const [reservation, setReservation] = useState(initial);
  const [uiStatus, setUiStatus] = useState<UIStatus>(
    initial.status === "PENDING"
      ? new Date(initial.expiresAt) < new Date()
        ? "expired"
        : "pending"
      : (initial.status.toLowerCase() as UIStatus)
  );
  const [loadingAction, setLoadingAction] = useState<"confirm" | "cancel" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExpired = useCallback(() => {
    if (uiStatus === "pending") setUiStatus("expired");
  }, [uiStatus]);

  async function handleConfirm() {
    setLoadingAction("confirm");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.status === 410) {
        setUiStatus("expired");
        setErrorMsg(data.error ?? "Reservation expired.");
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to confirm. Please try again.");
        return;
      }

      setReservation({ ...reservation, ...data });
      setUiStatus("confirmed");
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCancel() {
    setLoadingAction("cancel");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to cancel. Please try again.");
        return;
      }

      setReservation({ ...reservation, ...data });
      setUiStatus("released");
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  const product = reservation.product;
  const warehouse = reservation.warehouse;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back to products</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 hidden sm:block">Allo Inventory</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Status Banner */}
        {uiStatus === "confirmed" && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Purchase confirmed!</p>
              <p className="text-sm text-emerald-700">Your order is placed. Thank you for shopping with us.</p>
            </div>
          </div>
        )}

        {uiStatus === "released" && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-700">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Reservation cancelled</p>
              <p className="text-sm text-slate-500">The stock has been released back to inventory.</p>
            </div>
          </div>
        )}

        {uiStatus === "expired" && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-orange-800">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Reservation expired</p>
              <p className="text-sm text-orange-700">Your 10-minute hold has ended. The stock is now available again.</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {errorMsg}
          </div>
        )}

        {/* Reservation card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Reservation Details</h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">#{reservation.id}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                uiStatus === "confirmed"
                  ? "bg-emerald-100 text-emerald-700"
                  : uiStatus === "released"
                  ? "bg-slate-100 text-slate-600"
                  : uiStatus === "expired"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-indigo-100 text-indigo-700"
              }`}
            >
              {uiStatus}
            </span>
          </div>

          {/* Product info */}
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-start gap-4">
              {product?.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded-xl border border-slate-100 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-slate-900 text-base truncate">
                  {product?.name ?? "—"}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                  {product?.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <span className="text-slate-600">
                    <span className="font-medium">Qty:</span> {reservation.quantity}
                  </span>
                  {product && (
                    <span className="text-slate-600">
                      <span className="font-medium">Unit price:</span>{" "}
                      {formatPrice(product.price)}
                    </span>
                  )}
                  {product && (
                    <span className="font-bold text-indigo-600">
                      Total: {formatPrice(product.price * reservation.quantity)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Warehouse & timing */}
          <div className="px-6 py-5 grid grid-cols-2 gap-4 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Warehouse</p>
              <p className="text-sm font-semibold text-slate-800">{warehouse?.name ?? "—"}</p>
              <p className="text-xs text-slate-500">{warehouse?.location}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                {uiStatus === "pending" ? "Time remaining" : "Expired at"}
              </p>
              {uiStatus === "pending" ? (
                <Countdown expiresAt={reservation.expiresAt} onExpired={handleExpired} />
              ) : (
                <p className="text-sm text-slate-700">
                  {new Date(reservation.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {uiStatus === "pending" && (
            <div className="px-6 py-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                loading={loadingAction === "cancel"}
                disabled={loadingAction !== null}
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                className="flex-1"
                loading={loadingAction === "confirm"}
                disabled={loadingAction !== null}
                onClick={handleConfirm}
              >
                Confirm Purchase
              </Button>
            </div>
          )}

          {(uiStatus === "confirmed" || uiStatus === "released" || uiStatus === "expired") && (
            <div className="px-6 py-5">
              <Link href="/">
                <Button variant="outline" className="w-full">
                  ← Back to Products
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
