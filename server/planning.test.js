const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizeExpenses, budgetProgress, goalProgress, validatePeriod } = require("./planning");

test("summarizeExpenses filters by inclusive period and groups categories", () => {
  const result = summarizeExpenses([
    { date: "2026-01-01", amount: 100, category: "food" },
    { date: "2026-01-15", amount: 250, category: "transport" },
    { date: "2026-02-01", amount: 999, category: "food" }
  ], "2026-01-01", "2026-01-31");
  assert.equal(result.total, 350);
  assert.equal(result.expenseCount, 2);
  assert.deepEqual(result.byCategory, [
    { category: "transport", amount: 250 },
    { category: "food", amount: 100 }
  ]);
});

test("budgetProgress calculates remaining, percentage, and category scope", () => {
  const result = budgetProgress({ id: "b1", amount: 500, category: "food", periodStart: "2026-01-01", periodEnd: "2026-01-31" }, [
    { date: "2026-01-03", amount: 120, category: "food" },
    { date: "2026-01-04", amount: 80, category: "transport" },
    { date: "2026-02-04", amount: 999, category: "food" }
  ]);
  assert.equal(result.spent, 120);
  assert.equal(result.remaining, 380);
  assert.equal(result.percent, 24);
  assert.equal(result.over, false);
});

test("goalProgress never invents transfers and caps remaining at zero", () => {
  const result = goalProgress({ id: "g1", currentAmount: 1100, targetAmount: 1000 });
  assert.equal(result.percent, 110);
  assert.equal(result.remaining, 0);
  assert.match(result.calculation, /does not transfer or move money automatically/);
});

test("validatePeriod rejects malformed and reversed periods", () => {
  assert.equal(validatePeriod("2026-01-01", "2026-01-31"), null);
  assert.equal(validatePeriod("2026-02-01", "2026-01-31"), "periodStart cannot be after periodEnd.");
  assert.equal(validatePeriod("bad", "2026-01-31"), "periodStart and periodEnd must use YYYY-MM-DD.");
});
