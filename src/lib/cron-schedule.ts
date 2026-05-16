import { CronExpressionParser } from "cron-parser";

export type Frequency = "daily" | "weekly" | "monthly" | "custom";

export function buildCron(freq: Frequency, hour: number, minute: number, days: string[], dayOfMonth: number) {
  const safeHour = Math.max(0, Math.min(23, Math.trunc(hour)));
  const safeMinute = Math.max(0, Math.min(59, Math.trunc(minute)));
  if (freq === "daily") return `${safeMinute} ${safeHour} * * *`;
  if (freq === "weekly") {
    const safeDays = days.length > 0 ? days.join(",") : "*";
    return `${safeMinute} ${safeHour} * * ${safeDays}`;
  }
  if (freq === "monthly") {
    const safeDay = Math.max(1, Math.min(28, Math.trunc(dayOfMonth)));
    return `${safeMinute} ${safeHour} ${safeDay} * *`;
  }
  return "";
}

export function validateCronExpression(expression: string, timezone = "Asia/Jakarta") {
  try {
    CronExpressionParser.parse(expression, { tz: timezone });
    return true;
  } catch {
    return false;
  }
}

export function getNextRunAt(expression: string, timezone = "Asia/Jakarta", currentDate = new Date()) {
  try {
    return CronExpressionParser.parse(expression, { tz: timezone, currentDate }).next().toDate();
  } catch {
    return null;
  }
}

export function cronValuesEqual(left: string, right: string) {
  return left.trim().replace(/\s+/g, " ") === right.trim().replace(/\s+/g, " ");
}

export function parseCronSchedule(value: string): {
  freq: Frequency;
  hour: number;
  minute: number;
  days: string[];
  dayOfMonth: number;
  customCron: string;
} {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { freq: "daily", hour: 8, minute: 0, days: ["1", "2", "3", "4", "5"], dayOfMonth: 1, customCron: value };
  }

  const [minuteRaw, hourRaw, dayOfMonth, month, dayOfWeek] = parts;
  const minute = Number(minuteRaw);
  const hour = Number(hourRaw);
  if (!Number.isInteger(minute) || !Number.isInteger(hour) || month !== "*") {
    return { freq: "custom", hour: 8, minute: 0, days: [], dayOfMonth: 1, customCron: value };
  }
  if (dayOfMonth === "*" && dayOfWeek === "*") {
    return { freq: "daily", hour, minute, days: [], dayOfMonth: 1, customCron: value };
  }
  if (dayOfMonth === "*" && dayOfWeek !== "*") {
    return { freq: "weekly", hour, minute, days: dayOfWeek.split(",").filter(Boolean), dayOfMonth: 1, customCron: value };
  }
  if (dayOfMonth !== "*" && dayOfWeek === "*") {
    return { freq: "monthly", hour, minute, days: [], dayOfMonth: Number(dayOfMonth) || 1, customCron: value };
  }
  return { freq: "custom", hour, minute, days: [], dayOfMonth: 1, customCron: value };
}
