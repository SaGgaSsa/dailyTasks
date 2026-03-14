'use client'

import { Textarea } from '@/components/ui/textarea'

interface ObservationProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function Observation({ value, onChange, placeholder, disabled = false }: ObservationProps) {
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
      disabled={disabled}
    />
  )
}
