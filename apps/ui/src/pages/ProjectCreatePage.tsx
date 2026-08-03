import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Project = {
  address: string;
  structure: string;
  areaTsubo: number;
  contractPrice: number;
  startDate: string;
};

type Props = {
  addProject: (project: Project) => Promise<void>;
};

export default function ProjectCreatePage({ addProject }: Props) {
  const [address, setAddress] = useState("");
  const [structure, setStructure] = useState("");
  const [areaTsubo, setAreaTsubo] = useState("");
  const [contractPrice, setContractPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const unitPrice = Number(areaTsubo) > 0 ? Number(contractPrice) / Number(areaTsubo) : 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await addProject({
        address,
        structure,
        areaTsubo: Number(areaTsubo),
        contractPrice: Number(contractPrice),
        startDate,
      });
      navigate("/projects");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <h1>現場登録</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>住所</label><br />
          <input value={address} onChange={(event) => setAddress(event.target.value)} required />
        </div>
        <div>
          <label>構造</label><br />
          <input value={structure} onChange={(event) => setStructure(event.target.value)} required />
        </div>
        <div>
          <label>坪数</label><br />
          <input type="number" min="0.01" step="any" value={areaTsubo} onChange={(event) => setAreaTsubo(event.target.value)} required />
        </div>
        <div>
          <label>契約金額</label><br />
          <input type="number" min="0" step="1" value={contractPrice} onChange={(event) => setContractPrice(event.target.value)} required />
        </div>
        <div>
          <label>坪単価</label>
          <p>{unitPrice.toLocaleString()}円 / 坪</p>
        </div>
        <div>
          <label>開始日</label><br />
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "登録中..." : "登録"}
        </button>
      </form>
    </div>
  );
}
