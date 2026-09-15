type Props = { category: string; laborCount: number | null; laborUnitPrice: number | null; amount: number };

export default function LaborCostDescription({ category, laborCount, laborUnitPrice, amount }: Props) {
  if (category !== "LABOR") return null;
  return <small className="labor-cost-description">{laborCount === null || laborUnitPrice === null
    ? "旧形式・人数／単価未記録"
    : `${laborCount}人 × ${laborUnitPrice.toLocaleString("ja-JP")}円 = ${amount.toLocaleString("ja-JP")}円`}</small>;
}
