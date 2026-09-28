// Run with: TZ=UTC node --test tests/   (Node 18+)
const test = require('node:test');
const assert = require('node:assert/strict');
const bh = require('../src/BusinessHours.js');

// Local-time constructor helper: month is 1-based for readability.
const d = (y, m, day, h = 0, min = 0) => new Date(y, m - 1, day, h, min);
// 2026-09-21 is a Monday.

test('same business day', () => {
  assert.equal(bh.businessMinutesBetween(d(2026, 9, 21, 9), d(2026, 9, 21, 11, 30)), 150);
});

test('clips to opening hours', () => {
  assert.equal(bh.businessMinutesBetween(d(2026, 9, 21, 6), d(2026, 9, 21, 20)), 600);
});

test('spans a weekend', () => {
  // Fri 17:00 -> Mon 9:00 = 1h Fri + 1h Mon
  assert.equal(bh.businessMinutesBetween(d(2026, 9, 25, 17), d(2026, 9, 28, 9)), 120);
});

test('holiday is skipped', () => {
  const cfg = bh.makeConfig_(8, 18, [[d(2026, 9, 22)]]);
  // Mon 17:00 -> Wed 9:00, Tuesday is a holiday = 1h + 1h
  assert.equal(bh.businessMinutesBetween(d(2026, 9, 21, 17), d(2026, 9, 23, 9), cfg), 120);
});

test('end before start is zero, bad input is null', () => {
  assert.equal(bh.businessMinutesBetween(d(2026, 9, 21, 12), d(2026, 9, 21, 10)), 0);
  assert.equal(bh.businessMinutesBetween('', d(2026, 9, 21, 10)), null);
});

test('SLA due rolls over nights and weekends', () => {
  // Fri 16:00 + 4 business hours = Mon 10:00
  assert.deepEqual(bh.addBusinessMinutes(d(2026, 9, 25, 16), 240), d(2026, 9, 28, 10));
  // Sat 12:00 + 1h = Mon 9:00
  assert.deepEqual(bh.addBusinessMinutes(d(2026, 9, 26, 12), 60), d(2026, 9, 28, 9));
  // exactly at close
  assert.deepEqual(bh.addBusinessMinutes(d(2026, 9, 21, 17), 60), d(2026, 9, 21, 18));
});

test('custom functions map over ranges and round to hours', () => {
  const starts = [[d(2026, 9, 21, 9)], [d(2026, 9, 25, 17)], ['']];
  const ends = [[d(2026, 9, 21, 10, 20)], [d(2026, 9, 28, 9)], ['']];
  assert.deepEqual(bh.BUSINESS_HOURS(starts, ends), [[1.33], [2], ['']]);
  assert.deepEqual(bh.SLA_DUE([[d(2026, 9, 25, 16)]], 4), [[d(2026, 9, 28, 10)]]);
});

test('custom hours and validation', () => {
  assert.equal(bh.BUSINESS_HOURS(d(2026, 9, 21, 6), d(2026, 9, 21, 22), 9, 17), 8);
  assert.throws(() => bh.BUSINESS_HOURS(d(2026, 9, 21), d(2026, 9, 22), 18, 8));
});
