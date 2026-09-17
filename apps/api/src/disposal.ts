import { z } from "zod";

export const disposalFields = {
  disposalQuantity: z.number().min(0.1).max(100_000).multipleOf(0.1),
  disposalUnit: z.enum(["㎥", "kg", "t"]),
  disposalUnitPrice: z.number().int().min(0).max(1_000_000),
  disposalTaxRate: z.union([z.literal(0), z.literal(8), z.literal(10)]),
};
export const disposalSchema = z.object(disposalFields);
export const emptyDisposal = {
  disposalQuantity: null, disposalUnit: null, disposalUnitPrice: null,
  disposalTaxRate: null, disposalSubtotal: null, disposalTaxAmount: null,
};
export const isDisposal = (entry: { category: string; detail?: string | null }) => entry.category === "DISPOSAL" && entry.detail !== "金属";

export function calculateDisposal(input: unknown) {
  const data = disposalSchema.parse(input);
  // Validated quantities have one decimal place. Integer arithmetic avoids binary rounding errors.
  const tenths = Math.round(data.disposalQuantity * 10);
  const disposalSubtotal = Math.floor(tenths * data.disposalUnitPrice / 10);
  const disposalTaxAmount = Math.floor(disposalSubtotal * data.disposalTaxRate / 100);
  const amount = disposalSubtotal + disposalTaxAmount;
  z.number().int().min(0).max(2_147_483_647).parse(amount);
  return { ...data, disposalSubtotal, disposalTaxAmount, amount };
}
