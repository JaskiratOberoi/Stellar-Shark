export function TableShell({ children, maxClass = 'max-h-40', className = '' }) {
    return (
        <div
            className={`overflow-x-auto ${maxClass} overflow-y-auto log-scroll rounded-lg border border-white/5 ${className}`}
        >
            {children}
        </div>
    );
}

export function BuSummaryTable({ rows, maxClass = 'max-h-40 mb-6', shellClassName = '' }) {
    return (
        <TableShell maxClass={`${maxClass} ${shellClassName}`.trim()}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>BU</th>
                        <th>Badge</th>
                        <th className="text-right">Samples</th>
                        <th className="text-right">Unique SIDs</th>
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
                            <tr key={row.businessUnit}>
                                <td>{row.businessUnit}</td>
                                <td className="font-mono text-genomics-fg-subtle">{row.labBadge ?? '—'}</td>
                                <td className="text-right tabular-nums text-genomics-success/95">{row.totalTests}</td>
                                <td className="text-right tabular-nums">{row.uniqueSids}</td>
                            </tr>
                        ))
                    )}
                </tbody>
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
