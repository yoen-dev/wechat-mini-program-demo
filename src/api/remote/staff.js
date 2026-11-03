// 员工账号 / 护航资料接口（真实后端版）  对应 server/src/routes/staff.js
import { get, post } from './request.js'
import { ROLE_NAME, STAFF_ROLES } from '../constants.js'
export { ROLE_NAME, STAFF_ROLES }

export const listStaff = (actor, role = '') => get('/staff', { role })
/** 护航列表（带在线状态、手上单数、评分，在线的排前面） */
export const listEscorts = ({ onlineOnly = false } = {}) => get('/escorts', { onlineOnly: onlineOnly ? 1 : '' })
export const getEscort = (id) => get(`/escorts/${id}`)
export const setOnline = (actor, online) => post('/escorts/me/online', { online })
export const saveProfile = (actor, profile) => post('/escorts/me/profile', profile)
export const createStaff = (actor, data) => post('/staff', data)
/** 重置密码，返回 { ok, password: 随机新密码 } */
export const resetPassword = (actor, id) => post(`/staff/${id}/reset-password`)
export const toggleStaff = (actor, id) => post(`/staff/${id}/toggle`)
