// src/app/page.tsx
import { ProductGrid } from "./components/ProductGrid";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-lg">Allo Inventory</span>
          </div>
          <div className="ml-auto text-xs text-slate-400 hidden sm:block">
            Multi-warehouse · Real-time stock
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1">
            Browse available inventory across all warehouses. Reserve items to lock your stock for 10 minutes.
          </p>
        </div>
        <ProductGrid />
      </div>
    </main>
  );
}
