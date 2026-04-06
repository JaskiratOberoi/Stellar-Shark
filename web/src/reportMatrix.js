/**
 * Build row/column matrix for Reports: each completed run = one table column.
 */

function buCountsFromResult(result) {
    const map = {};
    if (!result || typeof result !== 'object') return map;
    if (result.multiBu && Array.isArray(result.results)) {
        for (const r of result.results) {
            if (r?.businessUnit) {
                map[r.businessUnit] = {
                    samples: r.totalTests ?? 0,
                    sids: r.uniqueSids ?? 0
                };
            }
        }
    } else if (result.businessUnit) {
        map[result.businessUnit] = {
            samples: result.totalTests ?? 0,
            sids: result.uniqueSids ?? 0
        };
    }
    return map;
}

function collectAllBuKeys(history) {
    const s = new Set();
    for (const entry of history) {
        const m = buCountsFromResult(entry?.result);
        Object.keys(m).forEach((k) => s.add(k));
    }
    return [...s].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function sidListTotal(result) {
    if (!result) return '—';
    if (result.multiBu && Array.isArray(result.results)) {
        let n = 0;
        for (const r of result.results) {
            if (Array.isArray(r.sidList)) n += r.sidList.length;
        }
        return String(n);
    }
    if (Array.isArray(result.sidList)) return String(result.sidList.length);
    return '—';
}

/**
 * @param {Array<{ id: string, savedAt: string, result: object }>} history
 */
export function buildReportMatrix(history) {
    const buKeys = collectAllBuKeys(history);
    const rowDefs = [
        { key: 'finished', label: 'Completed' },
        { key: 'range', label: 'Date range' },
        { key: 'testFilter', label: 'Test filter (LIS)' },
        { key: 'bus', label: 'Business units' },
        ...buKeys.flatMap((bu) => [
            { key: `bu:${bu}:samples`, label: `${bu} · samples` },
            { key: `bu:${bu}:sids`, label: `${bu} · unique SIDs` }
        ]),
        { key: 'total', label: 'Total samples (run)' },
        { key: 'uniqueSum', label: 'Unique SIDs (reported)' },
        { key: 'sidCount', label: 'SIDs list length' },
        { key: 'duration', label: 'Duration' }
    ];

    const columns = history.map((entry, idx) => {
        const r = entry.result;
        const buMap = buCountsFromResult(r);
        const vals = {};

        vals.finished =
            r.completedAt != null
                ? new Date(r.completedAt).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'medium'
                  })
                : '—';

        if (r.dateFrom && r.dateTo) {
            vals.range = r.dateFrom === r.dateTo ? r.dateFrom : `${r.dateFrom} → ${r.dateTo}`;
        } else {
            vals.range = r.date != null ? String(r.date) : '—';
        }

        vals.testFilter = r.testCode != null && String(r.testCode).trim() ? String(r.testCode).trim() : '(all tests)';

        vals.bus =
            r.multiBu && Array.isArray(r.businessUnits) && r.businessUnits.length
                ? r.businessUnits.join(', ')
                : r.businessUnit != null
                  ? String(r.businessUnit)
                  : '—';

        for (const bu of buKeys) {
            const row = buMap[bu];
            vals[`bu:${bu}:samples`] = row ? String(row.samples) : '—';
            vals[`bu:${bu}:sids`] = row ? String(row.sids) : '—';
        }

        vals.total = r.totalTests != null ? String(r.totalTests) : '—';
        vals.uniqueSum = r.uniqueSids != null ? String(r.uniqueSids) : '—';
        vals.sidCount = sidListTotal(r);
        vals.duration =
            r.durationMs != null && Number.isFinite(r.durationMs) ? `${(r.durationMs / 1000).toFixed(1)} s` : '—';

        return {
            id: entry.id,
            savedAt: entry.savedAt,
            runIndex: idx + 1,
            shortLabel: `Run ${idx + 1}`,
            values: vals
        };
    });

    return { rowDefs, columns, buKeys };
}
