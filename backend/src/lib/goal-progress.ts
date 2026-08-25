type GoalProgressInput = {
  targetAmount: number;
  initialAmount: number;
  contributions: number;
  deadline: Date | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELED";
};

export function goalProgress(goal: GoalProgressInput, referenceDate = new Date()) {
  const savedAmount = goal.initialAmount + goal.contributions;
  const remainingAmount = Math.max(0, goal.targetAmount - savedAmount);
  const percentage = goal.targetAmount > 0 ? (savedAmount / goal.targetAmount) * 100 : 0;
  const daysRemaining = goal.deadline
    ? Math.ceil((goal.deadline.getTime() - referenceDate.getTime()) / 86_400_000)
    : null;
  const monthsRemaining = goal.deadline === null
    ? null
    : Math.max(1, (goal.deadline.getUTCFullYear() - referenceDate.getUTCFullYear()) * 12 + goal.deadline.getUTCMonth() - referenceDate.getUTCMonth());
  const monthlyNeeded = monthsRemaining === null ? null : remainingAmount / monthsRemaining;
  const effectiveStatus = goal.status === "CANCELED"
    ? "CANCELED"
    : savedAmount >= goal.targetAmount
      ? "COMPLETED"
      : "ACTIVE";
  return {
    savedAmount,
    remainingAmount,
    percentage,
    daysRemaining,
    monthlyNeeded,
    isOverdue: Boolean(goal.deadline && daysRemaining! < 0 && remainingAmount > 0),
    effectiveStatus,
  };
}
