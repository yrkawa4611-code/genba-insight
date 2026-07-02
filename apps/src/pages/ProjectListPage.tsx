import { useNavigate } from "react-router-dom";


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
};

export default function ProjectListPage({ projects }: Props) {

  const navigate = useNavigate();


  return (
    <div className="project-page">
      <div className="page-header">
        <h1>現場一覧</h1>

        <button
          className="add-button"
          onClick={() => navigate("/projects/create")}
        >
          + 現場登録
        </button>

      </div>

      {projects.map((project) => {
        const profit =
          project.contractPrice - project.cost;

        return (
          <div
            key={project.id}
            className="project-card"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <h3>{project.address}</h3>

            <p>{project.structure}</p>

            <p>{project.areaTsubo}坪</p>

            <p>
              請負金額：
              {project.contractPrice.toLocaleString()}円
            </p>

            <p>
              工事原価：
              {project.cost.toLocaleString()}円
            </p>

            <p>
              粗利：
              {profit.toLocaleString()}円
            </p>
          </div>
        );
      })}
    </div>
  );
}