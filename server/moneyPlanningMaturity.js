"use strict";

function monthStart(date = new Date()) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0,10); }
function monthEnd(date = new Date()) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth()+1, 0)).toISOString().slice(0,10); }
function summarize(db, userId, { start = monthStart(), end = monthEnd() } = {}) {
  const expenses = db.prepare("SELECT amount,currency,category FROM expenses WHERE userId=? AND date>=? AND date<=? ORDER BY date DESC").all(userId, start, end);
  const budgets = db.prepare("SELECT id,name,amount,currency,category,periodStart,periodEnd,active FROM financial_budgets WHERE userId=? ORDER BY periodStart DESC, createdAt DESC").all(userId);
  const goals = db.prepare("SELECT id,name,targetAmount,currentAmount,currency,targetDate,status FROM financial_goals WHERE userId=? ORDER BY updatedAt DESC").all(userId);
  const byCurrency = new Map();
  const byCategory = new Map();
  for (const e of expenses) {
    const currency=String(e.currency||"NGN").toUpperCase(); const amount=Number(e.amount)||0;
    const c=byCurrency.get(currency)||{currency,spent:0}; c.spent+=amount; byCurrency.set(currency,c);
    const key=String(e.category||"Other"); byCategory.set(key,(byCategory.get(key)||0)+amount);
  }
  const budgetView=budgets.map(b=>{ const spent=expenses.filter(e=>String(e.currency||"NGN").toUpperCase()===String(b.currency||"NGN").toUpperCase() && (!b.category || String(e.category||"")===String(b.category))).reduce((n,e)=>n+(Number(e.amount)||0),0); const amount=Number(b.amount)||0; return {...b,spent,remaining:amount-spent,utilization:amount>0?Math.min(999,spent/amount):0}; });
  const goalView=goals.map(g=>{ const target=Number(g.targetAmount)||0,current=Number(g.currentAmount)||0; return {...g,remaining:Math.max(0,target-current),progress:target>0?Math.min(1,current/target):0}; });
  return {period:{start,end},spending:{byCurrency:[...byCurrency.values()],byCategory:[...byCategory.entries()].map(([category,spent])=>({category,spent})).sort((a,b)=>b.spent-a.spent)},budgets:budgetView,goals:goalView};
}
module.exports={monthStart,monthEnd,summarize};
