const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', enabled: true },
    { id: 'reports', label: 'Reports', enabled: true },
    { id: 'scheduler', label: 'Scheduler', enabled: true }
];

export function LabTopNav({ activeTab, onTabChange, onShare, onDownload }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border mb-6">
            <nav className="flex flex-wrap gap-1" aria-label="Main">
                {NAV_ITEMS.map((item) => {
                    const isActive = activeTab === item.id;
                    const activeCls =
                        'px-3 py-1.5 text-sm font-medium text-ink border-b-2 border-primary -mb-[17px] pb-3 bg-transparent cursor-pointer';
                    const idleEnabled =
                        'px-3 py-1.5 text-sm text-ink-muted hover:text-ink-secondary border-b-2 border-transparent -mb-[17px] pb-3 bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-t';
                    const disabledCls =
                        'px-3 py-1.5 text-sm text-ink-faint border-b-2 border-transparent -mb-[17px] pb-3 select-none pointer-events-none';

                    if (item.enabled) {
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => onTabChange(item.id)}
                                className={isActive ? activeCls : idleEnabled}
                            >
                                {item.label}
                            </button>
                        );
                    }
                    return (
                        <span key={item.id} className={disabledCls} aria-disabled="true">
                            {item.label}
                        </span>
                    );
                })}
            </nav>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onShare}
                    className="p-2 rounded-xl border border-border text-ink-muted hover:text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    title="Copy summary"
                    aria-label="Copy summary"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={onDownload}
                    className="p-2 rounded-xl border border-border text-ink-muted hover:text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    title="Download result JSON"
                    aria-label="Download result JSON"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}
