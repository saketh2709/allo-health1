// src/app/checkout/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckoutClient } from "./CheckoutClient";

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  });

  if (!reservation) notFound();

  // Serialize dates for client component
  const data = {
    ...reservation,
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    product: reservation.product
      ? {
          ...reservation.product,
          createdAt: reservation.product.createdAt.toISOString(),
          updatedAt: reservation.product.updatedAt.toISOString(),
        }
      : null,
    warehouse: reservation.warehouse
      ? {
          ...reservation.warehouse,
          createdAt: reservation.warehouse.createdAt.toISOString(),
          updatedAt: reservation.warehouse.updatedAt.toISOString(),
        }
      : null,
  };

  return <CheckoutClient reservation={data} />;
}
