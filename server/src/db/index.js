/**
 * 数据库连接实例
 * 作用：创建全局唯一的数据库连接池，其他文件 `const db = require('../db')` 即可查询。
 * 用法示例：await db('orders').where({ id: 1 }).first()
 */
const knex = require('knex')
const knexfile = require('./knexfile')

const db = knex(knexfile)

module.exports = db
