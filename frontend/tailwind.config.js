/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: {
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    colors: {
      bg:'hsl(var(--bg) / <alpha-value>)',surface:'hsl(var(--surface) / <alpha-value>)','surface-2':'hsl(var(--surface-2) / <alpha-value>)','surface-3':'hsl(var(--surface-3) / <alpha-value>)',
      border:'hsl(var(--border) / <alpha-value>)',fg:'hsl(var(--fg) / <alpha-value>)','fg-muted':'hsl(var(--fg-muted) / <alpha-value>)','fg-subtle':'hsl(var(--fg-subtle) / <alpha-value>)',
      primary:'hsl(var(--primary) / <alpha-value>)',danger:'hsl(var(--danger) / <alpha-value>)',success:'hsl(var(--success) / <alpha-value>)',sidebar:'hsl(var(--sidebar-bg) / <alpha-value>)','sidebar-fg':'hsl(var(--sidebar-fg) / <alpha-value>)',
    },
  } },
  plugins: [],
};
