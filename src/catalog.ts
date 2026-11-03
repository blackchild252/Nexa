export function fmtMoney(currency: string, amount: number) {
  try { return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}
