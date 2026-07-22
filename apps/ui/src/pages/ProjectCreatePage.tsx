import { useState } from "react";
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
  addProject: (project: Project) => void;
};

export default function ProjectCreatePage({ addProject } : Props) {
    const [address,setAddress] = useState("");
    const [structure, setStructure] = useState("");
    const [areaTsubo, setAreaTsubo] = useState("");
    const [contractPrice, setContractPrice] = useState("");
    const [date,setDate] = useState("");

    const navigate = useNavigate();


    const unitPrice =
        Number(areaTsubo) > 0
            ? Number(contractPrice) / Number(areaTsubo)
            : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        addProject ({
            id: Date.now(),
            address,
            structure,
            areaTsubo: Number(areaTsubo),
            contractPrice: Number(contractPrice),
            cost: 0,
        });

        navigate("/projects");
    };

    return (
        <div style={{ padding: "16px" }}>
            <h1>現場登録</h1>

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
                    登録
                </button>
            </form>
        </div>
    );
}