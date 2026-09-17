export type DisposalSnapshot = {
  disposalQuantity: number | null;
  disposalUnit: string | null;
  disposalUnitPrice: number | null;
  disposalTaxRate: number | null;
  disposalSubtotal: number | null;
  disposalTaxAmount: number | null;
};

export default function DisposalCostDescription(entry: DisposalSnapshot & { category: string; detail: string | null; amount: number }) {
  if (entry.category !== "DISPOSAL" || entry.detail === "金属") return null;
  return <small className="disposal-cost-description">{entry.disposalQuantity === null || entry.disposalUnitPrice === null || entry.disposalTaxRate === null
    ? "旧形式・数量／単価／税率未記録"
    : `${entry.disposalQuantity}${entry.disposalUnit} × ${entry.disposalUnitPrice.toLocaleString("ja-JP")}円（税抜）、税${entry.disposalTaxRate}%、税込${entry.amount.toLocaleString("ja-JP")}円`}</small>;
}
