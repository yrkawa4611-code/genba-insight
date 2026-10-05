import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl, authFetch } from "../auth";
import { dateKey } from "../schedule";

export type CalendarEntry = {
  id: number; projectId: number | null; title: string; recorderName: string;
  startDate: string; plannedEndDate: string | null; memo: string | null;
};
export type CalendarProject = {
  id: number; name: string | null; address: string; startDate: string;
  plannedEndDate: string | null; completedDate: string | null;
};
export type CalendarDraft = Omit<CalendarEntry, "id"> & { id?: number };
type Props = { draft: CalendarDraft; projects: CalendarProject[]; onClose: () => void; onSaved: () => Promise<void> };

export default function CalendarEntryEditor({ draft, projects, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(draft.title);
  const [recorderName, setRecorderName] = useState(draft.recorderName);
  const [startDate, setStartDate] = useState(dateKey(draft.startDate));
  const [plannedEndDate, setPlannedEndDate] = useState(dateKey(draft.plannedEndDate));
  const [projectId, setProjectId] = useState(draft.projectId?.toString() || "");
  const [memo, setMemo] = useState(draft.memo || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);

  const chooseProject = (value: string) => {
    setProjectId(value);
    const project = projects.find(project => project.id === Number(value));
    if (project) {
      setTitle(project.name || project.address);
      setStartDate(dateKey(project.startDate));
      setPlannedEndDate(dateKey(project.plannedEndDate));
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (plannedEndDate && plannedEndDate < startDate) { setError("完工予定日は着工日以降にしてください。"); return; }
    setSaving(true);
    try {
      const response = await authFetch(`${apiUrl}/calendar${draft.id ? `/${draft.id}` : ""}`, {
        method: draft.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), recorderName: recorderName.trim(), startDate, plannedEndDate: plannedEndDate || null, projectId: projectId ? Number(projectId) : null, memo: memo.trim() || null }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "予定を保存できませんでした。入力内容を確認してください。");
      }
      await onSaved();
      onClose();
    } catch (error) { setError(error instanceof Error ? error.message : "通信に失敗しました。"); }
    finally { setSaving(false); }
  };
  const registerParams = new URLSearchParams({ calendarEntryId: String(draft.id), name: title, startDate, plannedEndDate });

  return <dialog className="calendar-dialog" ref={dialog} aria-labelledby="entry-editor-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={submit}>
      <h2 id="entry-editor-title">{draft.id ? "予定を編集" : "予定を追加"}</h2>
      <fieldset disabled={saving}>
        <label htmlFor="entry-title">現場名・予定名</label><input id="entry-title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={200} />
        <label htmlFor="entry-recorder">記入者名</label><input id="entry-recorder" value={recorderName} onChange={event => setRecorderName(event.target.value)} required maxLength={100} placeholder="例：田中" />
        <p className="calendar-help">会社共通のログインのため、記入者名は入力して保存します。</p>
        <label htmlFor="entry-project">現場登録</label><select id="entry-project" value={projectId} onChange={event => chooseProject(event.target.value)}><option value="">未登録の予定として保存</option>{projects.map(project => <option key={project.id} value={project.id}>登録済み：{project.name || project.address}</option>)}</select>
        <label htmlFor="entry-start">着工日</label><input id="entry-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required />
        <label htmlFor="entry-end">完工予定日（任意）</label><input id="entry-end" type="date" value={plannedEndDate} min={startDate || undefined} onChange={event => setPlannedEndDate(event.target.value)} />
        {projectId && <p className="calendar-help">日付を変更すると、紐づけた現場の日付も更新します。</p>}
        <label htmlFor="entry-memo">メモ（任意）</label><textarea id="entry-memo" value={memo} onChange={event => setMemo(event.target.value)} maxLength={2000} rows={3} />
      </fieldset>
      {error && <p className="text-danger" role="alert">{error}</p>}
      <div className="header-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>閉じる</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "保存中…" : "保存"}</button></div>
      {!saving && draft.id && !draft.projectId && <p className="calendar-help"><Link to={`/projects/create?${registerParams}`}>この予定から現場登録へ</Link>（変更は先に保存してください）</p>}
      {!saving && draft.projectId && <p><Link to={`/projects/${draft.projectId}`}>現場詳細を開く</Link></p>}
    </form>
  </dialog>;
}
