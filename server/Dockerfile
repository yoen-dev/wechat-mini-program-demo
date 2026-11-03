# ============================================================
# 微信云托管 / 任意 Docker 环境的打包配置
# 云托管「新建版本」时选择「代码库」或「手动上传」本 server 目录，会按这个文件自动构建。
# ============================================================

# 使用官方 Node 20 精简镜像（腾讯云镜像加速，国内构建更快）
FROM node:20-alpine

# 容器时区设为北京时间（每日统计、「今天」的订单数都按这个时区算）
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo Asia/Shanghai > /etc/timezone
ENV TZ=Asia/Shanghai NODE_ENV=production

WORKDIR /app

# 先只复制依赖清单并安装，代码改动时可以复用这一层缓存，构建更快
COPY package.json package-lock.json ./
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/ && npm ci --omit=dev

# 再复制源代码
COPY src ./src

# 云托管默认把流量转发到 80 端口（服务设置里的「端口」要和这里一致）
ENV PORT=80
EXPOSE 80

CMD ["node", "src/index.js"]
