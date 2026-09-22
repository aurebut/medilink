import assert from 'node:assert/strict';
import { exampleActivityReports, reportPeriodBounds, reportsForPeriod, shiftReportDate, summarizeReports } from '../lib/mission-activity-reports.ts';

// Monday-based weeks cross years and daylight-saving boundaries without losing days.
assert.deepEqual(reportPeriodBounds('2026-01-01', 'week'), { start: '2025-12-29', end: '2026-01-04' });
assert.deepEqual(reportPeriodBounds('2026-03-29', 'week'), { start: '2026-03-23', end: '2026-03-29' });
assert.equal(shiftReportDate('2026-03-29', 'day', 1), '2026-03-30');
assert.deepEqual(reportPeriodBounds('2028-02-12', 'month'), { start: '2028-02-01', end: '2028-02-29' });
assert.equal(shiftReportDate('2026-01-31', 'month', 1), '2026-02-28');
assert.equal(shiftReportDate('2028-03-31', 'month', -1), '2028-02-29');
assert.equal(shiftReportDate('2026-12-31', 'month', 1), '2027-01-31');
assert.throws(() => reportPeriodBounds('2026-02-30', 'day'));
assert.throws(() => reportPeriodBounds('not-a-date', 'month'));

const week = reportsForPeriod([...exampleActivityReports].reverse(), '2026-09-25', 'week');
assert.equal(week.length, 5);
assert.equal(week[0].date, '2026-09-21');
assert.deepEqual(summarizeReports(week), { consultations: 126, days: 5 });
assert.equal(reportsForPeriod(exampleActivityReports, '2026-09-25', 'day')[0].consultations, 25);
assert.equal(reportsForPeriod(exampleActivityReports, '2026-09-01', 'month').length, 5);
assert.deepEqual(reportsForPeriod(exampleActivityReports, '2026-10-01', 'month'), []);
assert.equal(summarizeReports([]), null, 'A period with no reports is not presented as zero activity.');
assert.equal(summarizeReports([week[0], week[0]]).days, 1, 'Multiple records on one date do not count as multiple days.');
console.log('Activity report periods and summaries passed.');
