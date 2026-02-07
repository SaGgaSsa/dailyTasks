'use client'

import { useTheme } from '@/lib/use-theme'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeIconProps {
  className?: string
  fallback?: React.ReactNode
}

export function ThemeIcon({ className, fallback }: ThemeIconProps) {
  const { mounted, resolvedTheme } = useTheme()

  if (!mounted) {
    return fallback || <div className={cn("h-4 w-4", className)} />
  }

  if (resolvedTheme === 'dark') {
    return <Moon className={className} />
  }

  return <Sun className={className} />
}

export function DarkIcon({ className, fallback }: ThemeIconProps) {
  const { mounted } = useTheme()
  
  if (!mounted) {
    return fallback || <div className={cn("h-4 w-4", className)} />
  }
  
  return <Moon className={className} />
}

export function LightIcon({ className, fallback }: ThemeIconProps) {
  const { mounted } = useTheme()
  
  if (!mounted) {
    return fallback || <div className={cn("h-4 w-4", className)} />
  }
  
  return <Sun className={className} />
}
