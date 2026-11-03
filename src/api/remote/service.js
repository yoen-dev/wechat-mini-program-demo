// 售后工单 / 护航报名 / 用户管理 / 操作日志（真实后端版）  对应 server/src/routes/service.js
import { get, post } from './request.js'
export { TICKET_TYPES } from '../constants.js'

export const createTicket = (actor, { orderId, type, content }) => post('/tickets', { orderId, type, content })
export const listTickets = (actor, { mine = false } = {}) => get('/tickets', { mine: mine ? 1 : '' })
export const replyTicket = (actor, id, text, resolve = false) => post(`/tickets/${id}/reply`, { text, resolve })

export const submitApplication = (actor, form) => post('/applications', form)
export const myApplication = () => get('/applications/mine')
export const listApplications = () => get('/applications')
/** 通过后自动开通护航账号，返回 { application, account: { account, password } } */
export const handleApplication = (actor, id, approve, note = '') => post(`/applications/${id}/handle`, { approve, note })

export const listCustomers = (actor, keyword = '') => get('/customers', { keyword })
export const toggleCustomer = (actor, id, reason = '') => post(`/customers/${id}/toggle`, { reason })

export const listLogs = () => get('/logs')
