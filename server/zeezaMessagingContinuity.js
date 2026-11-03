"use strict";

const MAX_THREAD_LIST = 100;
const MAX_UNREAD_DISPLAY = 99;
const PAGE_SIZE = 50;

function boundedLimit(value, fallback = PAGE_SIZE) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), PAGE_SIZE);
}

function messageBefore(row, before) {
  if (!before) return true;
  const [createdAt, id] = String(before).split("|");
  if (!createdAt || !id) return row.createdAt < String(before);
  return row.createdAt < createdAt || (row.createdAt === createdAt && row.id < id);
}

function messageCursor(row) { return `${row.createdAt}|${row.id}`; }
function capUnread(value) { return Math.min(Math.max(Number(value) || 0, 0), MAX_UNREAD_DISPLAY); }
function threadListLimit() { return MAX_THREAD_LIST; }
function pageHasMore(rows, pageSize) { return rows.length > pageSize; }

module.exports = { boundedLimit, messageBefore, messageCursor, capUnread, threadListLimit, pageHasMore };
