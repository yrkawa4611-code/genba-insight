export type Schedule = {
  startDate: string;
  plannedEndDate: string | null;
  completedDate: string | null;
};

export const japanToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
export const dateKey = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date(value)) : "";

export function scheduleStatus(project: Schedule, today = japanToday()) {
  if (project.completedDate) return { label: "完工済み", tone: "completed" };
  if (project.plannedEndDate && dateKey(project.plannedEndDate) < today) return { label: "予定超過", tone: "overdue" };
  if (dateKey(project.startDate) > today) return { label: "着工前", tone: "upcoming" };
  return { label: "施工中", tone: "active" };
}

export function weekSegments(projects: (Schedule & { id: number })[], weekStart: string, weekEnd: string) {
  const lanes: string[] = [];
  return projects.map(project => ({ project, start: dateKey(project.startDate), end: dateKey(project.completedDate || project.plannedEndDate || project.startDate) }))
    .filter(item => item.start <= weekEnd && item.end >= weekStart)
    .sort((a, b) => a.start.localeCompare(b.start) || a.project.id - b.project.id)
    .map(item => {
      const start = item.start < weekStart ? weekStart : item.start;
      const end = item.end > weekEnd ? weekEnd : item.end;
      let lane = lanes.findIndex(lastEnd => lastEnd < start);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = end;
      const dayOffset = (date: string) => Math.round((Date.parse(date) - Date.parse(weekStart)) / 86400000);
      return { id: item.project.id, column: dayOffset(start) + 1, span: dayOffset(end) - dayOffset(start) + 1, lane };
    });
}
