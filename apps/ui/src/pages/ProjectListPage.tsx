import { useNavigate } from "react-router-dom";
import { clearToken } from "../auth";

type Project = {
  id: number;
  address: string;
  structure: string;
  areaTsubo: number;
  contractPrice: number;
  cost: number;
};

type Props = {
  projects: Project[];
  isLoading: boolean;
  error: string;
  onLogout: () => void;
};

export default function ProjectListPage({ projects, isLoading, error, onLogout }: Props) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    onLogout();
    navigate("/", { replace: true });
  };

  return (
    <div className="project-page">
      <div className="page-header">
        <h1>現場一覧</h1>
        <div className="header-actions">
          <button className="add-button" onClick={() => navigate("/projects/create")}>
            + 現場登録
          </button>
          <button className="logout-button" onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </div>

      {isLoading && <p>現場一覧を読み込み中です...</p>}
      {error && <p role="alert">{error}</p>}

      {!isLoading && !error && projects.map((project) => {
        const profit = project.contractPrice - project.cost;
        const profitMargin =
          project.contractPrice > 0
            ? (profit / project.contractPrice) * 100
            : null;

        return (
          <div key={project.id} className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
            <h3>{project.address}</h3>
            <p>{project.structure}</p>
            <p>{project.areaTsubo}坪</p>
            <p>契約金額：{project.contractPrice.toLocaleString()}円</p>
            <p>工事原価：{project.cost.toLocaleString()}円</p>
            <p>利益：{profit.toLocaleString()}円</p>
            <p>
              粗利率：
              {profitMargin === null ? "算出不可" : `${profitMargin.toFixed(1)}%`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
