import type { DocSection } from './loader.js'

/** Описание @form.* директивы */
export interface DirectiveInfo {
  /** Имя директивы, например "@form.title" */
  name: string
  /** Описание */
  description: string
  /** Пример синтаксиса */
  example: string
  /** Что генерируется */
  output: string
}

/** Известные директивы с описаниями (дополняются из docs) */
const KNOWN_DIRECTIVES: DirectiveInfo[] = [
  {
    name: '@form.title',
    description: 'Заголовок поля в форме',
    example: '/// @form.title("Название рецепта")',
    output: '.meta({ ui: { title: "Название рецепта" } })',
  },
  {
    name: '@form.placeholder',
    description: 'Placeholder для поля ввода',
    example: '/// @form.placeholder("Введите название")',
    output: '.meta({ ui: { placeholder: "Введите название" } })',
  },
  {
    name: '@form.description',
    description: 'Подсказка под полем',
    example: '/// @form.description("Краткое описание блюда")',
    output: '.meta({ ui: { description: "Краткое описание блюда" } })',
  },
  {
    name: '@form.fieldType',
    description: 'Явное указание типа поля формы',
    example: '/// @form.fieldType("tags")',
    output: '.meta({ ui: { fieldType: "tags" } })',
  },
  {
    name: '@form.props',
    description:
      'Свойства поля. Автоматически разделяются на Zod constraints (min, max, step) и UI props (layout, count)',
    example: '/// @form.props({ min: 1, max: 100, step: 0.5 })',
    output: 'z.number().min(1).max(100).step(0.5)',
  },
  {
    name: '@form.relation',
    description: 'Конфигурация для relation-полей (FK → Select/Combobox)',
    example: '/// @form.relation({ labelField: "name", searchable: true })',
    output: '.meta({ ui: { fieldType: "combobox", relation: { labelField: "name", searchable: true } } })',
  },
  {
    name: '@form.exclude',
    description: 'Исключить поле из генерируемых форм-схем',
    example: '/// @form.exclude',
    output: 'Поле не попадёт в CreateFormSchema / UpdateFormSchema',
  },
]

/** Строит реестр директив, дополняя из документации */
export function buildDirectiveRegistry(zenstackSections: DocSection[]): Map<string, DirectiveInfo> {
  const registry = new Map<string, DirectiveInfo>()

  // Загружаем известные директивы
  for (const directive of KNOWN_DIRECTIVES) {
    registry.set(directive.name, directive)
  }

  // Дополняем деталями из zenstack.md секций
  for (const section of zenstackSections) {
    if (section.heading.includes('@form.')) {
      const nameMatch = section.heading.match(/@form\.\w+/)
      if (nameMatch) {
        const existing = registry.get(nameMatch[0])
        if (existing) {
          // Дополняем детальным описанием из docs
          existing.description = section.content.split('\n')[0] || existing.description
        }
      }
    }
  }

  return registry
}

/** Возвращает все директивы или конкретную */
export function getDirectives(registry: Map<string, DirectiveInfo>, name?: string): DirectiveInfo[] {
  if (name) {
    const normalized = name.startsWith('@form.') ? name : `@form.${name}`
    const directive = registry.get(normalized)
    return directive ? [directive] : []
  }
  return Array.from(registry.values())
}
