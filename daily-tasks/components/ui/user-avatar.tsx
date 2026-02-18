'use client'

import { cn } from '@/lib/utils'

interface UserAvatarProps {
  username: string | null | undefined
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function UserAvatar({ username, className, size = 'md' }: UserAvatarProps) {
  const initials = username 
    ? username.slice(0, 3).toUpperCase() 
    : 'U'

  const sizes = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
  }

  return (
    <div
      className={cn(
        'flex aspect-square items-center justify-center rounded-full bg-accent text-accent-foreground font-bold uppercase',
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
