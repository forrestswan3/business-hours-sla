/**
 * Business-hours SLA math for Google Sheets (Apps Script) — also runs in Node for tests.
 *
 * Custom functions:
 *   =BUSINESS_HOURS(start, end, [openHour], [closeHour], [holidays])
 *   =SLA_DUE(start, slaHours, [openHour], [closeHour], [holidays])
 *
 * Defaults: Monday–Friday, 8:00–18:00, in the spreadsheet's time zone.
 * `holidays` is an optional range of dates. Both functions accept a single cell
 * or a column range (they map over rows), so one formula can fill a whole column.
 *
 * MIT License © Forrest Swan III
 */

var DEFAULTS = { openHour: 8, closeHour: 18, workdays: [1, 2, 3, 4, 5] };
var MS_PER_MIN = 60 * 1000;

function makeConfig_(openHour, closeHour, holidays) {
  var cfg = {
    openHour: openHour === undefined || openHour === '' || openHour === null ? DEFAULTS.openHour : Number(openHour),
    closeHour: closeHour === undefined || closeHour === '' || closeHour === null ? DEFAULTS.closeHour : Number(closeHour),
    workdays: DEFAULTS.workdays,
    holidays: {}
  };
  if (!(cfg.openHour >= 0 && cfg.closeHour <= 24 && cfg.openHour < cfg.closeHour)) {
    throw new Error('openHour must be before closeHour (0–24).');
  }
  flatten_(holidays).forEach(function (h) {
    if (h instanceof Date && !isNaN(h)) cfg.holidays[dayKey_(h)] = true;
  });
  return cfg;
}

function flatten_(v) {
  if (v === undefined || v === null || v === '') return [];
  if (!Array.isArray(v)) return [v];
  return v.reduce(function (acc, x) { return acc.concat(flatten_(x)); }, []);
}

function dayKey_(d) {
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function isWorkday_(d, cfg) {
  return cfg.workdays.indexOf(d.getDay()) !== -1 && !cfg.holidays[dayKey_(d)];
}

function atHour_(d, hour) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  x.setTime(x.getTime() + hour * 60 * MS_PER_MIN);
  return x;
}

function nextDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

/** Business minutes between two Dates (0 if end <= start). */
function businessMinutesBetween(start, end, cfg) {
  cfg = cfg || makeConfig_();
  if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end)) return null;
  if (end <= start) return 0;
  var total = 0;
  for (var day = new Date(start.getFullYear(), start.getMonth(), start.getDate()); day <= end; day = nextDay_(day)) {
    if (!isWorkday_(day, cfg)) continue;
    var from = Math.max(start.getTime(), atHour_(day, cfg.openHour).getTime());
    var to = Math.min(end.getTime(), atHour_(day, cfg.closeHour).getTime());
    if (to > from) total += (to - from) / MS_PER_MIN;
  }
  return total;
}

/** The Date that is `minutes` business minutes after `start`. */
function addBusinessMinutes(start, minutes, cfg) {
  cfg = cfg || makeConfig_();
  if (!(start instanceof Date) || isNaN(start) || !(minutes >= 0)) return null;
  var cursor = new Date(start.getTime());
  var remaining = minutes;
  for (var guard = 0; guard < 3660; guard++) {          // ~10 years of days
    var day = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (isWorkday_(day, cfg)) {
      var open = atHour_(day, cfg.openHour), close = atHour_(day, cfg.closeHour);
      var from = cursor < open ? open : cursor;
      if (from < close) {
        var avail = (close - from) / MS_PER_MIN;
        if (remaining <= avail) return new Date(from.getTime() + remaining * MS_PER_MIN);
        remaining -= avail;
      }
    }
    cursor = nextDay_(day);
  }
  throw new Error('SLA exceeds supported range.');
}

function mapRows_(a, fn) {
  if (Array.isArray(a)) return a.map(function (row) { return Array.isArray(row) ? row.map(fn) : fn(row); });
  return fn(a);
}

/**
 * Business hours between start and end.
 * @param {Date|Date[][]} start Start timestamp(s).
 * @param {Date|Date[][]} end End timestamp(s), same shape as start.
 * @param {number} [openHour] Opening hour, default 8.
 * @param {number} [closeHour] Closing hour, default 18.
 * @param {Date[][]} [holidays] Range of holiday dates.
 * @return {number|number[][]} Hours, rounded to 2 decimals ("" when inputs are blank).
 * @customfunction
 */
function BUSINESS_HOURS(start, end, openHour, closeHour, holidays) {
  var cfg = makeConfig_(openHour, closeHour, holidays);
  var calc = function (s, e) {
    var m = businessMinutesBetween(s, e, cfg);
    return m === null ? '' : Math.round((m / 60) * 100) / 100;
  };
  if (Array.isArray(start)) {
    return start.map(function (row, i) {
      return row.map(function (s, j) { return calc(s, Array.isArray(end) ? end[i][j] : end); });
    });
  }
  return calc(start, end);
}

/**
 * Due date for an SLA measured in business hours.
 * @param {Date|Date[][]} start Start timestamp(s).
 * @param {number} slaHours Business hours allowed.
 * @param {number} [openHour] Opening hour, default 8.
 * @param {number} [closeHour] Closing hour, default 18.
 * @param {Date[][]} [holidays] Range of holiday dates.
 * @return {Date|Date[][]} Due timestamp(s) ("" when start is blank).
 * @customfunction
 */
function SLA_DUE(start, slaHours, openHour, closeHour, holidays) {
  var cfg = makeConfig_(openHour, closeHour, holidays);
  return mapRows_(start, function (s) {
    var d = addBusinessMinutes(s, Number(slaHours) * 60, cfg);
    return d === null ? '' : d;
  });
}

if (typeof module !== 'undefined') {
  module.exports = { businessMinutesBetween: businessMinutesBetween, addBusinessMinutes: addBusinessMinutes,
    makeConfig_: makeConfig_, BUSINESS_HOURS: BUSINESS_HOURS, SLA_DUE: SLA_DUE };
}
