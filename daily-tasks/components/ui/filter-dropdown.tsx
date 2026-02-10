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
import { Badge } from '@/components/ui/badge'
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
    label,
    options,
    selectedValues,
    allValues,
    onValuesChange,
    resetValue,
    className,
}: FilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)

    const showSelectedBadges = selectedValues.length > 0 && selectedValues.length < allValues.length

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
                        "bg-zinc-900 border-zinc-800 text-zinc-100 h-8 text-sm justify-start border-dashed",
                        className
                    )}
                >
                    {icon}
                    {showSelectedBadges && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <div className="hidden space-x-1 lg:flex">
                                {selectedValues.length > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {selectedValues.length}
                                    </Badge>
                                ) : (
                                    selectedValues.map(value => (
                                        <Badge variant="secondary" key={value} className="rounded-sm px-1 font-normal">
                                            {options.find(o => o.value === value)?.label || value}
                                        </Badge>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-zinc-900 border-zinc-800" align="start">
                {selectedValues.length > 0 && (!resetValue || selectedValues.length !== 1) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="w-full mb-2 h-7 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                        {resetValue ? 'Restablecer' : 'Limpiar filtros'}
                    </Button>
                )}
                <div className="space-y-1">
                    {options.map(opt => (
                        <label
                            key={opt.value}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-800 cursor-pointer"
                        >
                            <Checkbox
                                checked={selectedValues.includes(opt.value)}
                                onCheckedChange={(checked) => handleToggle(opt.value, checked === true)}
                                className="border-zinc-600"
                            />
                            <span className="text-sm text-zinc-300">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
