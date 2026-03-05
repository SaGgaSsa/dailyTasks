import { Badge } from '@/components/ui/badge'

const priorityConfig: Record<string, { label: string; className: string }> = {
    HIGH: { label: 'Alta', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    MEDIUM: { label: 'Media', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    LOW: { label: 'Baja', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
    Bloqueante: { label: 'Bloqueante', className: 'bg-red-600/20 text-red-500 border-red-600/30' },
    Alta: { label: 'Alta', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    Media: { label: 'Media', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    Baja: { label: 'Baja', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
}

interface PriorityBadgeProps {
    priority: string
    className?: string
    variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link'
}

export function PriorityBadge({ priority, className = '', variant = 'outline' }: PriorityBadgeProps) {
    const config = priorityConfig[priority] || { label: priority, className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' }
    
    return (
        <Badge variant={variant} className={`${config.className} ${className}`}>
            {config.label}
        </Badge>
    )
}
