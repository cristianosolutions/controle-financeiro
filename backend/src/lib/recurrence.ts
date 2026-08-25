import { prisma } from "./prisma.js";

export type RecurrenceRule = {
  startDate: Date;
  endDate: Date | null;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  intervalDays: number | null;
};

function addMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

export function nextOccurrence(date: Date, rule: Pick<RecurrenceRule, "frequency" | "intervalDays">) {
  if (rule.frequency === "MONTHLY") return addMonths(date, 1);
  if (rule.frequency === "YEARLY") return addMonths(date, 12);
  const days = rule.frequency === "WEEKLY" ? 7 : rule.frequency === "BIWEEKLY" ? 14 : rule.intervalDays ?? 1;
  return new Date(date.getTime() + days * 86_400_000);
}

export function occurrenceDates(rule: RecurrenceRule, through: Date, maximum = 240, from?: Date) {
  const dates: Date[] = [];
  let cursor = new Date(rule.startDate);
  let occurrenceIndex = 0;
  let iterations = 0;
  while (cursor <= through && (!rule.endDate || cursor <= rule.endDate) && dates.length < maximum && iterations < 100_000) {
    if (!from || cursor >= from) dates.push(cursor);
    occurrenceIndex += 1;
    iterations += 1;
    cursor = rule.frequency === "MONTHLY"
      ? addMonths(rule.startDate, occurrenceIndex)
      : rule.frequency === "YEARLY"
        ? addMonths(rule.startDate, occurrenceIndex * 12)
        : nextOccurrence(cursor, rule);
  }
  return dates;
}

export async function materializeRecurrences(userId: string, through: Date, recurringId?: string) {
  const recurrences = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true, ...(recurringId && { id: recurringId }), startDate: { lte: through } },
  });
  let generated = 0;
  const now = new Date();
  const materializationFloor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (const recurrence of recurrences) {
    const dates = occurrenceDates(recurrence, through, 240, materializationFloor);
    if (!dates.length) continue;
    const result = await prisma.transaction.createMany({
      data: dates.map((date) => ({
        description: recurrence.description,
        amount: recurrence.amount,
        type: recurrence.type,
        status: "PENDING",
        date,
        occurrenceDate: date,
        notes: recurrence.notes,
        paymentMethod: recurrence.paymentMethod,
        userId: recurrence.userId,
        categoryId: recurrence.categoryId,
        accountId: recurrence.accountId,
        cardId: recurrence.cardId,
        recurringId: recurrence.id,
      })),
      skipDuplicates: true,
    });
    generated += result.count;
  }
  return generated;
}
