export default {
  content: ['./index.html', './*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        red: { DEFAULT: '#FF2D2D' },
        green: { DEFAULT: '#00FF88' },
        blue: { DEFAULT: '#00AEEF' },
        amber: { DEFAULT: '#F59E0B' },
        surface: { DEFAULT: '#0b0b0f' },
        surface2: { DEFAULT: '#111111' },
        border: { DEFAULT: '#26272b' },
        'red-dim': 'rgba(255,45,45,0.08)',
        'amber-dim': 'rgba(245,158,11,0.08)',
        'green-dim': 'rgba(0,255,136,0.08)',
        'blue-dim': 'rgba(0,174,239,0.08)',
      },
    },
  },
  plugins: [],
}
