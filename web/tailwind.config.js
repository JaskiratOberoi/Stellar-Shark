/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                surface: {
                    DEFAULT: '#FFFFFF',
                    muted: '#F5F7FA',
                    subtle: '#EEF2F6'
                },
                ink: {
                    DEFAULT: '#0F172A',
                    secondary: '#475569',
                    muted: '#64748B',
                    faint: '#94A3B8'
                },
                primary: {
                    DEFAULT: '#2563EB',
                    hover: '#1D4ED8',
                    soft: '#EFF6FF'
                },
                accent: {
                    coral: '#F97366',
                    blue: '#3B82F6'
                },
                success: {
                    DEFAULT: '#16A34A',
                    soft: '#DCFCE7'
                },
                warning: {
                    DEFAULT: '#D97706',
                    soft: '#FEF3C7'
                },
                danger: {
                    DEFAULT: '#DC2626',
                    soft: '#FEE2E2'
                },
                border: {
                    DEFAULT: '#E2E8F0',
                    strong: '#CBD5E1'
                },
                lab: {
                    app: '#F5F7FA',
                    sidebar: '#FFFFFF',
                    'sidebar-border': '#E2E8F0',
                    card: '#FFFFFF',
                    'card-border': '#E8EDF3',
                    ink: '#0F172A',
                    muted: '#64748B',
                    subtle: '#94A3B8'
                },
                genomics: {
                    canvas: '#F5F7FA',
                    fg: '#0F172A',
                    'fg-muted': '#475569',
                    'fg-subtle': '#64748B',
                    accent: '#2563EB',
                    'accent-hover': '#1D4ED8',
                    success: '#16A34A',
                    warning: '#D97706',
                    danger: '#DC2626',
                    border: '#E2E8F0',
                    'border-strong': '#CBD5E1',
                    ring: 'rgba(37, 99, 235, 0.35)'
                }
            },
            spacing: {
                section: '2rem',
                'section-lg': '2.5rem'
            },
            borderRadius: {
                panel: '0.75rem',
                'panel-lg': '1rem',
                'panel-xl': '1.25rem'
            },
            boxShadow: {
                card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)',
                'card-hover': '0 4px 12px rgba(15, 23, 42, 0.08)',
                'panel-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
                'glow-accent': '0 0 40px -10px rgba(37, 99, 235, 0.25)'
            },
            fontFamily: {
                display: ['Inter', 'system-ui', 'sans-serif'],
                sans: ['Inter', 'system-ui', 'sans-serif']
            },
            animation: {
                float: 'float 8s ease-in-out infinite',
                drift: 'drift 22s linear infinite',
                pulseGlow: 'pulseGlow 4s ease-in-out infinite'
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                    '50%': { transform: 'translateY(-8px) rotate(1deg)' }
                },
                drift: {
                    '0%': { transform: 'translate(0,0) scale(1)' },
                    '33%': { transform: 'translate(20px,-12px) scale(1.02)' },
                    '66%': { transform: 'translate(-12px,10px) scale(0.99)' },
                    '100%': { transform: 'translate(0,0) scale(1)' }
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '0.5' },
                    '50%': { opacity: '0.9' }
                }
            }
        }
    },
    plugins: []
};
