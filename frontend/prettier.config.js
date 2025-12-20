import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const indentWidth = packageJson?.prettier?.tabWidth ?? 2

export default {
  singleQuote: true,
  semi: false,
  tabWidth: indentWidth,
  trailingComma: 'all',
  printWidth: 100,
  arrowParens: 'always',
}
