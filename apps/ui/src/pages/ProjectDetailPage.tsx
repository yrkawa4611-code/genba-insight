import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl, authFetch } from "../auth";

type CostCategory =
  | "DISPOSAL"
  | "LABOR"
  | "VEHICLE"
  | "MACHINERY"
  | "ATTACHMENT"
  | "LEASE"
  | "SUBCONTRACT"
  | "MISC";

type CostEntry = {
  id: number;
  projectId: number;
  category: CostCategory;
  detail: string | null;
  amount: number;
  occurredAt: string;
  memo: string | null;
};

type Project = {
  id: number;
  address: string;
  structure: string;
  areaTsubo: number;
  contractPrice: number;
  cost: number;
};

type ProjectDetail = Project & {
  costs: CostEntry[];
};

type Props = {
  projects: Project[];
  deleteProject: (id: number) => Promise<void>;
  updateProjectCost: (id: number, cost: number) => void;
};

const categoryLabels: Record<CostCategory, string> = {
  DISPOSAL: "処分代",
  LABOR: "人工",
  VEHICLE: "車両",
  MACHINERY: "重機",
  ATTACHMENT: "アタッチメント",
  LEASE: "リース",
  SUBCONTRACT: "外注",
  MISC: "雑費",
};

const categoryColors: Record<CostCategory, string> = {
  DISPOSAL: "#ff6b2c",
  LABOR: "#f4b942",
  VEHICLE: "#2dd4bf",
  MACHINERY: "#60a5fa",
  ATTACHMENT: "#a78bfa",
  LEASE: "#f472b6",
  SUBCONTRACT: "#84cc16",
  MISC: "#94a3b8",
};

const detailOptions: Partial<Record<CostCategory, string[]>> = {
  DISPOSAL: [
    "木くず",
    "生木",
    "コンクリート",
    "ガラ",
    "石膏ボード",
    "金属",
    "混合",
    "紙",
    "ガラス・陶器",
    "土",
    "畳",
    "布",
    "廃プラスチック",
    "タイヤ",
    "家電",
    "家財",
    "石",
    "その他",
  ],
  VEHICLE: ["2t", "3t", "4t", "8t", "10t"],
  MACHINERY: ["30クラス", "40クラス", "0.25㎥", "0.45㎥", "0.7㎥"],
  ATTACHMENT: ["フォーク", "クラッシャー", "パクラ", "ブレーカー", "カッター"],
};

export default function ProjectDetailPage({
  projects,
  deleteProject,
  updateProjectCost,
}: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = Number(id);

  const [project, setProject] = useState<ProjectDetail | null>(null);

  const [expandedCategory, setExpandedCategory] = useState<CostCategory | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [category, setCategory] = useState<CostCategory>("DISPOSAL");

  const [detail, setDetail] = useState("");

  const [amount, setAmount] = useState("");

  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [memo, setMemo] = useState("");

  const [editingCostId, setEditingCostId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteError, setDeleteError] = useState("");

  const [deletingCostId, setDeletingCostId] = useState<number | null>(null);

  const [costActionError, setCostActionError] = useState("");

  const fetchProject = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new Error("現場IDが正しくありません。");
    }

    const response = await authFetch(`${apiUrl}/projects/${projectId}`);

    if (response.status === 404) {
      throw new Error("現場が見つかりません");
    }

    if (!response.ok) {
      throw new Error("現場詳細の取得に失敗しました。");
    }

    return (await response.json()) as ProjectDetail;
  }, [projectId]);

  useEffect(() => {
    let isCancelled = false;

    const loadProject = async () => {
      try {
        const data = await fetchProject();

        if (isCancelled) {
          return;
        }

        setProject(data);
        setLoadError("");
        updateProjectCost(data.id, data.cost);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setLoadError(
          error instanceof Error ? error.message : "通信エラーが発生しました。",
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProject();

    return () => {
      isCancelled = true;
    };
  }, [fetchProject, updateProjectCost]);

  const handleCostSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const isEditing = editingCostId !== null;

      const url = isEditing
        ? `${apiUrl}/projects/${projectId}/costs/${editingCostId}`
        : `${apiUrl}/projects/${projectId}/costs`;

      const response = await authFetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          detail: isEditing ? detail || null : detail || undefined,
          amount: Number(amount),
          occurredAt,
          memo: isEditing ? memo.trim() || null : memo.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(
          isEditing
            ? "工事原価の更新に失敗しました。"
            : "工事原価の登録に失敗しました。",
        );
      }

      setEditingCostId(null);
      setCategory("DISPOSAL");
      setDetail("");
      setAmount("");
      setOccurredAt(new Date().toISOString().slice(0, 10));
      setMemo("");

      const updatedProject = await fetchProject();

      setProject(updatedProject);

      updateProjectCost(updatedProject.id, updatedProject.cost);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "通信エラーが発生しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const startCostEdit = (entry: CostEntry) => {
    setEditingCostId(entry.id);
    setCategory(entry.category);
    setDetail(entry.detail ?? "");
    setAmount(entry.amount.toString());
    setOccurredAt(entry.occurredAt.slice(0, 10));
    setMemo(entry.memo ?? "");
    setSubmitError("");
  };

  const cancelCostEdit = () => {
    setEditingCostId(null);
    setCategory("DISPOSAL");
    setDetail("");
    setAmount("");
    setOccurredAt(new Date().toISOString().slice(0, 10));
    setMemo("");
    setSubmitError("");
  };

  const handleCostDelete = async (costId: number) => {
    if (!window.confirm("この工事原価を削除しますか？")) {
      return;
    }

    setCostActionError("");
    setDeletingCostId(costId);

    try {
      const response = await authFetch(
        `${apiUrl}/projects/${projectId}/costs/${costId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("工事原価の削除に失敗しました。");
      }

      const updatedProject = await fetchProject();

      setProject(updatedProject);

      updateProjectCost(updatedProject.id, updatedProject.cost);
    } catch (error) {
      setCostActionError(
        error instanceof Error ? error.message : "通信エラーが発生しました。",
      );
    } finally {
      setDeletingCostId(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("本当に削除しますか？")) {
      return;
    }

    setDeleteError("");
    setIsDeleting(true);

    try {
      await deleteProject(projectId);
      navigate("/projects");
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "通信エラーが発生しました。",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="project-page">現場詳細を読み込み中です...</div>;
  }

  if (loadError || !project) {
    const projectExistsInList = projects.some((item) => item.id === projectId);

    return (
      <div className="project-page">
        {loadError ||
          (projectExistsInList
            ? "現場詳細を取得できませんでした。"
            : "現場が見つかりません")}
      </div>
    );
  }

  const profit = project.contractPrice - project.cost;
  const profitMargin =
    project.contractPrice > 0
      ? (profit / project.contractPrice) * 100
      : null;
  const isLoss = profit < 0;
  const costRatio = project.contractPrice > 0
    ? Math.min((project.cost / project.contractPrice) * 100, 100)
    : 0;

  const categoryTotals = project.costs.reduce<Record<string, number>>(
    (totals, entry) => {
      totals[entry.category] = (totals[entry.category] ?? 0) + entry.amount;

      return totals;
    },
    {},
  );

  const detailTotals = project.costs.reduce<Record<string, number>>(
    (totals, entry) => {
      if (!entry.detail) {
        return totals;
      }

      const key = `${entry.category}:${entry.detail}`;

      totals[key] = (totals[key] ?? 0) + entry.amount;

      return totals;
    },
    {},
  );

  const costBreakdown = (
    Object.entries(categoryLabels) as [CostCategory, string][]
  )
    .map(([categoryKey, label]) => ({
      category: categoryKey,
      label,
      amount: categoryTotals[categoryKey] ?? 0,
      color: categoryColors[categoryKey],
    }))
    .filter((item) => item.amount > 0);
  const breakdownTotal = costBreakdown.reduce(
    (total, item) => total + item.amount,
    0,
  );
  let segmentStart = 0;
  const chartGradient = `conic-gradient(${costBreakdown
    .map((item) => {
      const segmentEnd = segmentStart + (item.amount / breakdownTotal) * 100;
      const segment = `${item.color} ${segmentStart}% ${segmentEnd}%`;
      segmentStart = segmentEnd;
      return segment;
    })
    .join(", ")})`;
  const chartLabel = `工事原価合計${project.cost.toLocaleString("ja-JP")}円。${costBreakdown
    .map(
      (item) =>
        `${item.label}${item.amount.toLocaleString("ja-JP")}円、${((item.amount / breakdownTotal) * 100).toFixed(1)}パーセント`,
    )
    .join("。")}`;

  return (
    <main className="project-page project-detail-page">
      <header className="detail-header">
        <button className="back-button" type="button" onClick={() => navigate("/projects")}>
          <span aria-hidden="true">←</span> 現場一覧
        </button>
        <div className="detail-actions">
          <button className="button button-secondary" type="button" onClick={() => navigate(`/projects/${project.id}/edit`)}>編集</button>
          <button className="button button-danger" type="button" onClick={() => void handleDelete()} disabled={isDeleting}>
            {isDeleting ? "削除中..." : "削除"}
          </button>
        </div>
      </header>

      {deleteError && <p role="alert">{deleteError}</p>}

      <section className="detail-hero">
        <div className="detail-title-row">
          <div>
            <p className="eyebrow">PROJECT DETAIL</p>
            <h1>{project.address}</h1>
            <p className="detail-subtitle">{project.structure} ・ {project.areaTsubo.toLocaleString("ja-JP")}坪</p>
          </div>
          <span className={`status-badge ${isLoss ? "status-loss" : profit > 0 ? "status-profit" : "status-neutral"}`}>
            <span className="status-dot" />{isLoss ? "赤字" : profit > 0 ? "黒字" : "未算出"}
          </span>
        </div>
        <div className="detail-kpis">
          <div className="detail-kpi"><span>請負金額</span><strong>¥{project.contractPrice.toLocaleString("ja-JP")}</strong></div>
          <div className="detail-kpi"><span>現在原価</span><strong>¥{project.cost.toLocaleString("ja-JP")}</strong></div>
          <div className="detail-kpi"><span>粗利</span><strong className={isLoss ? "text-danger" : "text-success"}>¥{profit.toLocaleString("ja-JP")}</strong></div>
          <div className="detail-kpi margin-kpi">
            <span>粗利率</span><strong className={isLoss ? "text-danger" : ""}>{profitMargin === null ? "—" : `${profitMargin.toFixed(1)}%`}</strong>
            <div className="mini-progress"><span className={isLoss ? "progress-loss" : ""} style={{ width: `${costRatio}%` }} /></div>
          </div>
        </div>
      </section>

      <div className="detail-content-grid">
        <div className="detail-main-column">

      <section className="project-card detail-section-card">
        <div className="section-heading"><div><p className="eyebrow">COST BREAKDOWN</p><h2>工事原価内訳</h2></div><strong>¥{project.cost.toLocaleString("ja-JP")}</strong></div>

        {breakdownTotal > 0 ? (
          <div className="cost-chart-layout">
            <div
              className="cost-donut"
              role="img"
              aria-label={chartLabel}
              style={{ background: chartGradient }}
            >
              <div className="cost-donut-center" aria-hidden="true">
                <span>工事原価</span>
                <strong>¥{project.cost.toLocaleString("ja-JP")}</strong>
              </div>
            </div>
            <ul className="cost-chart-legend" aria-label="原価カテゴリー別の内訳">
              {costBreakdown.map((item) => {
                const percentage = (item.amount / breakdownTotal) * 100;

                return (
                  <li key={item.category}>
                    <span
                      className="legend-color"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className="legend-name">{item.label}</span>
                    <strong>{item.amount.toLocaleString("ja-JP")}円</strong>
                    <span className="legend-percentage">
                      {percentage.toFixed(1)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="cost-chart-empty">原価データがありません</div>
        )}

        {(Object.entries(categoryLabels) as [CostCategory, string][]).map(
          ([categoryKey, label]) => {
            const registeredDetails =
              detailOptions[categoryKey]?.filter(
                (detailName) =>
                  (detailTotals[`${categoryKey}:${detailName}`] ?? 0) > 0,
              ) ?? [];

            const canExpand = registeredDetails.length > 0;

            const isExpanded = expandedCategory === categoryKey;

            return (
              <div key={categoryKey}>
                <button
                  type="button"
                  className="cost-row"
                  aria-expanded={canExpand ? isExpanded : undefined}
                  onClick={() => {
                    if (canExpand) {
                      setExpandedCategory(isExpanded ? null : categoryKey);
                    }
                  }}
                  style={{ cursor: canExpand ? "pointer" : "default" }}
                >
                  <span>
                    {canExpand ? `${isExpanded ? "▼" : "▶"} ${label}` : label}
                  </span>

                  <span>
                    {(categoryTotals[categoryKey] ?? 0).toLocaleString()}円
                  </span>
                </button>

                {isExpanded &&
                  registeredDetails.map((detailName) => (
                    <div key={detailName} className="cost-row">
                      <span
                        style={{
                          paddingLeft: "24px",
                        }}
                      >
                        └ {detailName}
                      </span>

                      <span>
                        {detailTotals[
                          `${categoryKey}:${detailName}`
                        ].toLocaleString()}
                        円
                      </span>
                    </div>
                  ))}
              </div>
            );
          },
        )}
      </section>

      <form className="project-card cost-form-card" onSubmit={handleCostSubmit}>
        <div className="section-heading"><div><p className="eyebrow">ADD COST</p><h2>{editingCostId === null ? "工事原価を登録" : "工事原価を編集"}</h2></div></div>

        <div className="form-field">
          <label>カテゴリ</label>

          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as CostCategory);
              setDetail("");
            }}
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "12px",
            }}
          >
            {(Object.entries(categoryLabels) as [CostCategory, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>

        {detailOptions[category] && (
          <div className="form-field">
            <label>詳細</label>

            <select
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px",
                marginBottom: "12px",
              }}
            >
              <option value="">選択してください</option>

              {detailOptions[category]?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-field">
          <label>金額</label>

          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label>発生日</label>

          <input
            type="date"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label>メモ</label>

          <input
            value={memo}
            maxLength={200}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="例：木くず処分"
          />
        </div>

        {submitError && <p role="alert">{submitError}</p>}

        <button className="form-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? editingCostId === null
              ? "登録中..."
              : "更新中..."
            : editingCostId === null
              ? "原価を登録"
              : "原価を更新"}
        </button>

        {editingCostId !== null && (
          <button className="button-secondary cancel-button" type="button" onClick={cancelCostEdit}>
            編集をキャンセル
          </button>
        )}
      </form>

      <section className="project-card detail-section-card history-card">
        <div className="section-heading"><div><p className="eyebrow">HISTORY</p><h2>登録履歴</h2></div><span className="count-badge">{project.costs.length}件</span></div>

        {project.costs.length === 0 && <p>登録された工事原価はありません。</p>}

        {costActionError && <p role="alert">{costActionError}</p>}

        {project.costs.map((entry) => (
          <div key={entry.id} className="cost-row history-row">
            <span className="history-description">
              {categoryLabels[entry.category]}
              {entry.detail ? ` / ${entry.detail}` : ""}
              {entry.memo ? `（${entry.memo}）` : ""}
            </span>

            <span className="history-amount">
              {entry.amount.toLocaleString()}円 /{" "}
              {new Date(entry.occurredAt).toLocaleDateString("ja-JP")}
            </span>

            <span
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <button className="row-action"
                type="button"
                style={{ width: "auto" }}
                onClick={() => startCostEdit(entry)}
              >
                編集
              </button>

              <button className="row-action row-delete"
                type="button"
                style={{ width: "auto" }}
                disabled={deletingCostId === entry.id}
                onClick={() => void handleCostDelete(entry.id)}
              >
                {deletingCostId === entry.id ? "削除中..." : "削除"}
              </button>
            </span>
          </div>
        ))}
      </section>
        </div>

        <aside className="detail-side-column">
          <div className="side-label">原価の追加・編集</div>
        </aside>
      </div>
    </main>
  );
}
