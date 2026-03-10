export enum TaskStatus {
    BACKLOG = "BACKLOG",
    TODO = "TODO",
    IN_PROGRESS = "IN_PROGRESS",
    REVIEW = "REVIEW",
    DONE = "DONE",
}

export enum TaskType {
    I_MODAPL = "I_MODAPL",
    I_CASO = "I_CASO",
    I_CONS = "I_CONS",
}

export enum Priority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    BLOCKER = "BLOCKER",
}

export enum TicketType {
    BUG = "BUG",
    CAMBIO = "CAMBIO",
    CONSULTA = "CONSULTA",
}

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
    [TicketType.BUG]: 'Bug',
    [TicketType.CAMBIO]: 'Cambio',
    [TicketType.CONSULTA]: 'Consulta',
}

export enum TicketQAStatus {
    NEW = "NEW",
    ASSIGNED = "ASSIGNED",
    IN_DEVELOPMENT = "IN_DEVELOPMENT",
    TEST = "TEST",
    COMPLETED = "COMPLETED",
    DISMISSED = "DISMISSED",
}

export const TICKET_QA_STATUS_LABELS: Record<TicketQAStatus, string> = {
    [TicketQAStatus.NEW]: 'Nuevo',
    [TicketQAStatus.ASSIGNED]: 'Asignado',
    [TicketQAStatus.IN_DEVELOPMENT]: 'En Desarrollo',
    [TicketQAStatus.TEST]: 'Test',
    [TicketQAStatus.COMPLETED]: 'Completado',
    [TicketQAStatus.DISMISSED]: 'Desestimado',
}

export enum UserRole {
    ADMIN = "ADMIN",
    DEV = "DEV",
    QA = "QA",
}

export enum WorkspaceRole {
    OWNER = "OWNER",
    ADMIN = "ADMIN",
    MEMBER = "MEMBER",
}

export enum AttachmentType {
    FILE = "FILE",
    LINK = "LINK",
}

export enum TracklistStatus {
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    ARCHIVED = "ARCHIVED",
}

export const TRACKLIST_STATUS_LABELS: Record<TracklistStatus, string> = {
    [TracklistStatus.ACTIVE]: 'Activo',
    [TracklistStatus.COMPLETED]: 'Completado',
    [TracklistStatus.ARCHIVED]: 'Archivado',
}
