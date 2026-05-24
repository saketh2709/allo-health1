// src/types/index.ts

export type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockLevel {
  id: string;
  productId: string;
  warehouseId: string;
  totalUnits: number;
  reserved: number;
  available: number; // computed: totalUnits - reserved
  warehouse: Warehouse;
}

export interface ProductWithStock extends Product {
  stockLevels: StockLevel[];
}

export interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  warehouse?: Warehouse;
}

export interface ApiError {
  error: string;
  code?: string;
}
