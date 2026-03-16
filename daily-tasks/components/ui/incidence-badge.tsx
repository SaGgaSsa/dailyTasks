import { Badge } from '@/components/ui/badge'
import { getWorkItemTypeColorOption, workItemTypeColorMap } from '@/lib/work-item-color-options'

const legacyTypeColors: Record<string, string> = {
    BUG: workItemTypeColorMap.red.badgeClassName,
    FEATURE: workItemTypeColorMap.green.badgeClassName,
    I_MODAPL: workItemTypeColorMap.blue.badgeClassName,
    I_CASO: workItemTypeColorMap.orange.badgeClassName,
    I_CONS: workItemTypeColorMap.purple.badgeClassName,
}

interface IncidenceBadgeProps {
    type: string
    externalId: number | string
    color?: string | null
    className?: string
    variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link'
}

export function IncidenceBadge({ type, externalId, color, className = '', variant = 'outline' }: IncidenceBadgeProps) {
    const colorClassName = color && getWorkItemTypeColorOption(color)
        ? getWorkItemTypeColorOption(color)!.badgeClassName
        : legacyTypeColors[type] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'

    return (
        <Badge
            variant={variant}
            className={`${colorClassName} ${className}`}
        >
            {type} {externalId}
        </Badge>
    )
}
