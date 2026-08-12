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

  return (
    <div className="project-page">
      <h1>現場詳細</h1>

      <button className="add-button" onClick={() => navigate("/projects")}>
        一覧に戻る
      </button>

      <button
        className="add-button"
        onClick={() => navigate(`/projects/${project.id}/edit`)}
      >
        編集
      </button>

      <button onClick={() => void handleDelete()} disabled={isDeleting}>
        {isDeleting ? "削除中..." : "削除"}
      </button>

      {deleteError && <p role="alert">{deleteError}</p>}

      <div className="project-card">
        <h3>{project.address}</h3>

        <p>
          {project.structure} / {project.areaTsubo}坪
        </p>

        <p>
          請負金額：
          {project.contractPrice.toLocaleString()}円
        </p>

        <p>工事原価：{project.cost.toLocaleString()}円</p>

        <p>粗利：{profit.toLocaleString()}円</p>
      </div>

      <div className="project-card">
        <h3>工事原価内訳</h3>

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
                  style={{
                    width: "100%",
                    background: "transparent",
                    color: "inherit",
                    border: "none",
                    borderRadius: 0,
                    margin: 0,
                    cursor: canExpand ? "pointer" : "default",
                  }}
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
      </div>

      <form className="project-card" onSubmit={handleCostSubmit}>
        <h3>{editingCostId === null ? "工事原価を登録" : "工事原価を編集"}</h3>

        <div>
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
          <div>
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

        <div>
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

        <div>
          <label>発生日</label>

          <input
            type="date"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
          />
        </div>

        <div>
          <label>メモ</label>

          <input
            value={memo}
            maxLength={200}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="例：木くず処分"
          />
        </div>

        {submitError && <p role="alert">{submitError}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? editingCostId === null
              ? "登録中..."
              : "更新中..."
            : editingCostId === null
              ? "原価を登録"
              : "原価を更新"}
        </button>

        {editingCostId !== null && (
          <button type="button" onClick={cancelCostEdit}>
            編集をキャンセル
          </button>
        )}
      </form>

      <div className="project-card">
        <h3>登録履歴</h3>

        {project.costs.length === 0 && <p>登録された工事原価はありません。</p>}

        {costActionError && <p role="alert">{costActionError}</p>}

        {project.costs.map((entry) => (
          <div key={entry.id} className="cost-row">
            <span>
              {categoryLabels[entry.category]}
              {entry.detail ? ` / ${entry.detail}` : ""}
              {entry.memo ? `（${entry.memo}）` : ""}
            </span>

            <span>
              {entry.amount.toLocaleString()}円 /{" "}
              {new Date(entry.occurredAt).toLocaleDateString("ja-JP")}
            </span>

            <span
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <button
                type="button"
                style={{ width: "auto" }}
                onClick={() => startCostEdit(entry)}
              >
                編集
              </button>

              <button
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
      </div>
    </div>
  );
}
