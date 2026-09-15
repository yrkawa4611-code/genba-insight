import { z } from "zod";

export const laborUnitPriceSchema = z.number().int().min(1).max(1_000_000);
export const laborCountSchema = z.number().min(0.5).max(1000).multipleOf(0.5);
const amountSchema = z.number().int().min(1).max(2_147_483_647);
type ExistingLabor = { category: string; laborCount: unknown; laborUnitPrice: number | null };

export function calculateCost(input: { category: string; amount?: number; laborCount?: number | null }, projectRate: number | null, existing?: ExistingLabor) {
  const legacy = existing?.category === "LABOR" && existing.laborUnitPrice === null && existing.laborCount === null;
  if (input.category !== "LABOR" || legacy) {
    return { amount: amountSchema.parse(input.amount), laborCount: null, laborUnitPrice: null };
  }
  const rate = existing?.category === "LABOR" ? existing.laborUnitPrice : projectRate;
  const laborUnitPrice = laborUnitPriceSchema.parse(rate);
  const laborCount = laborCountSchema.parse(input.laborCount);
  return { amount: amountSchema.parse(Math.round(laborCount * laborUnitPrice)), laborCount, laborUnitPrice };
}
