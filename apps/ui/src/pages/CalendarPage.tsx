import CalendarEntryEditor, { type CalendarEntry, type CalendarProject, type CalendarDraft } from "../components/CalendarEntryEditor";
import { apiUrl, authFetch } from "../auth";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dateKey, japanToday, scheduleStatus, weekSegments } from "../schedule";

type CalendarItem = CalendarProject & { entryId?: number; recorderName: string | null; memo: string | null; projectId: number | null };

const key = (value: Date) => value.toISOString().slice(0, 10);

export default function CalendarPage() {
  const [registeredProjects, setRegisteredProjects] = useState<CalendarProject[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<CalendarDraft | null>(null);
  const fetchData = useCallback(async () => {
    const [entryResponse, projectResponse] = await Promise.all([authFetch(apiUrl + "/calendar"), authFetch(apiUrl + "/projects")]);
    if (!entryResponse.ok || !projectResponse.ok) throw new Error("日程を読み込めませんでした。");
    const [entries, projects] = await Promise.all([entryResponse.json(), projectResponse.json()]);
    return { entries: entries as CalendarEntry[], projects: projects as CalendarProject[] };
  }, []);
  const applyData = useCallback((data: { entries: CalendarEntry[]; projects: CalendarProject[] }) => {
    setEntries(data.entries); setRegisteredProjects(data.projects); setError(""); setIsLoading(false);
  }, []);
  const load = async () => {
    try { applyData(await fetchData()); }
    catch { setError("予定は保存しましたが、一覧を再取得できませんでした。画面を再読み込みしてください。"); }
  };
  useEffect(() => {
    let active = true;
    void fetchData().then(data => { if (active) applyData(data); }).catch(error => {
      if (active) { setError(error instanceof Error ? error.message : "通信に失敗しました。"); setIsLoading(false); }
    });
    return () => { active = false; };
  }, [fetchData, applyData]);
  const linkedIds = new Set(entries.map(entry => entry.projectId));
  const projects: CalendarItem[] = [
    ...entries.map(entry => {
      const project = registeredProjects.find(project => project.id === entry.projectId);
      return { id: entry.id, entryId: entry.id, projectId: project?.id ?? null, name: entry.title, address: "", recorderName: entry.recorderName, memo: entry.memo, startDate: project?.startDate || entry.startDate, plannedEndDate: project ? project.plannedEndDate : entry.plannedEndDate, completedDate: project?.completedDate || null };
    }),
    ...registeredProjects.filter(project => !linkedIds.has(project.id)).map(project => ({ ...project, id: -project.id, projectId: project.id, recorderName: null, memo: null })),
  ];
  const add = (date: string) => setDraft({ title: "", recorderName: "", startDate: date, plannedEndDate: null, projectId: null, memo: null });
  const edit = (project: CalendarItem) => setDraft({ id: project.entryId, title: project.name || project.address, recorderName: project.recorderName || "", startDate: project.startDate, plannedEndDate: project.plannedEndDate, projectId: project.projectId, memo: project.memo });
  const registration = (project: CalendarItem) => project.projectId ? "現場登録済み" : "現場未登録";
  const today = japanToday();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const last = new Date(Date.UTC(year, monthNumber, 0));
  const gridStart = new Date(first);
  gridStart.setUTCDate(1 - first.getUTCDay());
  const weeks = Math.ceil((first.getUTCDay() + last.getUTCDate()) / 7);
  const moveMonth = (offset: number) => setMonth(key(new Date(Date.UTC(year, monthNumber - 1 + offset, 1))).slice(0, 7));
  const visibleProjects = projects.filter(project => dateKey(project.startDate) <= key(last) && dateKey(project.completedDate || project.plannedEndDate || project.startDate) >= key(first));

  return <main className="project-page calendar-page">
    <header className="page-header"><div><p className="eyebrow">CALENDAR</p><h1>現場カレンダー</h1><p className="page-description">日付から予定を追加できます。帯を押すと予定を編集できます。</p></div>
      <div className="header-actions"><button className="button button-primary" onClick={() => add(today)}>＋ 予定を追加</button><Link className="button button-secondary" to="/projects">現場一覧</Link><Link className="button button-primary" to="/projects/create">＋ 現場登録</Link></div>
    </header>
    <div className="calendar-toolbar"><h2 aria-live="polite">{year}年{monthNumber}月</h2><div className="header-actions"><button className="button button-secondary" onClick={() => moveMonth(-1)}>前月</button><button className="button button-secondary" onClick={() => setMonth(today.slice(0, 7))}>今月</button><button className="button button-secondary" onClick={() => moveMonth(1)}>翌月</button></div></div>
    <div className="calendar-legend">着工前 ／ 施工中 ／ 完工済み ／ <span className="text-danger">予定超過</span></div>
    {draft && <CalendarEntryEditor draft={draft} projects={registeredProjects.filter(project => !entries.some(entry => entry.projectId === project.id && entry.id !== draft.id))} onClose={() => setDraft(null)} onSaved={load} />}
    {isLoading && <div className="state-panel" role="status">日程を読み込み中です...</div>}
    {error && <div className="state-panel state-panel-error" role="alert">{error}</div>}
    {!isLoading && !error && <>
      <div className="calendar-scroll"><section className="calendar-grid" aria-label={`${year}年${monthNumber}月の現場日程`}>
        <div className="calendar-weekdays">{["日", "月", "火", "水", "木", "金", "土"].map(day => <div key={day}>{day}</div>)}</div>
        {Array.from({ length: weeks }, (_, week) => {
          const days = Array.from({ length: 7 }, (_, day) => new Date(gridStart.getTime() + (week * 7 + day) * 86400000));
          const segments = weekSegments(projects, key(days[0]), key(days[6]));
          return <div className="calendar-week" key={week}>
            <div className="calendar-days">{days.map(day => <div key={key(day)} className={`${day.getUTCMonth() !== monthNumber - 1 ? "calendar-outside" : ""} ${key(day) === today ? "calendar-today" : ""}`}><button type="button" className="calendar-date-button" onClick={() => add(key(day))} aria-label={`${key(day)}に予定を追加`}><time dateTime={key(day)}>{day.getUTCDate()}</time><span aria-hidden="true">＋</span></button></div>)}</div>
            <div className="calendar-events" style={{ minHeight: Math.max(72, (Math.max(-1, ...segments.map(segment => segment.lane)) + 1) * 56) }}>
              {segments.map(segment => {
                const project = projects.find(project => project.id === segment.id)!;
                const status = scheduleStatus(project, today);
                const label = `${project.name || project.address}・${registration(project)}・記入者：${project.recorderName || "未記録"}・${status.label}${!project.plannedEndDate ? "・完工予定日未設定" : ""}`;
                return <button type="button" onClick={() => edit(project)} key={project.id} className={`calendar-event calendar-${status.tone}`} style={{ gridColumn: `${segment.column} / span ${segment.span}`, gridRow: segment.lane + 1 }} title={label} aria-label={label}><strong>{project.name || project.address}</strong><small>{registration(project)} ／ 記入者：{project.recorderName || "未記録"}</small></button>;
              })}
            </div>
          </div>;
        })}
      </section></div>
      <section className="calendar-month-list" aria-label="今月の現場一覧"><h2>この月の現場（{visibleProjects.length}件）</h2>
        {visibleProjects.length === 0 && <p>この月に表示する現場はありません。</p>}
        {visibleProjects.map(project => <article className="calendar-list-item" key={project.id}>
          <button className="calendar-list-edit" onClick={() => edit(project)}><strong>{project.name || project.address}</strong><span>{registration(project)} · 記入者：{project.recorderName || "未記録"}</span><span>{scheduleStatus(project, today).label} · {dateKey(project.startDate)} 〜 {dateKey(project.completedDate || project.plannedEndDate) || "完工予定日未設定"}</span></button>
          {project.memo && <p className="calendar-help">{project.memo}</p>}
          {project.projectId && <Link to={`/projects/${project.projectId}`}>現場詳細</Link>}
          {!project.projectId && project.entryId && <Link to={`/projects/create?${new URLSearchParams({ calendarEntryId: String(project.entryId), name: project.name || "", startDate: dateKey(project.startDate), plannedEndDate: dateKey(project.plannedEndDate) })}`}>現場登録へ</Link>}
        </article>)}

      </section>
    </>}
  </main>;
}
