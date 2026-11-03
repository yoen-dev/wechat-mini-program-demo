// 经营数据（真实后端版）  对应 server/src/routes/analytics.js
import { get } from './request.js'

/** days: 1 | 7 | 30 | 90 */
export const getAnalytics = (actor, days = 7) => get('/analytics', { days })
