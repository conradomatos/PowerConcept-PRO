import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { applyTheme, getTheme, type Theme } from '@/lib/theme'

const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'xp-dark', label: 'XP Dark', icon: <Moon className="h-4 w-4" /> },
  { value: 'enterprise-light', label: 'Enterprise Light', icon: <Sun className="h-4 w-4" /> },
  { value: 'graphite-dark', label: 'Graphite Dark', icon: <Monitor className="h-4 w-4" /> },
]

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<Theme>(getTheme)

  function handleSelect(theme: Theme) {
    applyTheme(theme)
    setCurrent(theme)
  }

  const currentTheme = themes.find(t => t.value === current)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Alterar tema">
          {currentTheme?.icon ?? <Monitor className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Tema visual</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map(t => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => handleSelect(t.value)}
            className={current === t.value ? 'bg-accent text-accent-foreground' : ''}
          >
            <span className="mr-2">{t.icon}</span>
            {t.label}
            {current === t.value && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
