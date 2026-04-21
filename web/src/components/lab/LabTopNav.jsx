import { Share2, Download } from 'lucide-react';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reports', label: 'Reports' },
    { id: 'scheduler', label: 'Scheduler' }
];

export function LabTopNav({ activeTab, onTabChange, onShare, onDownload }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6 border-b border-rule-soft">
            <nav className="flex flex-wrap" aria-label="Main">
                {NAV_ITEMS.map((item, i) => {
                    const isActive = activeTab === item.id;
                    const n = String(i + 1).padStart(2, '0');
                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onTabChange(item.id)}
                            className={`relative px-4 py-3 font-mono uppercase text-eyebrow transition-colors duration-150 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                isActive ? 'text-ink' : 'text-ink-3 hover:text-ink'
                            }`}
                        >
                            <span className="text-ink-3 mr-2">{n}</span>
                            {item.label}
                            {isActive ? (
                                <span
                                    className="absolute left-0 right-0 -bottom-px h-[2px] bg-ink"
                                    aria-hidden
                                />
                            ) : null}
                        </button>
                    );
                })}
            </nav>
            <div className="flex items-center gap-2 pb-2">
                <button
                    type="button"
                    onClick={onShare}
                    className="nexus-btn-ghost py-2 px-3"
                    title="Copy summary"
                    aria-label="Copy summary"
                >
                    <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
                    <span className="hidden sm:inline">Share</span>
                </button>
                <button
                    type="button"
                    onClick={onDownload}
                    className="nexus-btn-ghost py-2 px-3"
                    title="Download result JSON"
                    aria-label="Download result JSON"
                >
                    <Download className="w-3.5 h-3.5" strokeWidth={2} />
                    <span className="hidden sm:inline">Export</span>
                </button>
            </div>
        </div>
    );
}
