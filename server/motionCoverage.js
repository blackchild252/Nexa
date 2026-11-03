"use strict";

const COVERAGE = Object.freeze({
  home: "world-ambient",
  dami: "world-ambient",
  marketplace: "world-ambient",
  profile: "world-ambient",
  search: "world-ambient",
  money: "payment",
  ball: "live-update",
  yaayz: "world-ambient",
  zeeza: "world-ambient",
});

function coverage() {
  return Object.entries(COVERAGE).map(([surface, motion]) => ({ surface, motion, sharedAuthority:true }));
}

module.exports = { COVERAGE, coverage };
