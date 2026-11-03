/**
 * 数据库建表（第一版）
 * 作用：创建项目用到的全部表。执行 `npm run migrate` 时自动运行，只会执行一次。
 * 以后要加字段 / 加表：不要改这个文件，新建一个迁移文件（文件名按日期递增），
 *   例如 20261201_002_add_xxx.js，写 up（怎么改）和 down（怎么撤回）。
 *
 * 约定：
 *  - 所有时间字段都存「毫秒时间戳」（BIGINT），和前端 Date.now() 一致，避免时区问题；
 *  - 金额用 DECIMAL(12,2)，单位：元；
 *  - 数组类字段（分类、标签、截图等）存 JSON 字符串（TEXT），读写时在 services/serialize.js 里转换。
 */

exports.up = async function (knex) {
  // ---------------- 用户（老板和全部员工都在这张表，靠 role 区分） ----------------
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary()
    t.string('role', 16).notNullable().index() // user 老板 / escort 护航 / cs 客服 / admin 管理员 / owner 负责人
    t.string('name', 64).notNullable()
    t.string('account', 32).unique() // 员工登录账号（老板为空）
    t.string('password_hash', 100) // 员工密码（bcrypt 加密后的值，不存明文）
    t.string('phone', 20).unique() // 老板手机号（员工可为空）
    t.string('openid', 64).unique() // 微信 openid（微信登录的老板）
    t.string('status', 16).notNullable().defaultTo('active') // active 正常 / disabled 停用或拉黑
    t.string('ban_reason', 200)
    t.decimal('balance', 12, 2).notNullable().defaultTo(0) // 老板余额
    t.boolean('online').notNullable().defaultTo(false) // 护航是否接单中
    t.string('profile_rank', 64) // 护航段位
    t.string('profile_maps', 128) // 护航擅长地图
    t.text('profile_intro') // 护航简介
    t.integer('token_version').notNullable().defaultTo(0) // 改密码 / 停用时 +1，让旧登录失效
    t.bigInteger('created_at').notNullable()
    t.bigInteger('last_active_at')
  })

  // ---------------- 单子（商品） ----------------
  await knex.schema.createTable('products', (t) => {
    t.increments('id').primary()
    t.string('name', 64).notNullable()
    t.decimal('price', 12, 2).notNullable() // 单次价格
    t.string('description', 255).notNullable().defaultTo('')
    t.text('cats') // 分类，JSON 数组
    t.text('tags') // 标签，JSON 数组
    t.text('points') // 服务说明，JSON 数组
    t.boolean('on_sale').notNullable().defaultTo(true)
    t.integer('sort').notNullable().defaultTo(0)
    t.bigInteger('created_at').notNullable()
  })

  // ---------------- 首页轮播图 ----------------
  await knex.schema.createTable('banners', (t) => {
    t.increments('id').primary()
    t.string('title', 64).notNullable()
    t.text('url').notNullable() // 图片地址
    t.integer('sort').notNullable().defaultTo(0)
    t.bigInteger('created_at').notNullable()
  })

  // ---------------- 订单 ----------------
  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary()
    t.integer('user_id').unsigned().notNullable().index() // 下单老板
    t.integer('product_id').unsigned().notNullable()
    t.string('product_name', 64).notNullable() // 下单时的名字快照（单子改名不影响历史订单）
    t.string('spec', 32).notNullable() // 规格：单次 / 三次套餐 / 五次套餐
    t.decimal('original', 12, 2).notNullable() // 原价
    t.decimal('discount', 12, 2).notNullable().defaultTo(0) // 优惠券减免
    t.string('coupon_name', 64).notNullable().defaultTo('')
    t.integer('coupon_id').unsigned() // 使用的 user_coupons.id
    t.decimal('amount', 12, 2).notNullable() // 实付金额
    t.string('mode', 16).notNullable() // dispatch 客服派单 / assign 指定护航
    t.integer('escort_id').unsigned().index() // 护航
    t.string('status', 16).notNullable().index() // 见 services/orderService.js 顶部的状态说明
    t.string('prev_status', 16) // 申请退款前的状态（拒绝退款时恢复）
    t.string('game_id', 64).notNullable()
    t.string('note', 200).notNullable().defaultTo('')
    t.string('pay_method', 16) // wechat 微信支付 / balance 余额支付
    t.string('trade_no', 64) // 微信支付订单号
    t.text('proofs') // 护航提交的战绩截图地址，JSON 数组
    t.string('proof_note', 500)
    t.string('refund_reason', 200)
    t.integer('refunded_by').unsigned()
    t.decimal('escort_share', 12, 2) // 护航分成（确认完成时写入）
    t.tinyint('rating_score') // 老板评分 1-5
    t.string('rating_text', 500)
    t.bigInteger('rated_at')
    t.bigInteger('created_at').notNullable().index()
    t.bigInteger('paid_at').index()
    t.bigInteger('dispatched_at')
    t.bigInteger('submitted_at')
    t.bigInteger('completed_at')
    t.bigInteger('refunded_at')
  })

  // 订单进度时间线
  await knex.schema.createTable('order_logs', (t) => {
    t.increments('id').primary()
    t.integer('order_id').unsigned().notNullable().index()
    t.string('text', 255).notNullable()
    t.bigInteger('created_at').notNullable()
  })

  // 订单沟通（聊天）
  await knex.schema.createTable('messages', (t) => {
    t.increments('id').primary()
    t.integer('order_id').unsigned().notNullable().index()
    t.integer('from_id').unsigned().notNullable()
    t.string('role', 16).notNullable()
    t.string('name', 64).notNullable()
    t.string('text', 1000).notNullable()
    t.bigInteger('created_at').notNullable()
  })

  // ---------------- 储值充值 ----------------
  await knex.schema.createTable('recharges', (t) => {
    t.increments('id').primary()
    t.integer('user_id').unsigned().notNullable().index()
    t.decimal('pay', 12, 2).notNullable() // 实付
    t.decimal('bonus', 12, 2).notNullable().defaultTo(0) // 赠送
    t.string('status', 16).notNullable().defaultTo('待支付') // 待支付 / 已支付
    t.string('trade_no', 64)
    t.bigInteger('created_at').notNullable().index()
    t.bigInteger('paid_at').index()
  })

  // ---------------- 护航提现 ----------------
  await knex.schema.createTable('withdrawals', (t) => {
    t.increments('id').primary()
    t.integer('escort_id').unsigned().notNullable().index()
    t.decimal('amount', 12, 2).notNullable()
    t.string('status', 16).notNullable().defaultTo('待审核') // 待审核 / 已打款 / 已驳回
    t.string('note', 200)
    t.string('handler', 64)
    t.bigInteger('created_at').notNullable()
    t.bigInteger('handled_at')
  })

  // ---------------- 售后工单 ----------------
  await knex.schema.createTable('tickets', (t) => {
    t.increments('id').primary()
    t.integer('user_id').unsigned().notNullable().index()
    t.integer('order_id').unsigned()
    t.string('type', 16).notNullable()
    t.string('content', 1000).notNullable()
    t.string('status', 16).notNullable().defaultTo('待处理') // 待处理 / 处理中 / 已解决
    t.bigInteger('created_at').notNullable()
  })
  await knex.schema.createTable('ticket_replies', (t) => {
    t.increments('id').primary()
    t.integer('ticket_id').unsigned().notNullable().index()
    t.integer('by_id').unsigned().notNullable()
    t.string('name', 64).notNullable()
    t.string('role', 16).notNullable()
    t.string('text', 1000).notNullable()
    t.bigInteger('created_at').notNullable()
  })

  // ---------------- 成为护航报名 ----------------
  await knex.schema.createTable('applications', (t) => {
    t.increments('id').primary()
    t.integer('user_id').unsigned().notNullable().index()
    t.string('name', 64).notNullable()
    t.string('phone', 20).notNullable()
    t.string('rank', 64).notNullable()
    t.string('maps', 128).notNullable().defaultTo('')
    t.string('intro', 500).notNullable().defaultTo('')
    t.string('status', 16).notNullable().defaultTo('待审核') // 待审核 / 已通过 / 已拒绝
    t.string('note', 200)
    t.string('handler', 64)
    t.string('account', 32) // 通过后开通的护航账号
    t.bigInteger('created_at').notNullable()
    t.bigInteger('handled_at')
  })

  // ---------------- 优惠券 ----------------
  await knex.schema.createTable('coupons', (t) => {
    t.increments('id').primary()
    t.string('name', 64).notNullable()
    t.decimal('amount', 12, 2).notNullable() // 减免金额
    t.decimal('min_spend', 12, 2).notNullable().defaultTo(0) // 满多少可用
    t.integer('days').notNullable() // 领取后有效天数
    t.boolean('active').notNullable().defaultTo(true) // 是否还在发放
    t.bigInteger('created_at').notNullable()
  })
  await knex.schema.createTable('user_coupons', (t) => {
    t.increments('id').primary()
    t.integer('user_id').unsigned().notNullable().index()
    t.integer('coupon_id').unsigned().notNullable()
    t.string('name', 64).notNullable()
    t.decimal('amount', 12, 2).notNullable()
    t.decimal('min_spend', 12, 2).notNullable().defaultTo(0)
    t.bigInteger('expire_at').notNullable()
    t.integer('used_order_id').unsigned()
    t.bigInteger('created_at').notNullable()
    t.unique(['user_id', 'coupon_id']) // 每种券每人只能领一张
  })

  // ---------------- 系统设置（键值对，值为 JSON） ----------------
  await knex.schema.createTable('settings', (t) => {
    t.string('k', 64).primary()
    t.text('v', 'mediumtext').notNullable()
  })

  // ---------------- 员工操作日志 ----------------
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary()
    t.integer('actor_id').unsigned().notNullable()
    t.string('actor_name', 64).notNullable()
    t.string('role', 16).notNullable()
    t.string('action', 64).notNullable()
    t.string('target', 255).notNullable().defaultTo('')
    t.bigInteger('created_at').notNullable().index()
  })

  // ---------------- 短信验证码 ----------------
  await knex.schema.createTable('sms_codes', (t) => {
    t.increments('id').primary()
    t.string('phone', 20).notNullable().index()
    t.string('code', 8).notNullable()
    t.integer('attempts').notNullable().defaultTo(0) // 输错次数，超过 5 次作废
    t.boolean('used').notNullable().defaultTo(false)
    t.bigInteger('created_at').notNullable()
    t.string('ip', 64)
  })
}

exports.down = async function (knex) {
  const tables = ['sms_codes', 'audit_logs', 'settings', 'user_coupons', 'coupons', 'applications', 'ticket_replies', 'tickets',
    'withdrawals', 'recharges', 'messages', 'order_logs', 'orders', 'banners', 'products', 'users']
  for (const t of tables) await knex.schema.dropTableIfExists(t)
}
