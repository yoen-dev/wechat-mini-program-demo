/**
 * 启动前准备
 * 作用：服务启动时自动建表 / 升级表结构，并创建管理员账号和示例轮播图（已存在就跳过）。
 * 云托管上没有命令行可以手动执行 npm run migrate，所以放在启动流程里自动完成（连库都不存在时也会自动建库）。
 * 不想自动建表时，把环境变量 AUTO_MIGRATE 设为 false，改为手动执行 npm run migrate。
 */
const config = require('./config')
const db = require('./db')
const seed = require('./db/seed')

// 数据库（库）不存在就自动创建（云托管新开的 MySQL 里只有空实例，省去手动建库）
async function ensureDatabase() {
  const mysql = require('mysql2/promise')
  const { host, port, user, password, database } = config.db
  const conn = await mysql.createConnection({ host, port, user, password })
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, '')}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.end()
}

async function bootstrap() {
  if (config.autoMigrate) {
    await ensureDatabase()
    // 多个实例同时启动时，knex 会用 knex_migrations_lock 表加锁，只有一个实例真正执行
    const [, done] = await db.migrate.latest()
    if (done.length) console.log('[数据库] 已执行迁移：', done.join(', '))
  }
  await seed.init()
}

module.exports = { bootstrap }
