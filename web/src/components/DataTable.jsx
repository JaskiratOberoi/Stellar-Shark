export function TableShell({ children, maxClass = 'max-h-40', className = '' }) {
    return (
        <div
            className={`overflow-x-auto ${maxClass} overflow-y-auto log-scroll rounded-lg border border-border ${className}`}
        >
            {children}
        </div>
    );
}

export function BuSummaryTable({
    rows,
    maxClass = 'max-h-40 mb-6',
    shellClassName = '',
    variant = 'default',
    aggregate = null
}) {
    const tableCls = variant === 'lab' ? 'data-table data-table-lab' : 'data-table';
    const monoCls = variant === 'lab' ? 'font-mono text-ink-muted' : 'font-mono text-genomics-fg-subtle';
    const numCls =
        variant === 'lab'
            ? 'text-right tabular-nums text-primary'
            : 'text-right tabular-nums text-genomics-success/95';
    const emptyCls = variant === 'lab' ? 'p-4 text-ink-muted' : 'p-4 text-genomics-fg-subtle';

    return (
        <TableShell maxClass={`${maxClass} ${shellClassName}`.trim()}>
            <table className={tableCls}>
                <thead>
                    <tr>
                        <th>BU</th>
                        <th>{variant === 'lab' ? 'Badge' : 'Badge'}</th>
                        <th className="text-right">{variant === 'lab' ? 'Samples' : 'Samples'}</th>
                        <th className="text-right">{variant === 'lab' ? 'Unique SIDs' : 'Unique SIDs'}</th>
                    </tr>
                </thead>
                <tbody className={variant === 'lab' ? 'text-ink-secondary' : 'text-genomics-fg-muted'}>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={4} className={emptyCls}>
                                Run a scan to populate.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr key={row.businessUnit}>
                                <td className={variant === 'lab' ? 'font-medium text-ink' : undefined}>
                                    {row.businessUnit}
                                </td>
                                <td className={monoCls}>{row.labBadge ?? '—'}</td>
                                <td className={numCls}>{row.totalTests}</td>
                                <td className="text-right tabular-nums">{row.uniqueSids}</td>
                            </tr>
                        ))
                    )}
                </tbody>
                {aggregate != null && rows.length > 0 ? (
                    <tfoot>
                        <tr className="border-t border-border">
                            <td
                                colSpan={2}
                                className={`pt-3 font-bold text-ink ${variant === 'lab' ? 'text-xs uppercase tracking-wide' : ''}`}
                            >
                                Aggregate
                            </td>
                            <td className="pt-3 text-right font-bold tabular-nums text-ink">{aggregate.samples}</td>
                            <td className="pt-3 text-right font-bold tabular-nums text-ink">{aggregate.sids}</td>
                        </tr>
                    </tfoot>
                ) : null}
            </table>
        </TableShell>
    );
}

export function GridScanTable({ rows, maxClass = 'max-h-52', shellClassName = '' }) {
    return (
        <TableShell maxClass={`${maxClass} ${shellClassName}`.trim()}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th className="text-right">Rows</th>
                        <th className="text-right">Samples +</th>
                        <th className="text-right">SIDs +</th>
                    </tr>
                </thead>
                <tbody className="text-genomics-fg-muted">
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="p-4 text-genomics-fg-subtle">
                                Run a scan to populate.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr key={row.label}>
                                <td>
                                    {row.label}
                                    {row.skipped && (
                                        <span className="text-genomics-warning/90 ml-1">(skipped)</span>
                                    )}
                                </td>
                                <td className="text-right tabular-nums">{row.rowsScanned}</td>
                                <td className="text-right tabular-nums text-genomics-success/95">
                                    {row.testsAdded ?? '—'}
                                </td>
                                <td className="text-right tabular-nums">{row.sidsNew ?? '—'}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </TableShell>
    );
}
