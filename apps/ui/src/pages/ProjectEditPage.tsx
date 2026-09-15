import { useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

type Project = {
  id: number;
  laborUnitPrice: number | null;
  targetProfitMargin: number | null;
  name: string | null;
  address: string;
  structure: string;
  areaTsubo: number;
  contractPrice: number;
  startDate: string;
  cost: number;
};

type UpdateProjectInput = Omit<
  Project,
  "id" | "cost"
>;

type Props = {
  projects: Project[];
  updateProject: (
    id: number,
    project: UpdateProjectInput,
  ) => Promise<void>;
};

const toDateInputValue = (value: string) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));

export default function ProjectEditPage({
  projects,
  updateProject,
}: Props) {
  const { id } = useParams();

  const project = projects.find(
    (item) => item.id === Number(id),
  );

  if (!project) {
    return (
      <div className="project-page">
        現場を読み込み中です...
      </div>
    );
  }

  return (
    <ProjectEditForm
      project={project}
      updateProject={updateProject}
    />
  );
}

type FormProps = {
  project: Project;
  updateProject: (
    id: number,
    project: UpdateProjectInput,
  ) => Promise<void>;
};

function ProjectEditForm({
  project,
  updateProject,
}: FormProps) {
  const navigate = useNavigate();
  const [laborUnitPrice, setLaborUnitPrice] = useState(project.laborUnitPrice?.toString() ?? "");
  const [name, setName] = useState(project.name ?? "");
  const [targetProfitMargin, setTargetProfitMargin] = useState(project.targetProfitMargin?.toString() ?? "");

  const [address, setAddress] =
    useState(project.address);

  const [structure, setStructure] =
    useState(project.structure);

  const [areaTsubo, setAreaTsubo] = useState(
    project.areaTsubo.toString(),
  );

  const [contractPrice, setContractPrice] =
    useState(project.contractPrice.toString());

  const [startDate, setStartDate] = useState(
    toDateInputValue(project.startDate),
  );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const unitPrice =
    Number(areaTsubo) > 0
      ? Number(contractPrice) / Number(areaTsubo)
      : 0;

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await updateProject(project.id, {
        name: name.trim() || null,
        laborUnitPrice: laborUnitPrice === "" ? null : Number(laborUnitPrice),
        targetProfitMargin: targetProfitMargin === "" ? null : Number(targetProfitMargin),
        address,
        structure,
        areaTsubo: Number(areaTsubo),
        contractPrice: Number(contractPrice),
        startDate,
      });

      navigate(`/projects/${project.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "通信エラーが発生しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="project-page">
      <h1>現場編集</h1>

      <form
        className="project-card"
        onSubmit={handleSubmit}
      >
        <div>
          <label htmlFor="labor-unit-price">人工単価（1人・1日／円・任意）</label>
          <input id="labor-unit-price" type="number" min="1" max="1000000" step="1" value={laborUnitPrice} onChange={(event) => setLaborUnitPrice(event.target.value)} placeholder="20000" />
        </div>
        <div>
          <label htmlFor="target-margin">目標粗利率（任意・％）</label>
          <input id="target-margin" type="number" min="0" max="100" step="1" placeholder="30" value={targetProfitMargin} onChange={(event) => setTargetProfitMargin(event.target.value)} />
        </div>
        <div>
          <label htmlFor="project-name">工事名（任意）</label>
          <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="田中様邸 解体工事" />
        </div>
        <div>
          <label>住所</label>

          <input
            value={address}
            onChange={(event) =>
              setAddress(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>構造</label>

          <input
            value={structure}
            onChange={(event) =>
              setStructure(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>坪数</label>

          <input
            type="number"
            min="0.01"
            step="any"
            value={areaTsubo}
            onChange={(event) =>
              setAreaTsubo(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>請負金額</label>

          <input
            type="number"
            min="0"
            step="1"
            value={contractPrice}
            onChange={(event) =>
              setContractPrice(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>坪単価（自動計算）</label>

          <p>
            {unitPrice.toLocaleString()}円 / 坪
          </p>
        </div>

        <div>
          <label>開始日</label>

          <input
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
            required
          />
        </div>

        {error && <p role="alert">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "更新中..." : "更新"}
        </button>
      </form>
    </div>
  );
}
