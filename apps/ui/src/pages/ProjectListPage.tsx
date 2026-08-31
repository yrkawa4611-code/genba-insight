import { useNavigate } from "react-router-dom";
import { clearToken } from "../auth";

type Project = { id: number; address: string; structure: string; areaTsubo: number; contractPrice: number; startDate: string; cost: number };
type Props = { projects: Project[]; isLoading: boolean; error: string; onLogout: () => void };

const yen = (value: number) => `\u00a5${value.toLocaleString("ja-JP")}`;
const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tokyo",
  }).format(parsed);
};

export default function ProjectListPage({ projects, isLoading, error, onLogout }: Props) {
  const navigate = useNavigate();
  const logout = () => { clearToken(); onLogout(); navigate("/", { replace: true }); };

  return (
    <main className="project-page project-list-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">PROJECTS</p>
          <h1>現場一覧</h1>
          <p className="page-description">現場ごとの契約・原価・粗利を確認できます</p>
        </div>
        <div className="header-actions">
          <button className="button button-secondary" type="button" onClick={logout}>ログアウト</button>
          <button className="button button-primary" type="button" onClick={() => navigate("/projects/create")}>＋ 現場登録</button>
        </div>
      </header>

      {isLoading && <div className="state-panel" role="status"><span className="loading-dot" />現場一覧を読み込み中です...</div>}
      {error && <div className="state-panel state-panel-error" role="alert">{error}</div>}
      {!isLoading && !error && projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">＋</div><h2>現場がまだ登録されていません</h2>
          <p>最初の現場を登録すると、ここに採算情報が表示されます。</p>
          <button className="button button-primary" onClick={() => navigate("/projects/create")}>現場を登録する</button>
        </div>
      )}

      {!isLoading && !error && projects.length > 0 && <section className="project-grid" aria-label="現場">
        {projects.map((project) => {
          const profit = project.contractPrice - project.cost;
          const margin = project.contractPrice > 0 ? profit / project.contractPrice * 100 : null;
          const ratio = project.contractPrice > 0 ? Math.min(project.cost / project.contractPrice * 100, 100) : 0;
          const loss = profit < 0;
          const open = () => navigate(`/projects/${project.id}`);
          return (
            <article key={project.id} className={`project-card project-summary-card${loss ? " is-loss" : ""}`}
              tabIndex={0} role="link" onClick={open} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
              }}>
              <div className="project-card-header">
                <div><p className="project-meta">{project.structure} ・ {project.areaTsubo.toLocaleString("ja-JP")}坪</p><h2>{project.address}</h2></div>
                <span className={`status-badge ${loss ? "status-loss" : profit > 0 ? "status-profit" : "status-neutral"}`}>
                  <span className="status-dot" />{loss ? "赤字" : profit > 0 ? "黒字" : "未算出"}
                </span>
              </div>
              <p className="project-date">開始日 {date(project.startDate)}</p>
              <div className="project-financials">
                <div className="financial-item"><span>請負金額</span><strong>{yen(project.contractPrice)}</strong></div>
                <div className="financial-item"><span>現在原価</span><strong>{yen(project.cost)}</strong></div>
                <div className="financial-item"><span>粗利</span><strong className={loss ? "text-danger" : "text-success"}>{yen(profit)}</strong></div>
                <div className="financial-item"><span>粗利率</span><strong className={loss ? "text-danger" : ""}>{margin === null ? "—" : `${margin.toFixed(1)}%`}</strong></div>
              </div>
              <div className="cost-progress" aria-label={`原価消化率 ${ratio.toFixed(1)}%`}>
                <div className="cost-progress-label"><span>原価 / 請負金額</span><span>{ratio.toFixed(1)}%</span></div>
                <div className="progress-track"><span className={loss ? "progress-loss" : ""} style={{ width: `${ratio}%` }} /></div>
              </div>
              <div className="project-card-footer"><span>詳細を見る</span><span className="arrow-icon">→</span></div>
            </article>
          );
        })}
      </section>}
    </main>
  );
}
