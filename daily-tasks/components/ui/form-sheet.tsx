'use client'

import { Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface FormSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    isEditMode: boolean
    isSaving: boolean
    onSave: () => Promise<boolean> | void
    onClose: () => void
    hasUnsavedChanges?: boolean
    onDiscard?: () => void
    children: React.ReactNode
}

export function FormSheet({
    open,
    onOpenChange,
    title,
    isEditMode,
    isSaving,
    onSave,
    onClose,
    hasUnsavedChanges,
    onDiscard,
    children,
}: FormSheetProps) {
    const handleSaveAndClose = async () => {
        const success = await onSave()
        if (success !== false) {
            onOpenChange(false)
        }
    }

    const handleClose = () => {
        if (hasUnsavedChanges && onDiscard) {
            onDiscard()
        } else {
            onClose()
        }
    }

    return (
        <Sheet
            open={open}
            onOpenChange={(newOpen) => {
                if (!newOpen) {
                    handleClose()
                }
            }}
        >
            <SheetContent
                showCloseButton={false}
                onInteractOutside={(e) => {
                    e.preventDefault()
                    if (hasUnsavedChanges && !isEditMode && onDiscard) {
                        onDiscard()
                    } else if (isEditMode) {
                        handleSaveAndClose()
                    } else {
                        onClose()
                    }
                }}
                className="w-full sm:min-w-[45vw] sm:max-w-[50vw] bg-[#191919] border-zinc-800 overflow-y-auto"
            >
                <SheetHeader className="space-y-2 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 pt-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleSaveAndClose}
                                disabled={isSaving}
                                className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                title="Guardar"
                            >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                        </Button>
                        </div>
                        <SheetTitle className="text-zinc-100 pt-1">
                            {title}
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            Formulario para {isEditMode ? 'editar' : 'crear'} registro
                        </SheetDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClose}
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                            title={hasUnsavedChanges ? "Descartar cambios" : "Cerrar"}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </SheetHeader>

                <div className="flex flex-col space-y-4 pt-4 py-6 pl-8">
                    {children}
                </div>
            </SheetContent>
        </Sheet>
    )
}

interface FormFieldProps {
    id?: string
    label: string
    children: React.ReactNode
}

export function FormField({ id, label, children }: FormFieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id} className="text-zinc-300">
                {label}
            </Label>
            {children}
        </div>
    )
}

interface FormInputProps extends React.ComponentProps<typeof Input> {
    label: string
}

export function FormInput({ label, id, className, ...props }: FormInputProps) {
    return (
        <FormField id={id} label={label}>
            <Input
                id={id}
                className={`bg-zinc-900 border-zinc-800 text-zinc-100 ${className || ''}`}
                {...props}
            />
        </FormField>
    )
}

interface FormTextareaProps extends React.ComponentProps<typeof Textarea> {
    label: string
}

export function FormTextarea({ label, id, className, ...props }: FormTextareaProps) {
    return (
        <FormField id={id} label={label}>
            <Textarea
                id={id}
                className={`bg-zinc-900 border-zinc-800 text-zinc-100 ${className || ''}`}
                {...props}
            />
        </FormField>
    )
}

interface SelectOption {
    value: string
    label: string
}

interface FormSelectProps {
    label: string
    id?: string
    value: string
    onValueChange: (value: string) => void
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    className?: string
}

export function FormSelect({
    label,
    id,
    value,
    onValueChange,
    options,
    placeholder,
    disabled,
    className,
}: FormSelectProps) {
    return (
        <FormField id={id} label={label}>
            <Select value={value} onValueChange={onValueChange} disabled={disabled}>
                <SelectTrigger className={`bg-zinc-900 border-zinc-800 text-zinc-100 ${className || ''}`}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-zinc-100">
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FormField>
    )
}

export function FormRow({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-4">{children}</div>
}

export function FormRow3({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-3 gap-4">{children}</div>
}

export { Label }
export type { FormSheetProps, FormFieldProps, FormInputProps, FormTextareaProps, FormSelectProps, SelectOption }
