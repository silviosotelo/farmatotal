import ApiService from './ApiService'

export type WaTemplate = { id: string; name: string; category: string | null; content: string; active: boolean }
export type WaWorkflow = { id: string; name: string; trigger: string; templateName: string | null; active: boolean }
export type WaLogItem = { id: string; toPhone: string; templateName: string | null; status: string; error: string | null; createdAt: string }

export const apiWaTemplates = () => ApiService.fetchDataWithAxios<{ data: WaTemplate[] }>({ url: '/plugins/whatsapp/templates', method: 'get' })
export const apiWaCreateTemplate = (data: Partial<WaTemplate>) => ApiService.fetchDataWithAxios<WaTemplate>({ url: '/plugins/whatsapp/templates', method: 'post', data })
export const apiWaDeleteTemplate = (id: string) => ApiService.fetchDataWithAxios<{ ok: boolean }>({ url: `/plugins/whatsapp/templates/${id}`, method: 'delete' })

export const apiWaWorkflows = () => ApiService.fetchDataWithAxios<{ data: WaWorkflow[] }>({ url: '/plugins/whatsapp/workflows', method: 'get' })
export const apiWaCreateWorkflow = (data: Partial<WaWorkflow>) => ApiService.fetchDataWithAxios<WaWorkflow>({ url: '/plugins/whatsapp/workflows', method: 'post', data })
export const apiWaDeleteWorkflow = (id: string) => ApiService.fetchDataWithAxios<{ ok: boolean }>({ url: `/plugins/whatsapp/workflows/${id}`, method: 'delete' })

export const apiWaLog = () => ApiService.fetchDataWithAxios<{ data: WaLogItem[] }>({ url: '/plugins/whatsapp/log', method: 'get' })
export const apiWaTest = (toPhone: string) => ApiService.fetchDataWithAxios<{ ok: boolean }>({ url: '/plugins/whatsapp/test', method: 'post', data: { toPhone } })
