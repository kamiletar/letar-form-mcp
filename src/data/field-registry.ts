import type { DocSection } from './loader.js'

/** Категории полей */
export type FieldCategory = 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'special'

/** Описание поля в реестре */
export interface FieldInfo {
  /** Имя компонента, например "String" */
  name: string
  /** Полное имя, например "Form.Field.String" */
  fullName: string
  /** Описание */
  description: string
  /** Категория */
  category: FieldCategory
  /** Детальная документация (из секции H2 ниже таблицы) */
  details?: string
}

/** Маппинг заголовков секций → категории */
const CATEGORY_MAP: Record<string, FieldCategory> = {
  'Текстовые поля': 'text',
  'Числовые поля': 'number',
  'Дата и время': 'date',
  'Выбор из списка': 'select',
  'Множественный выбор': 'multi-select',
  Специализированные: 'special',
}

/** Парсит строку таблицы markdown: | `Component` | Description | */
function parseTableRow(line: string): { component: string; description: string } | null {
  const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|/)
  if (!match) {
    return null
  }
  return { component: match[1], description: match[2] }
}

/** Извлекает короткое имя из полного: "Form.Field.String" → "String" */
function shortName(fullName: string): string {
  const parts = fullName.split('.')
  return parts.at(-1) ?? fullName
}

/** Строит реестр полей из секций fields.md */
export function buildFieldRegistry(fieldSections: DocSection[]): Map<string, FieldInfo> {
  const registry = new Map<string, FieldInfo>()
  /** Секции с детальной документацией (H2 с именем компонента) */
  const detailSections = new Map<string, string>()

  // Первый проход: собираем детальные секции (например "Form.Field.RichText — WYSIWYG редактор")
  for (const section of fieldSections) {
    if (section.level === 2 && section.heading.includes('Form.Field.')) {
      const fieldMatch = section.heading.match(/Form\.Field\.(\w+)/)
      if (fieldMatch) {
        detailSections.set(fieldMatch[1], section.content)
      }
    }
  }

  // Второй проход: парсим таблицы из категорий
  for (const section of fieldSections) {
    const category = CATEGORY_MAP[section.heading]
    if (!category) {
      continue
    }

    const lines = section.content.split('\n')
    for (const line of lines) {
      const row = parseTableRow(line)
      if (!row) {
        continue
      }

      const name = shortName(row.component)
      const info: FieldInfo = {
        name,
        fullName: row.component,
        description: row.description,
        category,
        details: detailSections.get(name),
      }
      registry.set(name.toLowerCase(), info)
    }
  }

  return registry
}

/** Возвращает все поля, опционально фильтруя по категории */
export function getFields(registry: Map<string, FieldInfo>, category?: FieldCategory): FieldInfo[] {
  const all = Array.from(registry.values())
  if (!category) {
    return all
  }
  return all.filter((f) => f.category === category)
}
