type Props = { current: number | null; target: number | null; showDifference?: boolean };

export default function TargetProfitMargin({ current, target, showDifference = false }: Props) {
  const value = current === null ? null : Math.floor(current);
  const difference = value !== null && target !== null ? value - target : null;
  const status = value === null ? "判定不可" : target === null ? "目標未設定" : difference === 0 ? "目標を達成しています" : difference! > 0 ? `目標を${difference}%上回っています` : `目標${target}%を${-difference!}%下回っています`;
  const tone = difference === null ? "neutral" : difference >= 0 ? "achieved" : "unmet";
  const width = value === null ? 0 : Math.max(0, Math.min(100, value));
  const targetPosition = target === null ? 0 : Math.max(0, Math.min(100, target));

  return (
    <div className={`target-margin target-margin-${tone}${showDifference ? " target-margin-detail" : ""}`}>
      <div className="profit-gauge-heading"><span>現在粗利率 {value === null ? "—" : `${value}%`}</span><span>{status}</span></div>
      <div className="profit-gauge" role="img" aria-label={`粗利率：現在 ${value === null ? "算出不可" : `${value}%`}、${target === null ? "目標未設定" : `目標 ${target}%`}、${status}`}>
        <div className="profit-gauge-labels" aria-hidden="true">
          {target !== null && <span className="profit-gauge-target-label" style={{ left: `${targetPosition}%`, transform: `translateX(-${targetPosition}%)` }}>目標 {target}%</span>}
        </div>
        <div className="profit-gauge-track" aria-hidden="true">
          {value !== null && <span className="profit-gauge-bar" style={{ width: `${width}%` }} />}
          {target !== null && <span className="profit-gauge-marker" style={{ left: `${targetPosition}%` }} />}
        </div>
        <div className="profit-gauge-scale" aria-hidden="true"><span>0%</span><span>100%</span></div>
      </div>
    </div>
  );
}
