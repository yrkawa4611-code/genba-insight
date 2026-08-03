import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const apiUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

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

export default function ProjectDetailPage({
  projects,
  deleteProject,
  updateProjectCost,
}: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = Number(id);

  const [project, setProject] =
    useState<ProjectDetail | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [category, setCategory] =
    useState<CostCategory>("DISPOSAL");

  const [amount, setAmount] = useState("");

  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  const fetchProject = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new Error("現場IDが正しくありません。");
    }

    const response = await fetch(
      `${apiUrl}/projects/${projectId}`,
    );

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
          error instanceof Error
            ? error.message
            : "通信エラーが発生しました。",
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

  const handleCostSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${apiUrl}/projects/${projectId}/costs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category,
            amount: Number(amount),
            occurredAt,
            memo: memo.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "工事原価の登録に失敗しました。入力内容を確認してください。",
        );
      }

      setAmount("");
      setMemo("");

      const updatedProject = await fetchProject();

      setProject(updatedProject);
      updateProjectCost(
        updatedProject.id,
        updatedProject.cost,
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "通信エラーが発生しました。",
      );
    } finally {
      setIsSubmitting(false);
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
      error instanceof Error
        ? error.message
        : "通信エラーが発生しました。",
    );
  } finally {
    setIsDeleting(false);
  }
};

  if (isLoading) {
    return (
      <div className="project-page">
        現場詳細を読み込み中です...
      </div>
    );
  }

  if (loadError || !project) {
    const projectExistsInList = projects.some(
      (item) => item.id === projectId,
    );

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

  const categoryTotals =
    project.costs.reduce<Record<string, number>>(
      (totals, entry) => {
        totals[entry.category] =
          (totals[entry.category] ?? 0) + entry.amount;

        return totals;
      },
      {},
    );

  return (
    <div className="project-page">
      <h1>現場詳細</h1>

      <button
        className="add-button"
        onClick={() => navigate("/projects")}
      >
        一覧に戻る
      </button>

      <button
        className="add-button"
        onClick={() =>
          navigate(`/projects/${project.id}/edit`)
        }
      >
        編集
      </button>

      <button
        onClick={() => void handleDelete()}
        disabled={isDeleting}
      >
        {isDeleting ? "削除中..." : "削除"}
      </button>

      {deleteError && (
        <p role="alert">{deleteError}</p>
      )}

      <div className="project-card">
        <h3>{project.address}</h3>

        <p>
          {project.structure} / {project.areaTsubo}坪
        </p>

        <p>
          請負金額：
          {project.contractPrice.toLocaleString()}円
        </p>

        <p>
          工事原価：{project.cost.toLocaleString()}円
        </p>

        <p>粗利：{profit.toLocaleString()}円</p>
      </div>

      <div className="project-card">
        <h3>工事原価内訳</h3>

        {(
          Object.entries(categoryLabels) as [
            CostCategory,
            string,
          ][]
        ).map(([categoryKey, label]) => (
          <div key={categoryKey} className="cost-row">
            <span>{label}</span>

            <span>
              {(
                categoryTotals[categoryKey] ?? 0
              ).toLocaleString()}
              円
            </span>
          </div>
        ))}
      </div>

      <form
        className="project-card"
        onSubmit={handleCostSubmit}
      >
        <h3>工事原価を登録</h3>

        <div>
          <label>カテゴリ</label>

          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value as CostCategory,
              )
            }
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "12px",
            }}
          >
            {(
              Object.entries(categoryLabels) as [
                CostCategory,
                string,
              ][]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>金額</label>

          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>発生日</label>

          <input
            type="date"
            value={occurredAt}
            onChange={(event) =>
              setOccurredAt(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>メモ</label>

          <input
            value={memo}
            maxLength={200}
            onChange={(event) =>
              setMemo(event.target.value)
            }
            placeholder="例：木くず処分"
          />
        </div>

        {submitError && (
          <p role="alert">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "登録中..."
            : "原価を登録"}
        </button>
      </form>

      <div className="project-card">
        <h3>登録履歴</h3>

        {project.costs.length === 0 && (
          <p>登録された工事原価はありません。</p>
        )}

        {project.costs.map((entry) => (
          <div key={entry.id} className="cost-row">
            <span>
              {categoryLabels[entry.category]}
              {entry.memo
                ? `（${entry.memo}）`
                : ""}
            </span>

            <span>
              {entry.amount.toLocaleString()}円 /{" "}
              {new Date(
                entry.occurredAt,
              ).toLocaleDateString("ja-JP")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}