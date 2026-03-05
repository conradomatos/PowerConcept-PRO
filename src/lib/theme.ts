export type Theme = 'xp-dark' | 'enterprise-light' | 'graphite-dark'

const STORAGE_KEY = 'powerconcept-theme'
const DEFAULT: Theme = 'xp-dark'

export function applyTheme(theme: Theme) {
  const root = document.documentElement

  // Limpar estado anterior
  root.classList.remove('dark')
  root.removeAttribute('data-theme')

  if (theme === 'xp-dark') {
    root.classList.add('dark')
  } else if (theme === 'enterprise-light') {
    root.setAttribute('data-theme', 'enterprise')
    // sem .dark
  } else if (theme === 'graphite-dark') {
    root.classList.add('dark')
    root.setAttribute('data-theme', 'graphite')
  }

  localStorage.setItem(STORAGE_KEY, theme)
}

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  applyTheme(saved ?? DEFAULT)
}

export function getTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? DEFAULT
}
