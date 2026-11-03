"use strict";

const crypto = require("crypto");

const SEMANTIC_FKS = Object.freeze([
  { table: "financial_goal_contributions", column: "goalId", parent: "financial_goals", parentColumn: "id" },
  { table: "financial_savings_rules", column: "goalId", parent: "financial_goals", parentColumn: "id" },
  { table: "ai_workflow_runs", column: "workflowId", parent: "ai_workflows", parentColumn: "id" },
]);

function tableInfo(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

function requiredColumns(db, table) {
  return tableInfo(db, table)
    .filter((c) => Number(c.notnull) === 1 && Number(c.pk) === 0 && c.dflt_value == null)
    .map((c) => c.name);
}

function primaryKeys(db, table) {
  return tableInfo(db, table).filter((c) => Number(c.pk) > 0).sort((a,b) => Number(a.pk)-Number(b.pk)).map((c) => c.name);
}

function stableRowKey(row, pks) {
  return pks.map((pk) => String(row?.[pk] ?? "")).join("\u001f");
}

function preflight(db, userId, bundle, { tables }) {
  if (!db || !userId) throw new Error("Import target is missing.");
  const data = bundle?.data || {};
  const plan = { bundle, tables: {}, checksum: crypto.createHash("sha256").update(JSON.stringify(bundle)).digest("hex") };

  for (const table of tables) {
    const rows = Array.isArray(data[table]) ? data[table] : [];
    const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!exists) { plan.tables[table] = { rows: [], pks: [], columns: [], missing: true }; continue; }
    const info = tableInfo(db, table);
    const columns = info.map((c) => c.name);
    if (!columns.includes("userId")) throw new Error(`Portable table ${table} is missing user ownership.`);
    const pks = primaryKeys(db, table);
    if (!pks.length) throw new Error(`Portable table ${table} has no primary key.`);
    const required = requiredColumns(db, table);
    const seen = new Set();
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`Invalid ${table} row.`);
      for (const pk of pks) if (row[pk] == null || row[pk] === "") throw new Error(`Invalid ${table} row: primary key is required.`);
      for (const c of required) if (!Object.prototype.hasOwnProperty.call(row, c) || row[c] == null) throw new Error(`Invalid ${table} row: required field ${c} is missing.`);
      const key = stableRowKey(row, pks);
      if (seen.has(key)) throw new Error(`Import contains duplicate primary key in ${table}.`);
      seen.add(key);
      const existing = db.prepare(`SELECT userId FROM ${table} WHERE ${pks.map((c)=>`${c}=?`).join(" AND ")}`).get(...pks.map((c)=>row[c]));
      if (existing && String(existing.userId) !== String(userId)) throw new Error(`Import refused: ${table} contains an identifier owned by another account.`);
    }
    plan.tables[table] = { rows, pks, columns, missing: false };
  }

  for (const fk of SEMANTIC_FKS) {
    const child = plan.tables[fk.table];
    if (!child || child.missing) continue;
    const parent = plan.tables[fk.parent];
    const importedParentIds = new Set((parent?.rows || []).map((r) => String(r[fk.parentColumn])));
    for (const row of child.rows) {
      const value = row[fk.column];
      if (value == null || value === "") continue;
      if (importedParentIds.has(String(value))) continue;
      const existing = db.prepare(`SELECT userId FROM ${fk.parent} WHERE ${fk.parentColumn}=?`).get(value);
      if (!existing) throw new Error(`Import refused: ${fk.table}.${fk.column} references missing ${fk.parent}.${fk.parentColumn}.`);
      if (String(existing.userId) !== String(userId)) throw new Error(`Import refused: ${fk.table}.${fk.column} references another account.`);
    }
  }

  return plan.bundle;
}

module.exports = { SEMANTIC_FKS, tableInfo, requiredColumns, primaryKeys, preflight };
