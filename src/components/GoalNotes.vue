<template>
  <div class="goals-wrapper">
    
    <div class="section-container short-term-section">
      <div class="notebook-card blue-theme">
        <div class="card-header">
          <div class="header-left">
            <v-icon icon="mdi-calendar-clock" size="small" class="mr-1"></v-icon>
            <span class="today-date">{{ todayDate }}</span>
          </div>
          <div class="header-right">
            <span class="limit-tip">{{ shortGoals.length }}/5</span>
            <v-btn 
              icon="mdi-plus" 
              size="x-small" 
              variant="flat" 
              class="add-btn-circle"
              :disabled="shortGoals.length >= 5"
              @click="openDialog('short')"
            ></v-btn>
          </div>
        </div>

        <div class="todo-list">
          <div v-if="shortGoals.length === 0" class="empty-state">
            暂无今日目标，点击右上角添加
          </div>
          
          <div v-for="(item, index) in shortGoals" :key="item.id || index" class="todo-item">
            <div class="item-content">
              <span class="item-text">{{ item.title }}</span>
              <span class="item-time" :class="{'text-red': isUrgent(item.deadline)}">
                <v-icon icon="mdi-clock-outline" size="10"></v-icon> 
                {{ formatDeadline(item.deadline) }}
              </span>
            </div>
            <div class="item-actions">
              <v-btn icon="mdi-pencil" size="20" variant="text" color="blue" @click="editGoal(item)"></v-btn>
              <v-btn icon="mdi-close" size="20" variant="text" color="grey" @click="deleteGoal(item.id)"></v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-container long-term-section mt-4">
      <div class="section-title">
        <span><v-icon icon="mdi-flag-variant" color="#d9534f" size="small"></v-icon> 长期愿景</span>
        <v-btn icon="mdi-plus" size="x-small" variant="text" color="#d9534f" @click="openDialog('long')"></v-btn>
      </div>

      <div class="long-cards-grid">
        <div v-if="longGoals.length === 0" class="empty-state-text">
          既然选择了远方，便只顾风雨兼程...
        </div>

        <div v-for="item in longGoals" :key="item.id || index" class="notebook-card red-theme is-card">
          <div class="card-actions">
            <v-btn icon="mdi-pencil" size="20" variant="text" color="#d9534f" @click="editGoal(item)"></v-btn>
            <v-btn icon="mdi-close" size="20" variant="text" color="grey" @click="deleteGoal(item.id)"></v-btn>
          </div>
          <h3 class="long-title">{{ item.title }}</h3>
          <p class="long-desc">{{ item.content }}</p>
          <div class="long-footer">
            <span>始于: {{ formatDateSimple(item.createDate) }}</span>
            <span>终于: {{ formatDateSimple(item.deadline) }}</span>
          </div>
        </div>
      </div>
    </div>

    <v-dialog v-model="dialog" width="400">
      <v-card class="pa-4 rounded-lg" style="background-color: rgba(255, 255, 255, 0.95) !important; color: #333;">
        <h3 class="text-h6 mb-4">{{ isEditing ? '编辑目标' : '新增目标' }}</h3>
        
        <v-text-field 
          v-model="form.title" 
          :label="form.type === 'short' ? '要做什么？' : '愿景标题'" 
          variant="outlined" 
          density="compact"
        ></v-text-field>

        <v-textarea 
          v-if="form.type === 'long'"
          v-model="form.content" 
          label="具体描述" 
          variant="outlined" 
          rows="2"
          density="compact"
        ></v-textarea>

        <v-text-field 
          v-model="form.deadline" 
          type="datetime-local" 
          label="截止时间 (到期自动删除)" 
          variant="outlined" 
          density="compact"
        ></v-text-field>

        <div class="d-flex justify-end mt-2">
          <v-btn variant="text" @click="dialog = false" class="mr-2">取消</v-btn>
          <v-btn color="primary" elevation="0" @click="saveGoal">保存</v-btn>
        </div>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import config from '../config.js'

// =========================================================
// 关键修复：定义 props 并赋值给变量 props
// =========================================================
const props = defineProps({
  cloudGoals: {
    type: Object,
    default: () => null
  }
})

// --- 数据状态 ---
const allGoals = ref([]) // 存储所有目标
const dialog = ref(false)
const isEditing = ref(false)

// 表单数据模型
const form = ref({
  id: null,
  type: 'short', // 'short' | 'long'
  title: '',
  content: '',
  createDate: null,
  deadline: ''
})

// --- 计算属性 ---

// 今日日期字符串
const todayDate = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
})

// 过滤短期目标
const shortGoals = computed(() => {
  return allGoals.value.filter(g => g.type === 'short')
})

// 过滤长期目标
const longGoals = computed(() => {
  return allGoals.value.filter(g => g.type === 'long')
})

// --- 核心逻辑 ---

// 1. 初始化与过期检测
onMounted(() => {
  loadData()
  checkExpired() // 初始检测一次
  // 每分钟检测一次过期
  setInterval(checkExpired, 60000) 
})

// 2. 数据加载逻辑 (云端优先 > 本地缓存 > 默认配置)
const loadData = () => {
  const localData = localStorage.getItem('leleo-goals-v2')

  // ★ 第一优先级：如果父组件传来了云端数据，直接使用
  if (props.cloudGoals && (props.cloudGoals.shortTerm?.length || props.cloudGoals.longTerm?.length)) {
     console.log('🚀 初始加载：检测到云端数据，正在应用...');
     initGoals(props.cloudGoals)
     return
  }

  // ★ 第二优先级：如果云端没数据(可能还没加载完)，先显示本地缓存
  if (localData) {
    allGoals.value = JSON.parse(localData)
  } else {
    // ★ 第三优先级：连本地缓存都没有，使用本地 config.js 兜底
    initGoals(config.goals) 
  }
}

// 3. 监听云端数据变化 (强制同步)
watch(() => props.cloudGoals, (newGoals) => {
  // 只要云端数据更新了(app.js 下载完成)，就强制覆盖当前显示
  console.log("【GoalNotes】收到新数据了吗？", newGoals);
  if (newGoals) {
    console.log('🔄 云端数据更新，强制覆盖本地...');
    initGoals(newGoals);
  }
}, { deep: true })

// 4. 监听本地变化并缓存 (用于用户临时编辑，但在刷新后会被云端覆盖)
watch(allGoals, (newVal) => {
    localStorage.setItem('leleo-goals-v2', JSON.stringify(newVal))
}, { deep: true })

// --- 初始化工具函数 (统一格式化数据) ---
const initGoals = (sourceGoals) => {
    if (!sourceGoals) return;
    
    // 处理短期目标
    const s = (sourceGoals.shortTerm || []).map(i => ({
        ...i, 
        type: 'short', 
        id: i.id || Date.now() + Math.random(), 
        createDate: i.createDate || new Date(), 
        deadline: i.deadline || getDefaultDeadline('short')
    }))
    
    // 处理长期目标
    const l = (sourceGoals.longTerm || []).map(i => ({
        ...i, 
        type: 'long', 
        id: i.id || Date.now() + Math.random(), 
        createDate: i.createDate || new Date(), 
        deadline: i.deadline || getDefaultDeadline('long')
    }))
    
    // 合并
    allGoals.value = [...s, ...l]
}

// 5. 自动删除过期目标
const checkExpired = () => {
  const now = new Date().getTime()
  const initialCount = allGoals.value.length
  
  // 过滤掉截止时间已过的目标
  allGoals.value = allGoals.value.filter(item => {
    if (!item.deadline) return true
    const ddl = new Date(item.deadline).getTime()
    return ddl > now // 只有未过期的保留
  })

  if (allGoals.value.length < initialCount) {
    console.log('已自动清理过期目标')
  }
}

// --- 交互方法 ---

const openDialog = (type) => {
  isEditing.value = false
  form.value = {
    id: Date.now().toString(36),
    type: type,
    title: '',
    content: '',
    createDate: new Date(),
    deadline: getDefaultDeadline(type) // 默认给一个时间
  }
  dialog.value = true
}

const editGoal = (item) => {
  isEditing.value = true
  form.value = { ...item } // 浅拷贝
  dialog.value = true
}

const deleteGoal = (id) => {
  allGoals.value = allGoals.value.filter(g => g.id !== id)
}

const saveGoal = () => {
  if (!form.value.title) return alert('标题不能为空')

  if (isEditing.value) {
    // 编辑模式：找到索引替换
    const index = allGoals.value.findIndex(g => g.id === form.value.id)
    if (index !== -1) {
      allGoals.value[index] = { ...form.value }
    }
  } else {
    // 新增模式
    allGoals.value.push({ ...form.value })
  }
  dialog.value = false
}

// --- 工具函数 ---

// 获取默认截止时间（短期默认今晚23:59，长期默认一年后）
const getDefaultDeadline = (type) => {
  const d = new Date()
  if (type === 'short') {
    d.setHours(23, 59, 59, 0)
    // 转换为 datetime-local 格式 (YYYY-MM-DDTHH:mm)
    return formatToInput(d)
  } else {
    d.setFullYear(d.getFullYear() + 1)
    return formatToInput(d)
  }
}

// 格式化 Date 对象为 input[type="datetime-local"] 所需字符串
const formatToInput = (date) => {
    const d = new Date(date)
    const pad = (n) => n < 10 ? '0' + n : n
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 格式化显示倒计时/截止时间
const formatDeadline = (dateStr) => {
  if (!dateStr) return '无期限'
  const target = new Date(dateStr)
  const now = new Date()
  const diff = target - now
  
  if (diff < 0) return '已过期'
  
  // 小于24小时显示小时数
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 24) return `剩 ${hours} 小时`
  
  const days = Math.floor(hours / 24)
  return `剩 ${days} 天`
}

const formatDateSimple = (dateStr) => {
  if(!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth()+1}/${d.getDate()}`
}

// 判断是否紧急（小于3小时变红）
const isUrgent = (dateStr) => {
  if (!dateStr) return false
  const diff = new Date(dateStr) - new Date()
  return diff > 0 && diff < 3 * 60 * 60 * 1000 
}

</script>

<style scoped>
.goals-wrapper {
  width: 100%;
  box-sizing: border-box;
}

/* === 通用卡片样式 === */
.notebook-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s;
}

/* 蓝色主题 (短期) */
.blue-theme {
  border-top: 4px solid #007bff;
  min-height: 180px; /* 短期卡片高度 */
}

/* 红色主题 (长期) */
.red-theme {
  border-left: 4px solid #d9534f;
  background-color: #fffbfb;
}

/* === 短期目标区域 === */
.card-header {
  padding: 10px 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.today-date {
  font-weight: bold;
  font-size: 0.9rem;
  color: #333;
}

.limit-tip {
  font-size: 10px;
  color: #999;
  margin-right: 8px;
}

.add-btn-circle {
  background-color: #007bff !important;
  color: white !important;
}

.todo-list {
  padding: 5px 0;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 15px;
  border-bottom: 1px dashed #eee;
}

.todo-item:last-child {
  border-bottom: none;
}

.item-content {
  display: flex;
  flex-direction: column;
  width: 75%;
}

.item-text {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
}

.item-time {
  font-size: 10px;
  color: #888;
  margin-top: 2px;
}
.text-red { color: #d9534f; font-weight: bold; }

.empty-state {
  text-align: center;
  color: #aaa;
  font-size: 12px;
  padding: 20px;
}

/* === 长期目标区域 === */
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: bold;
  color: #666;
  margin-bottom: 8px;
  padding: 0 5px;
}

.long-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.is-card {
  padding: 15px;
}

.is-card:hover {
  transform: translateX(3px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
}

.card-actions {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0;
  transition: opacity 0.2s;
}

.is-card:hover .card-actions {
  opacity: 1;
}

.long-title {
  font-size: 1rem;
  font-weight: bold;
  margin: 0 0 5px 0;
  color: #d9534f;
}

.long-desc {
  font-size: 0.85rem;
  color: #666;
  line-height: 1.4;
  margin-bottom: 10px;
}

.long-footer {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #999;
  border-top: 1px solid #eee;
  padding-top: 5px;
}

.empty-state-text {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  text-align: center;
  font-style: italic;
}
</style>