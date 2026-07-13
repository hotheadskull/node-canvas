import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['core/src/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    rules: {
      // Invariant I7: core/ is pure TypeScript. No UI, platform, or DB imports.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                'react/*',
                '@xyflow/*',
                '@tauri-apps/*',
                '@tiptap/*',
                'drizzle-orm',
                'drizzle-orm/*',
                'zustand',
                'zustand/*',
                '*.css',
              ],
              message: 'core/ must stay pure TypeScript (invariant I7). Move platform code to app/ or db/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/src/**/*.{ts,tsx}', 'db/src/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    rules: {},
  },
);
