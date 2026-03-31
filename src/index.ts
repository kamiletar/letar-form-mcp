import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { buildDirectiveRegistry, getDirectives } from './data/directive-registry.js'
import { buildFieldRegistry, type FieldCategory, type FieldInfo, getFields } from './data/field-registry.js'
import { loadDocs, type LoadedDocs } from './data/loader.js'
import { buildPatternRegistry, getPatterns } from './data/pattern-registry.js'

export interface FormMcpServerOptions {
  /** Путь к директории docs/ с markdown-файлами */
  docsPath: string
  /** Имя сервера */
  name?: string
  /** Версия сервера */
  version?: string
}

/** Создаёт MCP сервер для форм-экосистемы */
export function createFormMcpServer(options: FormMcpServerOptions): McpServer {
  const { docsPath, name = '@letar/form-mcp', version = '0.1.0' } = options

  // Загрузка данных при создании сервера
  const docs: LoadedDocs = loadDocs(docsPath)
  const fieldRegistry = buildFieldRegistry(docs.sections.fields)
  const directiveRegistry = buildDirectiveRegistry(docs.sections.zenstack)
  const patternRegistry = buildPatternRegistry()

  const server = new McpServer({ name, version }, { capabilities: { resources: {}, tools: {}, prompts: {} } })

  // ─── TOOLS ───────────────────────────────────────────────

  server.tool(
    'list_fields',
    'Список всех типов полей @lena/form-components. Фильтр по категории: text, number, date, select, multi-select, special.',
    { category: z.string().optional().describe('Категория: text, number, date, select, multi-select, special') },
    async ({ category }) => {
      const fields = getFields(fieldRegistry, category as FieldCategory | undefined)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              fields.map((f) => ({
                name: f.name,
                fullName: f.fullName,
                description: f.description,
                category: f.category,
              })),
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  server.tool(
    'get_field_props',
    'Получить пропсы, описание и документацию конкретного поля формы.',
    { fieldType: z.string().describe('Тип поля, например: String, Date, Select, Combobox') },
    async ({ fieldType }) => {
      const field = fieldRegistry.get(fieldType.toLowerCase())
      if (!field) {
        return {
          content: [{ type: 'text', text: `Поле "${fieldType}" не найдено. Используйте list_fields для списка.` }],
          isError: true,
        }
      }
      const result: Record<string, unknown> = {
        name: field.name,
        fullName: field.fullName,
        description: field.description,
        category: field.category,
      }
      if (field.details) {
        result.details = field.details
      }
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  server.tool(
    'get_field_example',
    'Получить код-пример использования конкретного поля формы.',
    {
      fieldType: z.string().describe('Тип поля: String, Date, Select, и т.д.'),
      variant: z.string().optional().describe('Вариант: basic, with-validation, in-form'),
    },
    async ({ fieldType }) => {
      const field = fieldRegistry.get(fieldType.toLowerCase())
      if (!field) {
        return {
          content: [{ type: 'text', text: `Поле "${fieldType}" не найдено.` }],
          isError: true,
        }
      }
      // Генерируем пример на основе типа поля
      const example = generateFieldExample(field)
      return { content: [{ type: 'text', text: example }] }
    },
  )

  server.tool(
    'get_form_pattern',
    'Получить полный пример формы для типового сценария: crud-create, crud-edit, multi-step, offline, i18n, from-schema, declarative, server-action.',
    {
      pattern: z
        .string()
        .describe(
          'Имя паттерна: crud-create, crud-edit, multi-step, offline, i18n, from-schema, declarative, server-action',
        ),
    },
    async ({ pattern }) => {
      const patterns = getPatterns(patternRegistry, pattern)
      if (patterns.length === 0) {
        const all = getPatterns(patternRegistry)
        return {
          content: [
            {
              type: 'text',
              text: `Паттерн "${pattern}" не найден. Доступные: ${all.map((p) => p.name).join(', ')}`,
            },
          ],
          isError: true,
        }
      }
      const p = patterns[0]
      return {
        content: [{ type: 'text', text: `# ${p.title}\n\n${p.description}\n\n\`\`\`tsx\n${p.example}\n\`\`\`` }],
      }
    },
  )

  server.tool(
    'get_directives',
    'Получить описание @form.* директив zenstack-form-plugin. Без аргументов — все директивы.',
    { directive: z.string().optional().describe('Имя директивы: @form.title, @form.props, и т.д.') },
    async ({ directive }) => {
      const directives = getDirectives(directiveRegistry, directive)
      return {
        content: [{ type: 'text', text: JSON.stringify(directives, null, 2) }],
      }
    },
  )

  server.tool(
    'generate_form',
    'Сгенерировать код формы по спецификации полей.',
    {
      fields: z
        .array(
          z.object({
            name: z.string().describe('Имя поля'),
            type: z.string().describe('Тип поля: String, Number, Date, Select, и т.д.'),
            label: z.string().describe('Метка поля'),
            required: z.boolean().optional().describe('Обязательное поле'),
            validation: z.string().optional().describe('Дополнительная валидация Zod'),
          }),
        )
        .describe('Массив спецификаций полей'),
      formName: z.string().optional().describe('Имя компонента формы'),
      withSchema: z.boolean().optional().describe('Генерировать Zod-схему'),
    },
    async ({ fields, formName = 'MyForm', withSchema = true }) => {
      const code = generateFormCode(fields, formName, withSchema)
      return { content: [{ type: 'text', text: code }] }
    },
  )

  // ─── RESOURCES ───────────────────────────────────────────

  // Статические ресурсы для каждого документа
  const docEntries: Array<{ key: string; name: string; description: string }> = [
    { key: 'fields', name: 'Field компоненты', description: 'Полный справочник 40+ типов полей' },
    {
      key: 'form-level',
      name: 'Form-level компоненты',
      description: 'Steps, When, Errors, DirtyGuard, DebugValues и другие',
    },
    { key: 'schema-generation', name: 'Генерация из схемы', description: 'FromSchema, AutoFields, Builder, Auto поля' },
    { key: 'offline', name: 'Offline поддержка', description: 'useOfflineForm, sync queue, индикаторы статуса' },
    { key: 'i18n', name: 'Мультиязычность', description: 'FormI18nProvider, локализация ошибок и опций' },
    { key: 'zenstack', name: 'ZenStack интеграция', description: '@form.* директивы, генерация из schema.zmodel' },
    { key: 'api-reference', name: 'API Reference', description: 'Hooks, contexts, типы, утилиты' },
  ]

  for (const entry of docEntries) {
    server.resource(
      entry.name,
      `form-docs://${entry.key}`,
      { description: entry.description, mimeType: 'text/markdown' },
      async () => ({
        contents: [
          {
            uri: `form-docs://${entry.key}`,
            mimeType: 'text/markdown',
            text: docs.raw[entry.key as keyof typeof docs.raw] || `# ${entry.name}\n\nДокументация недоступна.`,
          },
        ],
      }),
    )
  }

  // ─── PROMPTS ─────────────────────────────────────────────

  server.prompt(
    'create-form',
    'Создать CRUD форму для модели данных',
    {
      modelName: z.string().describe('Название модели (например: User, Product, Recipe)'),
      fields: z.string().describe('Список полей через запятую: name:String, email:String, age:Number'),
      withOffline: z.boolean().optional().describe('Добавить оффлайн-поддержку'),
      withI18n: z.boolean().optional().describe('Добавить i18n'),
    },
    async ({ modelName, fields, withOffline, withI18n }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildCreateFormPrompt(modelName, fields, withOffline === true, withI18n === true),
          },
        },
      ],
    }),
  )

  server.prompt(
    'add-field',
    'Добавить поле к существующей форме',
    {
      fieldType: z.string().describe('Тип поля: String, Date, Select, Combobox, и т.д.'),
      fieldName: z.string().describe('Имя поля в форме'),
      validation: z.string().optional().describe('Валидация: required, email, min:3, max:100'),
    },
    async ({ fieldType, fieldName, validation }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildAddFieldPrompt(fieldType, fieldName, validation),
          },
        },
      ],
    }),
  )

  server.prompt(
    'migrate-form',
    'Мигрировать форму с другого фреймворка на @lena/form-components',
    {
      sourceFramework: z.string().describe('Исходный фреймворк: react-hook-form, formik, conform'),
    },
    async ({ sourceFramework }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildMigratePrompt(sourceFramework),
          },
        },
      ],
    }),
  )

  return server
}

// ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ─────────────────────────────

function generateFieldExample(field: FieldInfo): string {
  const lines = [
    `// Пример использования ${field.fullName}`,
    '',
    `// В декларативном API:`,
    `<${field.fullName} name="myField" label="Моё поле" />`,
    '',
    `// В форме:`,
    `<Form form={form}>`,
    `  <${field.fullName} name="myField" label="Моё поле"${field.category === 'select' ? ' options={options}' : ''} />`,
    `  <Form.Button.Submit>Отправить</Form.Button.Submit>`,
    `</Form>`,
  ]

  if (field.details) {
    lines.push('', '// Детали:', '/*', field.details.slice(0, 500), '*/')
  }

  return lines.join('\n')
}

function generateFormCode(
  fields: Array<{ name: string; type: string; label: string; required?: boolean; validation?: string }>,
  formName: string,
  withSchema: boolean,
): string {
  const lines: string[] = []

  if (withSchema) {
    lines.push(`import { z } from 'zod/v4'`)
  }
  lines.push(`import { useAppForm } from '@lena/form-components'`)
  lines.push('')

  if (withSchema) {
    lines.push(`const ${formName}Schema = z.object({`)
    for (const field of fields) {
      const zodType = mapFieldTypeToZod(field.type, field.required, field.validation)
      lines.push(`  ${field.name}: ${zodType},`)
    }
    lines.push(`}).strip()`)
    lines.push('')
    lines.push(`type ${formName}Values = z.infer<typeof ${formName}Schema>`)
    lines.push('')
  }

  lines.push(`export function ${formName}() {`)
  lines.push(`  const form = useAppForm({`)
  if (withSchema) {
    lines.push(`    schema: ${formName}Schema,`)
  }
  lines.push(`    defaultValues: {`)
  for (const field of fields) {
    lines.push(`      ${field.name}: ${getDefaultValue(field.type)},`)
  }
  lines.push(`    },`)
  lines.push(`    onSubmit: async ({ value }) => {`)
  lines.push(`      // TODO: вызов Server Action`)
  lines.push(`      console.log(value)`)
  lines.push(`    },`)
  lines.push(`  })`)
  lines.push('')
  lines.push(`  return (`)
  lines.push(`    <Form form={form}>`)
  for (const field of fields) {
    const required = field.required ? ' required' : ''
    lines.push(`      <Form.Field.${field.type} name="${field.name}" label="${field.label}"${required} />`)
  }
  lines.push(`      <Form.Button.Submit>Сохранить</Form.Button.Submit>`)
  lines.push(`    </Form>`)
  lines.push(`  )`)
  lines.push(`}`)

  return lines.join('\n')
}

function mapFieldTypeToZod(type: string, required?: boolean, validation?: string): string {
  const base: Record<string, string> = {
    String: 'z.string()',
    Textarea: 'z.string()',
    Number: 'z.number()',
    NumberInput: 'z.number()',
    Date: 'z.date()',
    Checkbox: 'z.boolean()',
    Switch: 'z.boolean()',
    Select: 'z.string()',
    Combobox: 'z.string()',
  }
  let zodType = base[type] ?? 'z.string()'
  if (required) {
    zodType += `.min(1, 'Обязательное поле')`
  }
  if (validation) {
    zodType += `.${validation}`
  }
  return zodType
}

function getDefaultValue(type: string): string {
  const defaults: Record<string, string> = {
    Number: '0',
    NumberInput: '0',
    Checkbox: 'false',
    Switch: 'false',
    Date: 'undefined',
  }
  return defaults[type] ?? `''`
}

function buildCreateFormPrompt(modelName: string, fields: string, withOffline: boolean, withI18n: boolean): string {
  const parts = [
    `Создай CRUD форму для модели "${modelName}" с использованием @lena/form-components.`,
    '',
    `Поля: ${fields}`,
    '',
    'Требования:',
    '- Используй useAppForm из @lena/form-components',
    '- Создай Zod v4 схему с .strip()',
    '- Используй декларативный API (Form.Field.*)',
    '- Создай Server Action для сохранения',
    '- Файл схемы: _schemas/{modelName}.schema.ts',
  ]
  if (withOffline) {
    parts.push('- Добавь оффлайн-поддержку через useOfflineForm')
  }
  if (withI18n) {
    parts.push('- Добавь i18n через FormI18nProvider')
  }
  return parts.join('\n')
}

function buildAddFieldPrompt(fieldType: string, fieldName: string, validation?: string): string {
  return [
    `Добавь поле "${fieldName}" типа Form.Field.${fieldType} к существующей форме.`,
    '',
    'Требования:',
    '- Добавь поле в Zod-схему',
    '- Добавь defaultValue в useAppForm',
    `- Используй <Form.Field.${fieldType} name="${fieldName}" />`,
    validation ? `- Валидация: ${validation}` : '',
    '- Не забудь обновить тип формы',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildMigratePrompt(sourceFramework: string): string {
  return [
    `Мигрируй форму с ${sourceFramework} на @lena/form-components.`,
    '',
    'Ключевые изменения:',
    '- Замени useForm → useAppForm из @lena/form-components',
    '- Замени Controller/Field → Form.Field.* (декларативный API)',
    '- Замени yup/joi → Zod v4 с .strip()',
    '- Замени handleSubmit → onSubmit в useAppForm',
    '- Замени FormProvider → <Form form={form}>',
    '- Используй FormGroup для группировки полей',
    '- Используй Form.When для условных полей',
    '',
    'Импорты:',
    "import { useAppForm } from '@lena/form-components'",
    "import { z } from 'zod/v4'",
  ].join('\n')
}

export { type DirectiveInfo } from './data/directive-registry.js'
export { type FieldCategory, type FieldInfo } from './data/field-registry.js'
export { type LoadedDocs } from './data/loader.js'
export { type FormPattern, type PatternInfo } from './data/pattern-registry.js'
