import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
const config = [...nextVitals, ...nextTypeScript, { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] }, { linterOptions: { reportUnusedDisableDirectives: 'off' } }, { files: ['src/components/search-experience.tsx'], rules: { 'react-hooks/set-state-in-effect': 'off' } }];
export default config;
