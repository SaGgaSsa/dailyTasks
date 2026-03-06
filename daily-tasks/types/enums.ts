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
    BLOQUEANTE = "BLOQUEANTE",
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
    IN_DEVELOPMENT = "IN_DEVELOPMENT",
    TEST = "TEST",
    COMPLETED = "COMPLETED",
    DISCARDED = "DISCARDED",
}

export const TICKET_QA_STATUS_LABELS: Record<TicketQAStatus, string> = {
    [TicketQAStatus.NEW]: 'Nuevo',
    [TicketQAStatus.IN_DEVELOPMENT]: 'En Desarrollo',
    [TicketQAStatus.TEST]: 'Test',
    [TicketQAStatus.COMPLETED]: 'Completado',
    [TicketQAStatus.DISCARDED]: 'Descartado',
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
