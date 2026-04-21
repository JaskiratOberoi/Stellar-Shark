/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: ['selector', '[data-theme="dark"]'],
    theme: {
        extend: {
            colors: {
                // Override raw white/black so legacy `bg-white` etc. flip per theme.
                white: 'rgb(var(--surface) / <alpha-value>)',
                black: 'rgb(var(--ink) / <alpha-value>)',
                // Legacy palette redirects -- shades from the old dark theme map to our tokens
                // so existing classes (text-slate-400, bg-emerald-500, etc.) flip in dual mode.
                slate: {
                    50: 'rgb(var(--bg) / <alpha-value>)',
                    100: 'rgb(var(--bg) / <alpha-value>)',
                    200: 'rgb(var(--surface-2) / <alpha-value>)',
                    300: 'rgb(var(--ink) / <alpha-value>)',
                    400: 'rgb(var(--ink-2) / <alpha-value>)',
                    500: 'rgb(var(--ink-3) / <alpha-value>)',
                    600: 'rgb(var(--ink-3) / <alpha-value>)',
                    700: 'rgb(var(--ink-2) / <alpha-value>)',
                    800: 'rgb(var(--surface-2) / <alpha-value>)',
                    900: 'rgb(var(--ink) / <alpha-value>)',
                    950: 'rgb(var(--ink) / <alpha-value>)'
                },
                rose: {
                    300: 'rgb(var(--signal-danger) / <alpha-value>)',
                    400: 'rgb(var(--signal-danger) / <alpha-value>)',
                    500: 'rgb(var(--signal-danger) / <alpha-value>)',
                    600: 'rgb(var(--signal-danger) / <alpha-value>)',
                    900: 'rgb(var(--signal-danger) / 0.15)',
                    950: 'rgb(var(--signal-danger) / 0.1)'
                },
                emerald: {
                    300: 'rgb(var(--signal-success) / <alpha-value>)',
                    400: 'rgb(var(--signal-success) / <alpha-value>)',
                    500: 'rgb(var(--signal-success) / <alpha-value>)',
                    600: 'rgb(var(--signal-success) / <alpha-value>)'
                },
                amber: {
                    200: 'rgb(var(--signal-warning) / <alpha-value>)',
                    300: 'rgb(var(--signal-warning) / <alpha-value>)',
                    400: 'rgb(var(--signal-warning) / <alpha-value>)',
                    500: 'rgb(var(--signal-warning) / <alpha-value>)'
                },
                cyan: {
                    300: 'rgb(var(--accent) / <alpha-value>)',
                    400: 'rgb(var(--accent) / <alpha-value>)',
                    500: 'rgb(var(--accent) / <alpha-value>)',
                    600: 'rgb(var(--accent) / <alpha-value>)'
                },
                sky: {
                    200: 'rgb(var(--ink) / <alpha-value>)',
                    300: 'rgb(var(--accent) / <alpha-value>)',
                    400: 'rgb(var(--accent) / <alpha-value>)',
                    500: 'rgb(var(--accent) / <alpha-value>)',
                    600: 'rgb(var(--accent) / <alpha-value>)'
                },
                indigo: {
                    100: 'rgb(var(--ink-2) / <alpha-value>)',
                    200: 'rgb(var(--ink-2) / <alpha-value>)',
                    300: 'rgb(var(--ink-3) / <alpha-value>)',
                    400: 'rgb(var(--ink-2) / <alpha-value>)',
                    500: 'rgb(var(--accent) / <alpha-value>)',
                    600: 'rgb(var(--accent) / <alpha-value>)'
                },
                fuchsia: {
                    300: 'rgb(var(--accent) / <alpha-value>)',
                    400: 'rgb(var(--accent) / <alpha-value>)'
                },
                // Token-backed (driven by CSS variables in index.css)
                bg: 'rgb(var(--bg) / <alpha-value>)',
                surface: {
                    DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
                    2: 'rgb(var(--surface-2) / <alpha-value>)',
                    muted: 'rgb(var(--surface-2) / <alpha-value>)',
                    subtle: 'rgb(var(--surface-2) / <alpha-value>)'
                },
                ink: {
                    DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
                    2: 'rgb(var(--ink-2) / <alpha-value>)',
                    3: 'rgb(var(--ink-3) / <alpha-value>)',
                    secondary: 'rgb(var(--ink-2) / <alpha-value>)',
                    muted: 'rgb(var(--ink-3) / <alpha-value>)',
                    faint: 'rgb(var(--ink-3) / <alpha-value>)'
                },
                rule: {
                    DEFAULT: 'rgb(var(--rule) / <alpha-value>)',
                    soft: 'rgb(var(--rule-soft) / <alpha-value>)'
                },
                border: {
                    DEFAULT: 'rgb(var(--rule-soft) / <alpha-value>)',
                    strong: 'rgb(var(--rule) / <alpha-value>)'
                },
                accent: {
                    DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
                    ink: 'rgb(var(--accent-ink) / <alpha-value>)',
                    coral: '#FF5C5C',
                    blue: '#3B82F6'
                },
                primary: {
                    DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
                    hover: 'rgb(var(--accent) / <alpha-value>)',
                    soft: 'rgb(var(--surface-2) / <alpha-value>)'
                },
                signal: {
                    danger: 'rgb(var(--signal-danger) / <alpha-value>)',
                    success: 'rgb(var(--signal-success) / <alpha-value>)',
                    warning: 'rgb(var(--signal-warning) / <alpha-value>)'
                },
                success: {
                    DEFAULT: 'rgb(var(--signal-success) / <alpha-value>)',
                    soft: 'rgb(var(--signal-success) / 0.12)'
                },
                warning: {
                    DEFAULT: 'rgb(var(--signal-warning) / <alpha-value>)',
                    soft: 'rgb(var(--signal-warning) / 0.12)'
                },
                danger: {
                    DEFAULT: 'rgb(var(--signal-danger) / <alpha-value>)',
                    soft: 'rgb(var(--signal-danger) / 0.12)'
                },
                // Legacy aliases mapped to new tokens for transitional safety
                lab: {
                    app: 'rgb(var(--bg) / <alpha-value>)',
                    sidebar: 'rgb(var(--surface) / <alpha-value>)',
                    'sidebar-border': 'rgb(var(--rule-soft) / <alpha-value>)',
                    card: 'rgb(var(--surface) / <alpha-value>)',
                    'card-border': 'rgb(var(--rule-soft) / <alpha-value>)',
                    ink: 'rgb(var(--ink) / <alpha-value>)',
                    muted: 'rgb(var(--ink-2) / <alpha-value>)',
                    subtle: 'rgb(var(--ink-3) / <alpha-value>)'
                },
                genomics: {
                    canvas: 'rgb(var(--bg) / <alpha-value>)',
                    fg: 'rgb(var(--ink) / <alpha-value>)',
                    'fg-muted': 'rgb(var(--ink-2) / <alpha-value>)',
                    'fg-subtle': 'rgb(var(--ink-3) / <alpha-value>)',
                    accent: 'rgb(var(--accent) / <alpha-value>)',
                    'accent-hover': 'rgb(var(--accent) / <alpha-value>)',
                    success: 'rgb(var(--signal-success) / <alpha-value>)',
                    warning: 'rgb(var(--signal-warning) / <alpha-value>)',
                    danger: 'rgb(var(--signal-danger) / <alpha-value>)',
                    border: 'rgb(var(--rule-soft) / <alpha-value>)',
                    'border-strong': 'rgb(var(--rule) / <alpha-value>)',
                    ring: 'rgb(var(--accent) / 0.4)'
                }
            },
            spacing: {
                section: '2rem',
                'section-lg': '2.5rem'
            },
            borderRadius: {
                // Brutalist: hard angles. Keep tokens for legacy class names but resolve to 0/2px.
                panel: '0px',
                'panel-lg': '0px',
                'panel-xl': '2px'
            },
            boxShadow: {
                // Editorial: replace glow with a sharp 1px accent bar shadow
                card: 'none',
                'card-hover': '0 0 0 1px rgb(var(--ink) / 1)',
                'panel-inset': 'inset 0 1px 0 0 rgb(var(--rule-soft) / 1)',
                'glow-accent': '0 0 0 2px rgb(var(--accent) / 1)'
            },
            fontFamily: {
                display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
            },
            fontSize: {
                eyebrow: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.16em' }],
                'display-2': ['2.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
                'display-1': ['4rem', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
                'display-hero': ['6rem', { lineHeight: '0.9', letterSpacing: '-0.04em' }]
            },
            letterSpacing: {
                eyebrow: '0.16em'
            },
            transitionTimingFunction: {
                snap: 'cubic-bezier(0.65, 0, 0.35, 1)'
            },
            animation: {
                drawIn: 'drawIn 400ms cubic-bezier(0.65, 0, 0.35, 1) both',
                bracketIn: 'bracketIn 220ms cubic-bezier(0.65, 0, 0.35, 1) both',
                tick: 'tick 400ms cubic-bezier(0.65, 0, 0.35, 1) both',
                shimmer: 'shimmer 1.6s linear infinite',
                marquee: 'marquee 38s linear infinite'
            },
            keyframes: {
                drawIn: {
                    '0%': { transform: 'scaleX(0)', transformOrigin: 'left center' },
                    '100%': { transform: 'scaleX(1)', transformOrigin: 'left center' }
                },
                bracketIn: {
                    '0%': { opacity: '0', transform: 'scale(0.85)' },
                    '100%': { opacity: '1', transform: 'scale(1)' }
                },
                tick: {
                    '0%': { transform: 'translateY(40%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' }
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' }
                },
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' }
                }
            }
        }
    },
    plugins: []
};
