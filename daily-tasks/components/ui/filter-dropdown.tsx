'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface FilterOption {
    value: string
    label: string
}

interface FilterDropdownProps {
    icon: React.ReactNode
    label?: string
    options: FilterOption[]
    selectedValues: string[]
    allValues: string[]
    onValuesChange: (values: string[]) => void
    resetValue?: string
    className?: string
}

export function FilterDropdown({
    icon,
    options,
    selectedValues,
    allValues,
    onValuesChange,
    resetValue,
    className,
}: FilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)

    const handleToggle = (value: string, checked: boolean) => {
        if (checked) {
            onValuesChange([...selectedValues, value])
        } else {
            onValuesChange(selectedValues.filter(v => v !== value))
        }
    }

    const handleReset = () => {
        if (resetValue) {
            onValuesChange([resetValue])
        } else {
            onValuesChange([])
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "bg-muted border-border text-foreground h-8 text-sm justify-start border-dashed",
                        className
                    )}
                >
                    {icon}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-popover border-border" align="start">
                <div className="space-y-1">
                    {options.map(opt => (
                        <label
                            key={opt.value}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer"
                        >
                            <Checkbox
                                checked={selectedValues.includes(opt.value)}
                                onCheckedChange={(checked) => handleToggle(opt.value, checked === true)}
                                className="border-border"
                            />
                            <span className="text-sm text-popover-foreground">{opt.label}</span>
                        </label>
                    ))}
                </div>
                <Separator className="my-2 bg-border" />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                    Restablecer
                </Button>
            </PopoverContent>
        </Popover>
    )
}
