#!/usr/bin/env node
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(import.meta.dirname, '../../app/dashboard/reports/page.tsx'),
  'utf8',
);

describe('reports fleet pagination', () => {
  it('resets fleet pagination before reloading report data for a new filter', () => {
    assert.match(
      source,
      /useEffect\(\(\) => \{\s*setFleetPage\(1\)\s*loadReportData\(false\)\s*\}, \[filterPeriod, startDate, endDate\]\)/,
    );
  });

  it('clamps stale fleet pages after report data shrinks', () => {
    assert.match(
      source,
      /const totalFleetPages = Math\.max\(1, Math\.ceil\(reportData\.fleetPerformance\.length \/ fleetItemsPerPage\)\)/,
    );
    assert.match(source, /setFleetPage\(\(page\) => Math\.min\(page, totalFleetPages\)\)/);
  });
});
