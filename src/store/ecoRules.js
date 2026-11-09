/**
 * 生态流量预警规则（demo）
 * 默认 11 个保障断面各一条规则，可在「预警规则」页编辑，存 localStorage。
 */
import { ref } from 'vue'
import { ECO_SECTIONS } from '@/data/ecoFlow'

const KEY = 'shsw-eco-warn-rules-v1'

export const DEFAULT_RULES = ECO_SECTIONS.map((s) => ({
  id: `rule-${s.name}`,
  section: s.name,
  river: s.river,
  target: s.z,
  yellow: 0.01,
  orange: 0.035,
  red: 0.06,
  days: 1,
  enabled: true
}))

function clone(list) {
  return list.map((r) => ({ ...r }))
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) {
        // 补齐新增断面 / 缺失字段
        return arr.map((r) => {
          const def = DEFAULT_RULES.find((d) => d.section === r.section)
          return { ...(def || {}), ...r }
        })
      }
    }
  } catch (e) {
    /* 忽略损坏的本地数据 */
  }
  return clone(DEFAULT_RULES)
}

export const rules = ref(load())

export function persist() {
  localStorage.setItem(KEY, JSON.stringify(rules.value))
}

export function ruleOf(section) {
  return rules.value.find((r) => r.section === section) || null
}

export function addRule(section, patch) {
  const s = ECO_SECTIONS.find((x) => x.name === section)
  if (!s) return null
  const rule = {
    id: `rule-${s.name}-${Date.now()}`,
    section: s.name,
    river: s.river,
    target: s.z,
    yellow: 0.01,
    orange: 0.035,
    red: 0.06,
    days: 1,
    enabled: true,
    ...patch
  }
  rules.value = [...rules.value, rule]
  persist()
  return rule
}

export function updateRule(id, patch) {
  const r = rules.value.find((x) => x.id === id)
  if (!r) return
  Object.assign(r, patch)
  persist()
}

export function removeRule(id) {
  rules.value = rules.value.filter((x) => x.id !== id)
  persist()
}

export function resetRules() {
  rules.value = clone(DEFAULT_RULES)
  persist()
}
