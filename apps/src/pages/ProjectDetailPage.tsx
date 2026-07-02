import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";


type Project = {
  id: number;
  address: string;
  structure: string;
  areaTsubo: number;
  contractPrice: number;
  cost: number;
}

type Props = {
  projects: Project[];
  deleteProject: (id: number) => void;
};


export default function ProjectDetailPage({ 
  projects,
  deleteProject, 
}: Props) {

  const { id } = useParams();
  const navigate = useNavigate();
  const [isDisposalOpen, setIsDisposalOpen] = useState(false);
  const project = projects.find(
    (project) => project.id === Number(id)
  );

  if (!project) {
      return <div>現場が見つかりません</div>
  }

  const costBreakdown = [
    { label: "処分代", amount: 300000 },
    { label: "人工", amount: 200000 },
    { label: "車両", amount: 80000 },
    { label: "重機", amount: 100000 },
    { label: "アタッチメント", amount: 20000 },
    { label: "外注", amount: 30000 },
    { label: "雑費", amount: 20000 },
  ];

  const disposalBreakdown = [
    { label: "木くず", amount: 100000 },
    { label: "生木", amount: 60000 },
    { label: "コンクリート", amount: 80000 },
    { label: "廃プラスチック", amount: 20000 },
    { label: "石", amount: 30000 },
    { label: "その他", amount: 10000 },
  ];

  const profit = project.contractPrice - project.cost;

  console.log(id);

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
        onClick={() => navigate(`/projects/${project.id}/edit`)}
      >
        編集
      </button>

      <button
        onClick={() => {
          if (window.confirm("本当に削除しますか？")) {
            deleteProject(project.id);
            navigate("/projects");
          }
        }}
      >
        削除
      </button>

      <div className="project-card">
        <h3>{project.address}</h3>
        <p>{project.structure} / {project.areaTsubo}坪</p>
        <p>請負金額：{project.contractPrice.toLocaleString()}円</p>
        <p>工事原価：{project.cost.toLocaleString()}円</p>
        <p>粗利：{profit.toLocaleString()}円</p>
      </div>

      <div className="project-card">
        <h3>工事原価内訳</h3>

        {costBreakdown.map((cost) => {
          if (cost.label === "処分代") {
            return (
              <div
                key={cost.label}
                className="cost-row"
                onClick={() => setIsDisposalOpen(!isDisposalOpen)}
              >
                <p>
                  {isDisposalOpen ? "▼" : "▶"} {cost.label}：
                  {cost.amount.toLocaleString()}円
                </p>

                {isDisposalOpen && (
                  <div className="disposal-detail">
                    {disposalBreakdown.map((item) => (
                      <p key={item.label}>
                        {item.label}：{item.amount.toLocaleString()}円
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={cost.label}
              className="cost-row"
            >
              <span>{cost.label}</span>

              <span>
                {cost.amount.toLocaleString()}円
              </span>

            </div>
          );
        })}
      </div>
    </div>
  );
}