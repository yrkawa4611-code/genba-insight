import ScheduleFields from "../components/ScheduleFields";
import { japanToday } from "../schedule";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type Project = {
  laborUnitPrice: number | null;
  hasAdditionalWork: boolean | null; targetProfitMargin: number | null;
  name: string | null;
  address: string;
  structure: string;
  areaTsubo: number;
  contractPrice: number;
  calendarEntryId?: number;
  startDate: string;
  plannedEndDate: string | null;
  completedDate: string | null;
  originalPlannedEndDate?: string | null;
};

type Props = {
  addProject: (project: Project) => Promise<void>;
};

export default function ProjectCreatePage({ addProject }: Props) {
  const [params] = useSearchParams();
  const calendarEntryId = Number(params.get("calendarEntryId")) || undefined;
  const [additionalWork, setAdditionalWork] = useState("");
  const [laborUnitPrice, setLaborUnitPrice] = useState("");
  const [name, setName] = useState(params.get("name") || "");
  const [targetProfitMargin, setTargetProfitMargin] = useState("");
  const [address, setAddress] = useState("");
  const [structure, setStructure] = useState("");
  const [areaTsubo, setAreaTsubo] = useState("");
  const [contractPrice, setContractPrice] = useState("");
  const [startDate, setStartDate] = useState(params.get("startDate") || "");
  const [plannedEndDate, setPlannedEndDate] = useState(params.get("plannedEndDate") || "");
  const [completedDate, setCompletedDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const unitPrice = Number(areaTsubo) > 0 ? Number(contractPrice) / Number(areaTsubo) : 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if ((plannedEndDate && plannedEndDate < startDate) || (completedDate && completedDate < startDate) || (completedDate && completedDate > japanToday())) {
      setError("完工予定日・完工日は着工日以降、完工日は今日以前で入力してください。");
      return;
    }
    setIsSubmitting(true);

    try {
      await addProject({
        calendarEntryId,
        hasAdditionalWork: additionalWork === "" ? null : additionalWork === "true",
        name: name.trim() || null,
        laborUnitPrice: laborUnitPrice === "" ? null : Number(laborUnitPrice),
        targetProfitMargin: targetProfitMargin === "" ? null : Number(targetProfitMargin),
        address,
        structure,
        areaTsubo: Number(areaTsubo),
        contractPrice: Number(contractPrice),
        startDate,
        plannedEndDate: plannedEndDate || null,
        completedDate: completedDate || null,
      });
      navigate(calendarEntryId ? "/projects/calendar" : "/projects");
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
          <label htmlFor="labor-unit-price">人工単価（1人・1日／円・任意）</label>
          <input id="labor-unit-price" type="number" min="1" max="1000000" step="1" value={laborUnitPrice} onChange={(event) => setLaborUnitPrice(event.target.value)} placeholder="20000" />
        </div>
        <div>
          <label htmlFor="target-margin">目標粗利率（任意・％）</label>
          <input id="target-margin" type="number" min="0" max="100" step="1" placeholder="30" value={targetProfitMargin} onChange={(event) => setTargetProfitMargin(event.target.value)} />
        </div>
        <div>
          <label htmlFor="additional-work">付帯工事</label>
          <select id="additional-work" value={additionalWork} onChange={(event) => setAdditionalWork(event.target.value)}>
            <option value="">未設定</option>
            <option value="true">あり</option>
            <option value="false">なし</option>
          </select>
        </div>
        <div>
          <label htmlFor="project-name">工事名（任意）</label><br />
          <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="田中様邸 解体工事" />
        </div>
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
          <label>着工日</label><br />
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </div>
        <ScheduleFields startDate={startDate} plannedEndDate={plannedEndDate} completedDate={completedDate} onPlannedChange={setPlannedEndDate} onCompletedChange={setCompletedDate} />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "登録中..." : "登録"}
        </button>
      </form>
    </div>
  );
}
