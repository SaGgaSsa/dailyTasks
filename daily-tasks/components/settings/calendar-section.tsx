'use client'

import { useState, useEffect } from 'react'
import { es } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { getNonWorkingDays, syncNonWorkingDays } from '@/app/actions/non-working-days'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface CalendarSectionProps {
  readOnly?: boolean
}

export function CalendarSection({ readOnly = false }: CalendarSectionProps) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const [selected, setSelected] = useState<Date[]>([])
  const [year, setYear] = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const result = await getNonWorkingDays()
      if (result.success && result.data) {
        setSelected(result.data.map((d) => new Date(d)))
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const result = await syncNonWorkingDays(selected)
    setSaving(false)
    if (result.success) {
      toast.success('Días no laborables guardados')
    } else {
      toast.error(result.error || 'Error al guardar')
    }
  }

  const selectedCount = selected.filter(
    (d) => d.getFullYear() === year
  ).length

  const isDisabledDay = (date: Date) => {
    const day = date.getDay()
    if (day === 0 || day === 6) return true
    if (date.getFullYear() !== year) return true
    if (
      date.getFullYear() === currentYear &&
      date.getMonth() < currentMonth
    ) {
      return true
    }
    return false
  }

  const handleSelect = (dates: Date[] | undefined) => {
    if (!dates) {
      setSelected([])
      return
    }
    setSelected(dates.filter((d) => !isDisabledDay(d)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Calendario</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Seleccioná los días no laborables (feriados). Estos días se excluyen del cálculo de fechas estimadas y se muestran diferenciados en el diagrama de Gantt.
        </p>
      </div>

      <div className="flex items-center justify-center gap-4 py-2">
        <Button
          variant="outline"
          size="icon"
          disabled={year <= currentYear}
          onClick={() => setYear((y) => y - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold tabular-nums w-16 text-center">
          {year}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={year >= currentYear + 2}
          onClick={() => setYear((y) => y + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-center">
        <Calendar
          mode="multiple"
          selected={selected}
          onSelect={readOnly ? undefined : handleSelect}
          locale={es}
          month={new Date(year, 0)}
          disableNavigation
          numberOfMonths={12}
          disabled={readOnly || isDisabledDay}
          className="[--cell-size:--spacing(7)]"
          modifiers={{
            nonWorking: selected,
          }}
          modifiersClassNames={{
            nonWorking: 'bg-red-500/20 text-red-400',
          }}
          classNames={{
            months: 'grid grid-cols-3 gap-4',
          }}
        />
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedCount} {selectedCount === 1 ? 'día seleccionado' : 'días seleccionados'} en {year}
          </span>
        </div>
      )}
    </div>
  )
}
