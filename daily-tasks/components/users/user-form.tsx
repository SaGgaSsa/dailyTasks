'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { FormSheet, FormInput, FormSelect, FormRow } from '@/components/ui/form-sheet'
import { upsertUser, getUserWithTechnologies } from '@/app/actions/user-actions'
import { toast } from 'sonner'
import { User, UserRole } from '@prisma/client'

interface UserFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData: User | null
    initialTechNames?: string[]
}

const roleOptions = [
    { value: 'ADMIN', label: 'ADMIN' },
    { value: 'DEV', label: 'DEV' },
    { value: 'QA', label: 'QA' },
]

const TECH_OPTIONS = [
    { value: 'SISA', label: 'SISA' },
    { value: 'WEB', label: 'WEB' },
    { value: 'ANDROID', label: 'ANDROID' },
    { value: 'ANGULAR', label: 'ANGULAR' },
    { value: 'SPRING', label: 'SPRING' },
]

export function UserForm({ open, onOpenChange, initialData, initialTechNames = [] }: UserFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'DEV',
        technologies: [] as string[],
    })

    const isEditMode = !!initialData

    useEffect(() => {
        if (open && initialData) {
            setIsLoading(true)
            setFormData({
                name: '',
                email: '',
                username: '',
                password: '',
                role: 'DEV',
                technologies: [],
            })
            setTimeout(() => {
                setFormData({
                    name: initialData.name || '',
                    email: initialData.email || '',
                    username: initialData.username || '',
                    password: '',
                    role: initialData.role || 'DEV',
                    technologies: initialTechNames,
                })
                setIsLoading(false)
            }, 0)
        } else if (open) {
            setIsLoading(true)
            setFormData({
                name: '',
                email: '',
                username: '',
                password: '',
                role: 'DEV',
                technologies: [],
            })
            setIsLoading(false)
        }
    }, [initialData, open])

    const handleSave = async () => {
        if (!formData.name || !formData.email || !formData.username) {
            toast.error('Nombre, email y username son requeridos')
            return false
        }

        if (!isEditMode && !formData.password) {
            toast.error('La contraseña es requerida para nuevos usuarios')
            return false
        }

        setIsSaving(true)
        try {
            const techNames = formData.technologies as string[]
            const technologies = techNames.map(name => ({ connect: { name } }))
            console.log('technologies to save:', technologies)
            
            const res = await upsertUser({
                id: initialData?.id,
                name: formData.name,
                email: formData.email,
                username: formData.username,
                password: formData.password,
                role: formData.role as UserRole,
                technologies,
            })

            if (res.success) {
                router.refresh()
                toast.success(initialData ? 'Usuario actualizado' : 'Usuario creado')
                return true
            } else {
                toast.error(res.error || 'Error al guardar el usuario')
                return false
            }
        } catch (err) {
            toast.error('Error inesperado al guardar')
            return false
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
    }

    const title = isEditMode ? 'Editar Usuario' : 'Nuevo Usuario'

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            isEditMode={isEditMode}
            isSaving={isSaving}
            onSave={handleSave}
            onClose={handleClose}
        >
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-32">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <span className="mt-4 text-muted-foreground">Cargando datos...</span>
                </div>
            ) : (
                <>
            <FormInput
                id="name"
                label="Nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Pérez"
                required
            />

            <FormInput
                id="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@ejemplo.com"
                required
            />

            <FormRow>
                <FormInput
                    id="username"
                    label="Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toUpperCase() })}
                    placeholder="SAG"
                    maxLength={3}
                    required
                />

                <FormSelect
                    id="role"
                    label="Rol"
                    value={formData.role}
                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                    options={roleOptions}
                />
            </FormRow>

            <FormInput
                id="password"
                label={isEditMode ? 'Contraseña (dejar vacío para mantener)' : 'Contraseña'}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!isEditMode}
            />

            <FormSelect
                id="technologies"
                label="Tecnologías"
                value={formData.technologies[0] || ''}
                onValueChange={(val) => setFormData({ ...formData, technologies: val ? [val] : [] })}
                options={TECH_OPTIONS}
                placeholder="Seleccionar tecnología"
            />
            </>)
        }
        </FormSheet>
    )
}
