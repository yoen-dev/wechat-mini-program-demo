<template>
  <view class="wrap">
    <view class="card form">
      <text class="label">名称</text>
      <input class="input" v-model="f.name" placeholder="如：绝密保底单" />
      <text class="label">单次价格（元）</text>
      <input class="input" v-model="f.price" type="digit" placeholder="如：88" />
      <text class="muted hint">三次、五次套餐按单次价格自动折算</text>
      <text class="label">一句话简介</text>
      <input class="input" v-model="f.desc" placeholder="显示在列表里" />
      <text class="label">分类（可多选）</text>
      <view class="cats">
        <view v-for="c in CATEGORIES" :key="c" class="fchip" :class="{ on: f.cats.includes(c) }" @tap="toggleCat(c)">{{ c }}</view>
      </view>
      <text class="label">标签（用空格分隔）</text>
      <input class="input" v-model="f.tagsText" placeholder="如：不卡保底 全程语音" />
      <text class="label">服务说明（每行一条）</text>
      <textarea class="input area" v-model="f.pointsText" placeholder="显示在详情页" auto-height />
    </view>
    <button class="btn save" :loading="busy" @tap="submit">保存</button>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getProduct, saveProduct, CATEGORIES } from '@api/products.js'
import { session, guard } from '@/store/session.js'
import { run, toast } from '@/utils.js'

const f = reactive({ id: null, name: '', price: '', desc: '', cats: [], tagsText: '', pointsText: '' })
const busy = ref(false)

onLoad(async (q) => {
  if (!guard(['admin'])) return
  if (!q.id) return uni.setNavigationBarTitle({ title: '新建单子' })
  const p = await run(getProduct(q.id))
  if (p) Object.assign(f, { id: p.id, name: p.name, price: String(p.price), desc: p.desc, cats: [...p.cats], tagsText: p.tags.join(' '), pointsText: p.points.join('\n') })
})

function toggleCat(c) {
  const i = f.cats.indexOf(c)
  if (i >= 0) f.cats.splice(i, 1)
  else f.cats.push(c)
}

async function submit() {
  busy.value = true
  const ok = await run(saveProduct(session.user, {
    id: f.id, name: f.name, price: f.price, desc: f.desc, cats: f.cats,
    tags: f.tagsText.split(/\s+/).filter(Boolean), points: f.pointsText.split('\n').map((s) => s.trim()).filter(Boolean)
  }))
  busy.value = false
  if (!ok) return
  toast('已保存', 'success')
  setTimeout(() => uni.navigateBack(), 500)
}
</script>

<style scoped>
.form { padding: 8rpx 28rpx 32rpx; }
.hint { display: block; font-size: 22rpx; margin-top: 8rpx; }
.cats { display: flex; flex-wrap: wrap; gap: 12rpx; }
.fchip { font-size: 24rpx; padding: 12rpx 24rpx; border-radius: 30rpx; background: #F5F5F5; color: #595959; }
.fchip.on { background: #1F1F1F; color: #FFFFFF; }
.area { height: auto; min-height: 180rpx; padding: 20rpx 24rpx; width: auto; }
.save { margin-top: 32rpx; }
</style>
