/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                genomics: {
                    canvas: '#030712',
                    fg: '#f8fafc',
                    'fg-muted': '#94a3b8',
                    'fg-subtle': '#64748b',
                    accent: '#6366f1',
                    'accent-hover': '#818cf8',
                    success: '#22d3ee',
                    warning: '#fbbf24',
                    danger: '#fb7185',
                    border: 'rgba(255, 255, 255, 0.1)',
                    'border-strong': 'rgba(99, 102, 241, 0.28)',
                    ring: 'rgba(129, 140, 248, 0.55)'
                }
            },
            spacing: {
                section: '2rem',
                'section-lg': '2.5rem'
            },
            borderRadius: {
                panel: '1rem',
                'panel-lg': '1.25rem'
            },
            boxShadow: {
                'panel-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
                'glow-accent': '0 0 60px -15px rgba(99, 102, 241, 0.35)'
            },
            fontFamily: {
                display: ['Outfit', 'system-ui', 'sans-serif'],
                sans: ['DM Sans', 'system-ui', 'sans-serif']
            },
            animation: {
                float: 'float 8s ease-in-out infinite',
                drift: 'drift 22s linear infinite',
                pulseGlow: 'pulseGlow 4s ease-in-out infinite'
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                    '50%': { transform: 'translateY(-18px) rotate(2deg)' }
                },
                drift: {
                    '0%': { transform: 'translate(0,0) scale(1)' },
                    '33%': { transform: 'translate(30px,-20px) scale(1.05)' },
                    '66%': { transform: 'translate(-20px,15px) scale(0.98)' },
                    '100%': { transform: 'translate(0,0) scale(1)' }
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '0.45' },
                    '50%': { opacity: '0.85' }
                }
            }
        }
    },
    plugins: []
};
