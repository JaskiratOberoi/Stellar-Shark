export function LabTopNav({ onShare, onDownload }) {
    const tabs = ['Dashboard', 'Analytics', 'Inventory', 'Reports'];

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08] mb-6">
            <nav className="flex flex-wrap gap-1" aria-label="Main">
                {tabs.map((name) => (
                    <span
                        key={name}
                        className={
                            name === 'Dashboard'
                                ? 'px-3 py-1.5 text-sm font-medium text-white border-b-2 border-sky-400 -mb-[17px] pb-3'
                                : 'px-3 py-1.5 text-sm text-slate-500 pointer-events-none select-none'
                        }
                    >
                        {name}
                    </span>
                ))}
            </nav>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onShare}
                    className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
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
                    className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
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
