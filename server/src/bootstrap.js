/**
 * 启动前准备
 * 作用：服务启动时自动建表 / 升级表结构，并创建管理员账号和示例轮播图（已存在就跳过）。
 * 云托管上没有命令行可以手动执行 npm run migrate，所以放在启动流程里自动完成。
 * 不想自动建表时，把环境变量 AUTO_MIGRATE 设为 false，改为手动执行 npm run migrate。
 */
const config = require('./config')
const db = require('./db')
const seed = require('./db/seed')

async function bootstrap() {
  if (config.autoMigrate) {
    // 多个实例同时启动时，knex 会用 knex_migrations_lock 表加锁，只有一个实例真正执行
    const [, done] = await db.migrate.latest()
    if (done.length) console.log('[数据库] 已执行迁移：', done.join(', '))
  }
  await seed.init()
}

module.exports = { bootstrap }
