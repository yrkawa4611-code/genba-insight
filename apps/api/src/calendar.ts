import { z } from "zod";

const day = z.iso.date().transform(value => new Date(value + "T00:00:00.000Z"));
export const calendarSchema = z.object({
  title: z.string().trim().min(1).max(200),
  recorderName: z.string().trim().min(1).max(100),
  startDate: day,
  plannedEndDate: day.nullish().transform(value => value ?? null),
  memo: z.string().trim().max(2000).nullish().transform(value => value || null),
  projectId: z.number().int().positive().nullish().transform(value => value ?? null),
}).superRefine((input, ctx) => {
  if (input.plannedEndDate && input.plannedEndDate < input.startDate) ctx.addIssue({ code: "custom", path: ["plannedEndDate"], message: "完工予定日は着工日以降にしてください" });
});
