'use client'

import { useState } from 'react'
import { Plus, Eye } from 'lucide-react'
import { UserForm } from './user-form'
import { UsersTable } from './users-table'
import { UserDetailSheet } from './user-detail-sheet'
import { Button } from '@/components/ui/button'
import { getUserWithTechnologies } from '@/app/actions/user-actions'

import { User } from '@prisma/client'

interface UserWithTechs extends User {
    technologies: { id: number; name: string }[]
}

interface UsersClientProps {
    initialUsers: User[]
}

export function UsersClient({ initialUsers }: UsersClientProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [selectedTechNames, setSelectedTechNames] = useState<string[]>([])
    const [detailUserId, setDetailUserId] = useState<number | null>(null)

    const handleEdit = async (user: User) => {
        const userWithTechs = await getUserWithTechnologies(user.id) as UserWithTechs | null
        if (userWithTechs) {
            setSelectedTechNames(userWithTechs.technologies.map(t => t.name))
        }
        setSelectedUser(user)
        setIsOpen(true)
    }

    const handleViewDetail = (user: User) => {
        setDetailUserId(user.id)
    }

    const handleAdd = () => {
        setSelectedUser(null)
        setIsOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Colaborador</h1>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                </Button>
            </div>

            <UsersTable 
                data={initialUsers} 
                onEdit={handleEdit}
                onViewDetail={handleViewDetail}
            />

            <UserForm
                open={isOpen}
                onOpenChange={setIsOpen}
                initialData={selectedUser}
            />

            <UserDetailSheet
                open={!!detailUserId}
                onOpenChange={(open) => !open && setDetailUserId(null)}
                userId={detailUserId}
            />
        </div>
    )
}
