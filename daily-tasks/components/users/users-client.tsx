'use client'

import { useState } from 'react'
import { Plus, Eye } from 'lucide-react'
import { UserSheet } from './user-sheet'
import { UsersTable } from './users-table'
import { UserDetailSheet } from './user-detail-sheet'
import { Button } from '@/components/ui/button'

import { User } from '@prisma/client'

interface UsersClientProps {
    initialUsers: User[]
}

export function UsersClient({ initialUsers }: UsersClientProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [detailUserId, setDetailUserId] = useState<number | null>(null)

    const handleEdit = (user: User) => {
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

            <UserSheet
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
