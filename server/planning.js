function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function dateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function withinDate(date, start, end) {
  const d = String(date || "").slice(0, 10);
  return d >= start && d <= end;
}

function summarizeExpenses(expenses, start, end) {
  const rows = (expenses || []).filter((e) => withinDate(e.date, start, end));
  const total = rows.reduce((sum, e) => sum + Math.max(0, toNumber(e.amount)), 0);
  const byCategory = {};
  for (const e of rows) {
    const category = String(e.category || "other").trim() || "other";
    byCategory[category] = (byCategory[category] || 0) + Math.max(0, toNumber(e.amount));
  }
  const categories = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) }))
    .sort((a, b) => b.amount - a.amount);
  return {
    start,
    end,
    expenseCount: rows.length,
    total: Number(total.toFixed(2)),
    byCategory: categories,
    calculation: "Sum of the user's logged expenses whose date falls within the selected inclusive period; no external account data is included."
  };
}

function budgetProgress(budget, expenses) {
  const summary = summarizeExpenses(expenses, budget.periodStart, budget.periodEnd);
  const amount = Math.max(0, toNumber(budget.amount));
  const spent = budget.category
    ? summary.byCategory.find((x) => x.category === budget.category)?.amount || 0
    : summary.total;
  const remaining = amount - spent;
  const percent = amount > 0 ? (spent / amount) * 100 : 0;
  return {
    budgetId: budget.id,
    spent: Number(spent.toFixed(2)),
    limit: Number(amount.toFixed(2)),
    remaining: Number(remaining.toFixed(2)),
    percent: Number(percent.toFixed(2)),
    over: spent > amount,
    calculation: budget.category
      ? `Sum of logged expenses in category '${budget.category}' from ${budget.periodStart} through ${budget.periodEnd}, compared with the budget limit.`
      : `Sum of all logged expenses from ${budget.periodStart} through ${budget.periodEnd}, compared with the budget limit.`
  };
}

function goalProgress(goal) {
  const target = Math.max(0, toNumber(goal.targetAmount));
  const current = Math.max(0, toNumber(goal.currentAmount));
  const percent = target > 0 ? (current / target) * 100 : 0;
  return {
    goalId: goal.id,
    current: Number(current.toFixed(2)),
    target: Number(target.toFixed(2)),
    remaining: Number(Math.max(0, target - current).toFixed(2)),
    percent: Number(percent.toFixed(2)),
    calculation: "Progress is the user-entered current amount divided by the target amount. NEXA does not transfer or move money automatically."
  };
}

function validatePeriod(start, end) {
  if (!dateOnly(start) || !dateOnly(end)) return "periodStart and periodEnd must use YYYY-MM-DD.";
  if (start > end) return "periodStart cannot be after periodEnd.";
  return null;
}

module.exports = { summarizeExpenses, budgetProgress, goalProgress, validatePeriod, toNumber };
