/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface:      'var(--surface)',
        surfaceAlt:   'var(--surfaceAlt)',
        surfaceSink:  'var(--surfaceSink)',
        ink:          'var(--ink)',
        inkSoft:      'var(--inkSoft)',
        muted:        'var(--muted)',
        mutedSoft:    'var(--mutedSoft)',
        hairline:     'var(--hairline)',
        hairlineSoft: 'var(--hairlineSoft)',
        rule:         'var(--rule)',
        primaryWash:  'var(--primaryWash)',
        accentSoft:   'var(--accentSoft)',
        accentWash:   'var(--accentWash)',
        successWash:  'var(--successWash)',
        warnWash:     'var(--warnWash)',
        dangerWash:   'var(--dangerWash)',
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)'],
        body:    ['var(--font-body)'],
        mono:    ['var(--font-mono)', 'SF Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        licita: 'var(--r-lg)',
      },
    },
  },
  plugins: [],
}
