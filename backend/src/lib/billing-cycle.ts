export function invoiceReferenceMonth(date: Date, closingDay: number, dueDay: number) {
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth();
  if (date.getUTCDate() > closingDay) month += 1;
  if (dueDay <= closingDay) month += 1;
  year += Math.floor(month / 12);
  month = ((month % 12) + 12) % 12;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function invoiceDueDate(referenceMonth: string, dueDay: number) {
  const [year, month] = referenceMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  return new Date(Date.UTC(year!, month! - 1, Math.min(dueDay, lastDay)));
}
