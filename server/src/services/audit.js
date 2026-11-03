/**
 * 员工操作日志
 * 作用：派单、退款、改价、开号、提现打款等关键操作都调用 audit() 记一笔，
 *       管理员在「操作日志」里能查到「谁、什么时候、做了什么」。
 */
const db = require('../db')

/**
 * @param actor 当前操作的员工（req.user）
 * @param action 做了什么，如「同意退款」
 * @param target 对象说明，如「#1023 ¥88」
 * @param trx 在事务里调用时传入事务对象，保证和业务操作一起成功或一起回滚
 */
async function audit(actor, action, target = '', trx = db) {
  await trx('audit_logs').insert({
    actor_id: actor.id, actor_name: actor.name, role: actor.role, action, target: String(target).slice(0, 255), created_at: Date.now()
  })
}

module.exports = { audit }
