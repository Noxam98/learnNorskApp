module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  // android/ — нативный Gradle-проект Capacitor; внутри лежит КОПИЯ собранного веба
  // (app/src/main/assets/public) — линтить сборку бессмысленно.
  ignorePatterns: ['dist', '.eslintrc.cjs', 'android'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/jsx-no-target-blank': 'off',
    // Типизация в проекте — через JSDoc + tsc (npm run typecheck), PropTypes не используем.
    'react/prop-types': 'off',
    // HMR-подсказка Vite (компонент + не-компонент в одном файле) — для нашей структуры
    // (стор/хук/утилита рядом с компонентом) это шум, не проблема кода.
    'react-refresh/only-export-components': 'off',
  },
  overrides: [
    // Конфиги/ноды-скрипты исполняются в Node — там доступны process/module/__dirname.
    { files: ['*.config.js', '*.cjs', 'vite.config.js'], env: { node: true } },
  ],
}
