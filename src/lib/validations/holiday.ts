import { z } from "zod";

export const holidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  holiday_date: z.string().min(1, "Date is required"),
});
export type HolidayInput = z.infer<typeof holidaySchema>;
