import { japanToday } from "../schedule";

type Props = {
  startDate: string;
  plannedEndDate: string;
  completedDate: string;
  onPlannedChange: (value: string) => void;
  onCompletedChange: (value: string) => void;
};

export default function ScheduleFields({ startDate, plannedEndDate, completedDate, onPlannedChange, onCompletedChange }: Props) {
  return <>
    <div><label htmlFor="planned-end-date">完工予定日（任意）</label><br />
      <input id="planned-end-date" type="date" min={startDate || undefined} value={plannedEndDate} onChange={event => onPlannedChange(event.target.value)} />
    </div>
    <div><label htmlFor="completed-date">実際の完工日（完工時に登録）</label><br />
      <input id="completed-date" type="date" min={startDate || undefined} max={japanToday()} value={completedDate} onChange={event => onCompletedChange(event.target.value)} />
    </div>
  </>;
}
