import ApiService from './ApiService'

export type EmailTemplate = {
    id: string
    key: string
    name: string
    subject: string
    bodyHtml: string
    variables: string[] | null
    active: boolean
}

export type QueueItem = {
    id: string
    toEmail: string
    subject: string
    status: 'pending' | 'sending' | 'sent' | 'failed'
    attempts: number
    lastError: string | null
    createdAt: string
    sentAt: string | null
}

export type LogItem = {
    id: string
    toEmail: string
    subject: string
    status: string
    provider: string | null
    error: string | null
    createdAt: string
}

export type MailerConfig = {
    provider: 'log' | 'sendgrid' | 'smtp'
    fromName: string
    fromEmail: string
    sendgridApiKey?: string
    smtp?: { host?: string; port?: number; user?: string; pass?: string; secure?: boolean }
}

export const apiGetTemplates = () =>
    ApiService.fetchDataWithAxios<{ data: EmailTemplate[] }>({ url: '/mailer/templates', method: 'get' })
export const apiCreateTemplate = (data: Partial<EmailTemplate>) =>
    ApiService.fetchDataWithAxios<EmailTemplate>({ url: '/mailer/templates', method: 'post', data })
export const apiUpdateTemplate = (id: string, data: Partial<EmailTemplate>) =>
    ApiService.fetchDataWithAxios<EmailTemplate>({ url: `/mailer/templates/${id}`, method: 'patch', data })
export const apiDeleteTemplate = (id: string) =>
    ApiService.fetchDataWithAxios<{ ok: boolean }>({ url: `/mailer/templates/${id}`, method: 'delete' })

export const apiGetQueue = () =>
    ApiService.fetchDataWithAxios<{ data: QueueItem[] }>({ url: '/mailer/queue', method: 'get' })
export const apiRetryQueue = (id: string) =>
    ApiService.fetchDataWithAxios<QueueItem>({ url: `/mailer/queue/${id}/retry`, method: 'post' })
export const apiProcessQueue = () =>
    ApiService.fetchDataWithAxios<{ sent: number; failed: number }>({ url: '/mailer/process', method: 'post' })

export const apiGetMailLog = () =>
    ApiService.fetchDataWithAxios<{ data: LogItem[] }>({ url: '/mailer/log', method: 'get' })

export const apiGetMailerConfig = () =>
    ApiService.fetchDataWithAxios<MailerConfig>({ url: '/mailer/config', method: 'get' })
export const apiSaveMailerConfig = (data: MailerConfig) =>
    ApiService.fetchDataWithAxios<{ ok: boolean }>({ url: '/mailer/config', method: 'put', data })

export const apiSendTestEmail = (toEmail: string) =>
    ApiService.fetchDataWithAxios<{ queued: string }>({ url: '/mailer/test', method: 'post', data: { toEmail } })
