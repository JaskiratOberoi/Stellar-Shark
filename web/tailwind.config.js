/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
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
