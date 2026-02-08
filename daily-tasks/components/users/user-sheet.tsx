'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { upsertUser } from '@/app/actions/user-actions'
import { toast } from 'sonner'

import { User, UserRole } from '@prisma/client'
import { TechStack } from '@/types/enums'

interface UserSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData: User | null
}

export function UserSheet({ open, onOpenChange, initialData }: UserSheetProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'DEV',
        technologies: [] as string[],
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                email: initialData.email || '',
                username: initialData.username || '',
                password: '',
                role: initialData.role || 'DEV',
                technologies: initialData.technologies || [],
            })
        } else {
            setFormData({
                name: '',
                email: '',
                username: '',
                password: '',
                role: 'DEV',
                technologies: [],
            })
        }
    }, [initialData, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await upsertUser({
                id: initialData?.id,
                name: formData.name,
                email: formData.email,
                username: formData.username,
                password: formData.password || 'sisa0314',
                role: formData.role as UserRole,
                technologies: formData.technologies as TechStack[],
            })

            if (res.success) {
                onOpenChange(false)
                router.refresh()
                toast.success(initialData ? 'Usuario actualizado' : 'Usuario creado')
            } else {
                toast.error(res.error || 'Error al guardar el usuario')
            }
        } catch (err) {
            console.error(err)
            toast.error('Error inesperado al guardar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{initialData ? 'Editar Usuario' : 'Nuevo Usuario'}</SheetTitle>
                    <SheetDescription>
                        {initialData
                            ? 'Edita los detalles del usuario existente.'
                            : 'Agrega un nuevo usuario al sistema.'}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Juan Pérez"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            placeholder="juan@ejemplo.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value.toUpperCase() })}
                            required
                            maxLength={3}
                            placeholder="SAG"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">
                            Contraseña {initialData && '(Opcional se dejas en blanco)'}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={!initialData}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Rol</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(val) => setFormData({ ...formData, role: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ADMIN">ADMIN</SelectItem>
                                <SelectItem value="DEV">USER (DEV)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <SheetFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </SheetFooter>

                </form>
            </SheetContent>
        </Sheet>
    )
}
