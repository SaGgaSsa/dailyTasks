'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = "Buscar...", className = "" }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value)
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout>()

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      onChange(newValue)
    }, 300)

    setDebounceTimeout(timeout)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Clear timeout and immediately search
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
      onChange(inputValue)
    }
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`pl-9 bg-input border-input text-foreground w-48 h-8 text-sm ${className}`}
      />
    </div>
  )
}