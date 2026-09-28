# business-hours-sla

[![test](https://github.com/forrestswan3/business-hours-sla/actions/workflows/test.yml/badge.svg)](https://github.com/forrestswan3/business-hours-sla/actions/workflows/test.yml)
![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8-4285F4) ![dependencies](https://img.shields.io/badge/dependencies-none-2C9C95) ![license](https://img.shields.io/badge/license-MIT-0B1F33)

**Two Google Sheets custom functions for SLA reporting: business hours elapsed between two timestamps, and the due time for an SLA measured in business hours.** Nights, weekends and holidays are handled, and each function works on a single cell or a whole column.

```text
=BUSINESS_HOURS(start, end, [openHour], [closeHour], [holidays])
=SLA_DUE(start, slaHours, [openHour], [closeHour], [holidays])
```

| A2 (start) | B2 (end) | Formula | Result |
|---|---|---|---|
| 9/25/2026 17:00 (Fri) | 9/28/2026 9:00 (Mon) | `=BUSINESS_HOURS(A2, B2)` | `2` |
| 9/25/2026 16:00 (Fri) | | `=SLA_DUE(A2, 4)` (4-hour SLA) | `9/28/2026 10:00` |
| A2:A | B2:B | `=BUSINESS_HOURS(A2:A, B2:B, 9, 17, Holidays!A:A)` | A column of hours, 9–5, skipping listed holidays |

Inputs must be real date-time cells, not text. Format the `SLA_DUE` result column as Date time.

Defaults are Monday–Friday, 8:00–18:00, in the spreadsheet's time zone.

## Install (2 minutes)

1. In your sheet, open **Extensions → Apps Script**.
2. Paste the contents of [`src/BusinessHours.js`](src/BusinessHours.js) into `Code.gs`, then save.
3. Back in the sheet, type `=BUSINESS_HOURS(` and the autocomplete help appears.

Or with [clasp](https://github.com/google/clasp): `clasp create --type sheets`, then `clasp push`.

## Why

Ticket and request trackers usually measure response time in calendar hours, so a request that comes in Friday at 5 PM looks like it took three days. These functions measure what the SLA actually promises. I use the same math in a KPI tracker that computes business-hours SLA columns for a service team.

## Design notes

- The calculation is pure JavaScript with no Apps Script services, so it's fully unit-tested in Node. CI runs the suite in three time zones, including ones with daylight-saving transitions.
- Blank inputs return a blank cell instead of an error, so whole-column formulas stay clean.
- Holidays are read from any range of date cells.

## Tests

```bash
npm test          # node 18+, no dependencies
```

## License

MIT © Forrest Swan III
