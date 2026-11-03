/**
 * 数据库连接配置（给 knex 命令行和程序共用）
 * 作用：告诉 knex 连哪个 MySQL、迁移文件放在哪。
 * 一般不用改，数据库地址和密码在 .env 里改。
 */
const path = require('path')
const config = require('../config')

module.exports = {
  client: 'mysql2',
  connection: {
    ...config.db,
    charset: 'utf8mb4', // 支持中文和表情
    timezone: '+08:00', // 按北京时间读写 DATETIME
    dateStrings: false,
    decimalNumbers: true // DECIMAL 金额字段直接返回数字，而不是字符串
  },
  pool: { min: 0, max: 10 },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    tableName: 'knex_migrations'
  }
}
