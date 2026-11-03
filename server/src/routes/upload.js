/**
 * 图片上传  POST /api/upload   （表单字段名 file）→ { url }
 *
 * 用在哪：本地开发、网页版联调。图片存在服务器的 uploads 目录。
 * 正式环境（微信云托管）不用这个接口：容器重启后本地文件会丢，
 *   所以小程序里直接用 wx.cloud.uploadFile 传到云托管自带的对象存储，得到 cloud:// 开头的文件 ID，
 *   再把文件 ID 交给后端保存（见前端 src/utils.js 的 uploadImage）。
 *
 * 安全：只接受 jpg / png / webp / gif，按文件头判断真实格式（不信任文件后缀），文件名随机生成。
 */
const express = require('express')
const multer = require('multer')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const config = require('../config')
const { need } = require('../middleware/auth')
const { limit } = require('../middleware/rateLimit')
const { wrap, bad } = require('../utils/errors')

const router = express.Router()

// 先放在内存里检查格式，确认是图片再写入磁盘
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.uploadMaxMb * 1024 * 1024, files: 1 } })

// 根据文件开头几个字节判断图片格式
function imageExt(buf) {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png'
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return '.webp'
  if (buf.subarray(0, 4).toString() === 'GIF8') return '.gif'
  return null
}

// 只有员工需要上传（护航传战绩截图、管理员传轮播图）
router.post('/', need('escort', 'cs', 'admin'), limit({ windowSec: 60, max: 30 }), upload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw bad('请选择图片')
  const ext = imageExt(req.file.buffer)
  if (!ext) throw bad('只支持 jpg、png、webp、gif 图片')
  const name = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`
  fs.mkdirSync(config.uploadDir, { recursive: true })
  await fs.promises.writeFile(path.join(config.uploadDir, name), req.file.buffer)
  res.json({ url: `${config.publicUrl}/uploads/${name}` })
}))

module.exports = router
