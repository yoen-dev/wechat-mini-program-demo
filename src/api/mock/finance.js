// 分成 / 提现 / 系统设置接口（模拟）
import { db, save, nextId, respond, fail, audit, isAdmin, nameOf, DEFAULT_FAQS } from './db.js'

// ---------------- 系统设置 ----------------
export function getSettings() {
  return respond(db().settings, 40)
}

/** 管理员修改设置：分成比例、自动确认时长、公告、常见问题、协议 */
export function saveSettings(actor, patch) {
  if (!isAdmin(actor)) return fail('无权限')
  const s = db().settings
  const changed = []
  if (patch.shareRate !== undefined) {
    const r = Number(patch.shareRate)
    if (!(r >= 0 && r <= 1)) return fail('分成比例需在 0–100% 之间')
    if (r !== s.shareRate) changed.push(`分成比例 ${Math.round(s.shareRate * 100)}% → ${Math.round(r * 100)}%`)
    s.shareRate = r
  }
  if (patch.autoConfirmHours !== undefined) {
    const h = Number(patch.autoConfirmHours)
    if (!(h >= 0 && h <= 168)) return fail('自动确认时长需在 0–168 小时之间')
    if (h !== s.autoConfirmHours) changed.push(`自动确认 ${s.autoConfirmHours}h → ${h}h`)
    s.autoConfirmHours = h
  }
  if (patch.recharge) {
    const rc = patch.recharge
    if (rc.tiers) {
      const tiers = rc.tiers.map((t) => ({ pay: Number(t.pay), bonus: Number(t.bonus) || 0 })).filter((t) => t.pay > 0)
      if (!tiers.length) return fail('至少保留一个充值档位')
      if (tiers.some((t) => t.bonus < 0 || t.bonus >= t.pay)) return fail('赠送金额需小于充值金额')
      s.recharge.tiers = tiers.sort((a, b) => a.pay - b.pay)
    }
    if (rc.popup !== undefined) s.recharge.popup = !!rc.popup
    if (rc.popupMin !== undefined) s.recharge.popupMin = Math.max(0, Number(rc.popupMin) || 0)
    changed.push('充值设置')
  }
  if (patch.notice !== undefined && patch.notice !== s.notice) { s.notice = patch.notice.trim(); changed.push('公告') }
  if (patch.faqs) { s.faqs = patch.faqs.filter((f) => f.q && f.q.trim()); changed.push('常见问题') }
  if (patch.agreements) { s.agreements = { ...s.agreements, ...patch.agreements }; changed.push('协议') }
  if (changed.length) audit(actor, '修改设置', changed.join('；'))
  save()
  return respond(s)
}

export function resetFaqs(actor) {
  return saveSettings(actor, { faqs: DEFAULT_FAQS })
}

// ---------------- 护航收入 ----------------
function incomeOf(escortId) {
  const d = db()
  const done = d.orders.filter((o) => o.escortId === escortId && o.status === '已完成').sort((a, b) => b.completedAt - a.completedAt)
  const total = done.reduce((s, o) => s + (o.escortShare || 0), 0)
  const ws = d.withdrawals.filter((w) => w.escortId === escortId)
  const withdrawn = ws.filter((w) => w.status === '已打款').reduce((s, w) => s + w.amount, 0)
  const pending = ws.filter((w) => ['待审核', '待打款'].includes(w.status)).reduce((s, w) => s + w.amount, 0)
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const month = done.filter((o) => o.completedAt >= monthStart.getTime()).reduce((s, o) => s + o.escortShare, 0)
  const waiting = d.orders.filter((o) => o.escortId === escortId && o.status === '待确认').reduce((s, o) => s + o.amount * d.settings.shareRate, 0)
  const r2 = (n) => Math.round(n * 100) / 100
  return {
    rate: d.settings.shareRate, total: r2(total), month: r2(month), withdrawn: r2(withdrawn), pending: r2(pending),
    available: r2(total - withdrawn - pending), waiting: r2(waiting),
    records: done.slice(0, 50).map((o) => ({ id: o.id, productName: o.productName, amount: o.amount, share: o.escortShare, t: o.completedAt })),
    withdrawals: ws.slice().sort((a, b) => b.createdAt - a.createdAt)
  }
}

export function getIncome(actor) {
  if (actor.role !== 'escort') return fail('无权限')
  return respond(incomeOf(actor.id))
}

export function requestWithdraw(actor, amount) {
  if (actor.role !== 'escort') return fail('无权限')
  const a = Math.round(Number(amount) * 100) / 100
  const inc = incomeOf(actor.id)
  if (!(a > 0)) return fail('请输入提现金额')
  if (a > inc.available) return fail(`最多可提现 ¥${inc.available}`)
  db().withdrawals.push({ id: nextId('withdrawal'), escortId: actor.id, amount: a, status: '待审核', createdAt: Date.now() })
  save()
  return respond({ ok: true })
}

// ---------------- 提现审批（两级：管理员初审 → 负责人确认打款） ----------------
// 没有启用中的负责人账号时，管理员也能做第二步
const hasOwner = () => db().users.some((u) => u.role === 'owner' && u.status === 'active')
function canHandle(w, u) {
  if (w.status === '待审核') return u.role === 'admin'
  if (w.status === '待打款') return u.role === 'owner' || (u.role === 'admin' && !hasOwner())
  return false
}

export function listWithdrawals(actor) {
  if (!['admin', 'owner'].includes(actor.role)) return fail('无权限')
  return respond(db().withdrawals.slice().sort((a, b) => b.createdAt - a.createdAt).map((w) => ({ ...w, escortName: nameOf(w.escortId), canHandle: canHandle(w, actor) })))
}

/** approve=true：待审核 → 待打款（初审通过）；待打款 → 已打款（确认已线下转账）。false 为驳回 */
export function handleWithdraw(actor, id, approve, note = '') {
  const w = db().withdrawals.find((x) => x.id === id)
  if (!w || !['待审核', '待打款'].includes(w.status)) return fail('状态已变化')
  if (!canHandle(w, actor)) return fail(w.status === '待审核' ? '需要管理员先初审' : '需要负责人确认打款')
  let action
  if (!approve) {
    action = '驳回提现'
    Object.assign(w, { status: '已驳回', handledAt: Date.now(), handler: actor.name, note })
  } else if (w.status === '待审核') {
    action = '提现初审通过'
    Object.assign(w, { status: '待打款', reviewedAt: Date.now(), reviewer: actor.name, note })
  } else {
    action = '提现打款'
    Object.assign(w, { status: '已打款', handledAt: Date.now(), handler: actor.name, note: note || w.note })
  }
  audit(actor, action, `${nameOf(w.escortId)} ¥${w.amount}`)
  save()
  return respond({ ...w, escortName: nameOf(w.escortId), canHandle: canHandle(w, actor) })
}
