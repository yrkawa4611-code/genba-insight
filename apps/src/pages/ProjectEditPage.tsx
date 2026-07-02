import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
  updateProject: (project: Project) => void;
};

export default function ProjectEditPage({ 
    projects,
    updateProject, 
}: Props) {

    const { id } = useParams();

    const project = projects.find(
        (project) => project.id === Number(id)
    );
    const [address,setAddress] = useState(project?.address ??"");
    const [structure, setStructure] = useState(project?.structure ?? "");
    const [areaTsubo, setAreaTsubo] = useState(
        project?.areaTsubo.toString() ?? ""
    );
    const [contractPrice, setContractPrice] = useState(
        project?.contractPrice.toString() ?? ""
    );
    const [date,setDate] = useState("");


    const navigate = useNavigate();


    const unitPrice =
        Number(areaTsubo) > 0
            ? Number(contractPrice) / Number(areaTsubo)
            : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!project) {
            return;
        }

        updateProject({
        id: project.id,
        address,
        structure,
        areaTsubo: Number(areaTsubo),
        contractPrice: Number(contractPrice),
        cost: project.cost,
        });

        navigate(`/projects/${project.id}`);
    };

    return (
        <div style={{ padding: "16px" }}>
            <h1>編集</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>住所</label>
                    <br />
                    <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </div>

                <div>
                    <label>構造</label>
                    <br />
                    <input
                        value={structure}
                        onChange={(e) => setStructure(e.target.value)}
                    />
                </div>

                <div>
                    <label>坪数</label>
                    <br />
                    <input 
                        type="number"
                        value={areaTsubo}
                        onChange={(e) => setAreaTsubo(e.target.value)}
                    />
                </div>

                <div>
                    <label>請負金額</label>
                    <br />
                    <input 
                        type="number"
                        value={contractPrice}
                        onChange={(e) => setContractPrice(e.target.value)} 
                    />
                </div>

                <div>
                    <label>坪単価（自動計算）</label>
                    <p>
                        {unitPrice.toLocaleString()}円 / 坪
                    </p>
                </div>

                <div>
                    <label>日付</label>
                    <br />
                    <input 
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)} 
                    />
                </div>

                <button type="submit">
                    更新
                </button>
            </form>
        </div>
    );
}