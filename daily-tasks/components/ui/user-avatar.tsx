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
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-zinc-800 text-zinc-200 font-bold uppercase',
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
