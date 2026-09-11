export type CostCategory =
  | "DISPOSAL"
  | "LABOR"
  | "VEHICLE"
  | "MACHINERY"
  | "ATTACHMENT"
  | "LEASE"
  | "SUBCONTRACT"
  | "MISC";

export const categoryLabels: Record<CostCategory, string> = {
  DISPOSAL: "処分代",
  LABOR: "人工",
  VEHICLE: "車両",
  MACHINERY: "重機",
  ATTACHMENT: "アタッチメント",
  LEASE: "リース",
  SUBCONTRACT: "外注",
  MISC: "雑費",
};

export const isMetalSale = (entry: { category: CostCategory; detail: string | null }) =>
  entry.category === "DISPOSAL" && entry.detail === "金属";

export const normalizeCostDetail = (category: CostCategory, detail: string | null) => {
  if (category === "DISPOSAL" && (detail === "コンクリート" || detail === "ガラ")) {
    return "コンクリートガラ";
  }

  return detail;
};
