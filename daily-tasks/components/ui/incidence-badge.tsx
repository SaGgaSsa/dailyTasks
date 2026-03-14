import { Badge } from '@/components/ui/badge'

const typeColors: Record<string, string> = {
    I_MODAPL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    I_CASO: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    I_CONS: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

interface IncidenceBadgeProps {
    type: string
    externalId: number | string
    className?: string
    variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link'
}

export function IncidenceBadge({ type, externalId, className = '', variant = 'outline' }: IncidenceBadgeProps) {
    return (
        <Badge
            variant={variant}
            className={`${typeColors[type] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'} ${className}`}
        >
            {type} {externalId}
        </Badge>
    )
}
