export const FAIL_PATTERNS = [
  /\bthe system\b/i,
  /\bthis system\b/i,
  /\bprocessing(?:\s*(?:\.\.\.|…))/i,
  /\bmodel output\b/i,
  /\bgenerating response\b/i,
  /\bautomatically generated\b/i,
]

export const WARN_PATTERNS = [
  /\byou must\b/i,
  /\byou need to\b/i,
  /\bimpossible\b/i,
  /\bwill fail\b/i,
  /\bwon't work\b/i,
  /\bno chance\b/i,
]

export const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx'])

export const TARGET_DIRS = ['app', 'components', 'content', 'src/app', 'src/components', 'src/content']
