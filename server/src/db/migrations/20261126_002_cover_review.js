/**
 * 数据库升级 002（2026-11-26 内测反馈）
 *
 *  1. products.cover：单子封面图地址（cloud:// 文件 ID 或网址；空 = 不显示封面）
 *  2. withdrawals 两级审批：管理员初审 → 负责人终审并线下打款
 *       状态：待审核 →（管理员初审通过）待打款 →（负责人确认打款）已打款
 *             任一步都可以驳回 → 已驳回（钱退回护航的可提现余额）
 *     reviewer / reviewed_at：初审人和初审时间；handler / handled_at 仍记录最终处理人（打款或驳回）
 *
 * 云托管启动时会自动执行（见 src/bootstrap.js），不用手动跑。
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('products', (t) => {
    t.text('cover') // 封面图
  })
  await knex.schema.alterTable('withdrawals', (t) => {
    t.string('reviewer', 64) // 初审人（管理员名字）
    t.bigInteger('reviewed_at') // 初审时间
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('products', (t) => t.dropColumn('cover'))
  await knex.schema.alterTable('withdrawals', (t) => {
    t.dropColumn('reviewer')
    t.dropColumn('reviewed_at')
  })
}
