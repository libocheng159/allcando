<template>
    <div class="goals-container">
        <div class="toolbar">
            <div class="btn-group">
                <button @click="addNote('short')" class="add-btn short">
                    <span class="icon">⚡</span> 新增短期
                </button>
                <button @click="addNote('long')" class="add-btn long">
                    <span class="icon">🚩</span> 新增长期
                </button>
            </div>
            <span class="tip" v-if="isLocal">读取自: 本地缓存</span>
            <span class="tip" v-else>读取自: 配置文件</span>
        </div>

        <div class="notes-wrapper">
            <div v-for="(note, index) in notes" :key="note.id" class="paper-note"
                :class="{ 'is-long': note.type === '长期目标' }">
                <span class="close-btn" @click="deleteNote(index)">×</span>

                <div class="note-header">
                    <span class="note-type" :class="note.type === '长期目标' ? 'tag-long' : 'tag-short'">
                        {{ note.type }}
                    </span>
                    <span class="note-id">{{ note.id.slice(-4).toUpperCase() }}</span>
                    <span class="note-date">{{ formatDate(note.date) }}</span>
                </div>

                <div class="dashed-line"></div>

                <h3 contenteditable="true" @blur="updateNote($event, index, 'title')" class="note-title">
                    {{ note.title }}
                </h3>

                <p contenteditable="true" @blur="updateNote($event, index, 'content')" class="note-content">
                    {{ note.content }}
                </p>

                <div class="dashed-line bottom"></div>
                <div class="note-footer">
                    {{ note.type === '长期目标' ? 'KEEP GOING' : 'JUST DO IT' }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import config from '../config.js'

const notes = ref([])
const isLocal = ref(false) // 标记当前数据来源

onMounted(() => {
    const localData = localStorage.getItem('leleo-goals-data')

    if (localData) {
        // 1. 如果有本地缓存，直接读取
        notes.value = JSON.parse(localData)
        isLocal.value = true
    } else {
        // 2. 如果没有缓存，从 config 拆分的结构中读取并合并
        // 给数据手动加上 type 字段，方便前端显示
        const shortGoals = (config.goals.shortTerm || []).map(item => ({ ...item, type: '短期目标' }))
        const longGoals = (config.goals.longTerm || []).map(item => ({ ...item, type: '长期目标' }))

        // 合并在一起显示
        notes.value = [...shortGoals, ...longGoals]
        isLocal.value = false
    }
})

// 监听变动存入本地
watch(notes, (newVal) => {
    localStorage.setItem('leleo-goals-data', JSON.stringify(newVal))
    isLocal.value = true
}, { deep: true })

// 新增功能：支持传入类型
const addNote = (typeKey) => {
    const now = new Date()
    const isLong = typeKey === 'long'

    notes.value.unshift({
        id: Date.now().toString(36),
        date: now,
        type: isLong ? '长期目标' : '短期目标',
        title: isLong ? '新的宏大愿景' : '新的短期任务',
        content: '在这里输入具体内容...'
    })
}

const deleteNote = (index) => {
    // 简单确认，防止误删
    notes.value.splice(index, 1)
}

const updateNote = (e, index, field) => {
    notes.value[index][field] = e.target.innerText
}

const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.goals-container {
    width: 100%;
    padding: 10px;
    box-sizing: border-box;
}

.toolbar {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.btn-group {
    display: flex;
    gap: 10px;
}

.add-btn {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: #fff;
    padding: 6px 12px;
    cursor: pointer;
    border-radius: 6px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: 0.3s;
}

.add-btn:hover {
    background: white;
    color: #333;
}

.add-btn.short:hover {
    color: #007bff;
}

.add-btn.long:hover {
    color: #d9534f;
}

.tip {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
}

/* 纸片基础样式 */
.paper-note {
    background: #fcfcfc;
    color: #333;
    padding: 15px 20px;
    margin-bottom: 15px;
    border-radius: 2px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    position: relative;
    transition: transform 0.2s;
    border-left: 4px solid #aaa;
    /* 默认灰色条 */
}

/* 长期目标的特殊样式 */
.paper-note.is-long {
    background: #fffbf0;
    /* 稍微暖一点的色调 */
    border-left: 4px solid #d9534f;
    /* 红色条表示长期/重要 */
}

/* 短期目标的特殊样式 */
.paper-note:not(.is-long) {
    border-left: 4px solid #007bff;
    /* 蓝色条表示短期 */
}

.paper-note:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.close-btn {
    position: absolute;
    top: 5px;
    right: 10px;
    cursor: pointer;
    color: #ddd;
    font-size: 18px;
}

.close-btn:hover {
    color: #ff4d4f;
}

.note-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #999;
    margin-bottom: 8px;
}

.tag-short {
    color: #007bff;
    font-weight: bold;
}

.tag-long {
    color: #d9534f;
    font-weight: bold;
}

.dashed-line {
    border-bottom: 1px dashed #e0e0e0;
    margin: 8px 0;
}

.note-title {
    font-size: 15px;
    margin: 5px 0;
    font-weight: 700;
    outline: none;
    min-height: 1.2em;
}

.note-content {
    font-size: 13px;
    color: #555;
    line-height: 1.5;
    outline: none;
    min-height: 20px;
}

.note-footer {
    text-align: right;
    font-size: 9px;
    color: #ccc;
    letter-spacing: 1px;
    margin-top: 5px;
}
</style>