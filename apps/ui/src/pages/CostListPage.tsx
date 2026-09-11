import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl, authFetch } from "../auth";
import { categoryLabels, isMetalSale, normalizeCostDetail, type CostCategory } from "../costCategories";

type CostEntry = {
  id: number;
  category: CostCategory;
  detail: string | null;
  amount: number;
  occurredAt: string;
  memo: string | null;
  project: {
    id: number;
    address: string;
  };
};

const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;
const date = (value: string) => new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Tokyo",
}).format(new Date(value));

export default function CostListPage() {
  const navigate = useNavigate();
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const loadCosts = async () => {
      try {
        const response = await authFetch(`${apiUrl}/costs`);

        if (!response.ok) {
          throw new Error("原価一覧の取得に失敗しました。");
        }

        const data = await response.json() as CostEntry[];
        if (!isCancelled) {
          setCosts(data);
          setError("");
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "通信エラーが発生しました。");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadCosts();
    return () => { isCancelled = true; };
  }, []);

  return (
    <main className="project-page cost-list-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">COSTS</p>
          <h1>原価一覧</h1>
          <p className="page-description">会社内の全現場に登録された原価を新しい順に確認できます</p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => navigate("/projects")}>← 現場一覧</button>
      </header>

      {isLoading && <div className="state-panel" role="status"><span className="loading-dot" />原価一覧を読み込み中です...</div>}
      {!isLoading && error && <div className="state-panel state-panel-error" role="alert">{error}</div>}
      {!isLoading && !error && costs.length === 0 && (
        <div className="empty-state"><h2>登録された原価はありません</h2><p>各現場の詳細画面から原価を登録できます。</p></div>
      )}
      {!isLoading && !error && costs.length > 0 && (
        <section className="cost-list" aria-label="原価">
          <div className="cost-list-header" aria-hidden="true">
            <span>発生日</span><span>現場</span><span>カテゴリー</span><span>金額</span><span>メモ</span><span />
          </div>
          {costs.map((entry) => {
            const openProject = () => navigate(`/projects/${entry.project.id}`);
            const sale = isMetalSale(entry);
            return (
              <article
                key={entry.id}
                className="cost-list-row"
                role="link"
                tabIndex={0}
                onClick={openProject}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openProject();
                  }
                }}
              >
                <span className="cost-list-date" data-label="発生日">{date(entry.occurredAt)}</span>
                <strong className="cost-list-project" data-label="現場">{entry.project.address}</strong>
                <span className="cost-list-category" data-label="カテゴリー">
                  <span>{sale ? "売却収入" : categoryLabels[entry.category]}</span>
                  {entry.detail && <small>{normalizeCostDetail(entry.category, entry.detail)}</small>}
                </span>
                <strong className={`cost-list-amount${sale ? " text-success" : ""}`} data-label="金額">{sale ? "+" : ""}{yen(entry.amount)}</strong>
                <span className="cost-list-memo" data-label="メモ">{entry.memo || "—"}</span>
                <span className="cost-list-arrow" aria-hidden="true">→</span>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
