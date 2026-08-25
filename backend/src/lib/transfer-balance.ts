export type TransferBalance = { fromAccountId: string; toAccountId: string; amount: number; status: "PENDING" | "COMPLETED" | "CANCELED" };
export function transferEffect(accountId: string, transfers: TransferBalance[]) {
  return transfers.reduce((balance, transfer) => {
    if (transfer.status !== "COMPLETED") return balance;
    if (transfer.fromAccountId === accountId) return balance - transfer.amount;
    if (transfer.toAccountId === accountId) return balance + transfer.amount;
    return balance;
  }, 0);
}
