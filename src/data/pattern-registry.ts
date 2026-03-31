/** Доступные паттерны форм */
export type FormPattern =
  | 'crud-create'
  | 'crud-edit'
  | 'multi-step'
  | 'offline'
  | 'i18n'
  | 'from-schema'
  | 'declarative'
  | 'server-action'

/** Описание паттерна формы */
export interface PatternInfo {
  name: FormPattern
  title: string
  description: string
  /** Код-пример TSX */
  example: string
}

/** Реестр паттернов форм — шаблоны кода для типовых сценариев */
const PATTERNS: PatternInfo[] = [
  {
    name: 'crud-create',
    title: 'CRUD: Создание записи',
    description: 'Форма создания новой записи с валидацией и Server Action',
    example: `import { z } from 'zod/v4'
import { useAppForm } from '@lena/form-components'

const CreateSchema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  email: z.email('Некорректный email'),
}).strip()

type CreateForm = z.infer<typeof CreateSchema>

export function CreateEntityForm({ onSubmit }: { onSubmit: (data: CreateForm) => Promise<void> }) {
  const form = useAppForm({
    schema: CreateSchema,
    defaultValues: { name: '', email: '' },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  return (
    <Form form={form}>
      <Form.Field.String name="name" label="Имя" required />
      <Form.Field.String name="email" label="Email" required />
      <Form.Button.Submit>Создать</Form.Button.Submit>
    </Form>
  )
}`,
  },
  {
    name: 'crud-edit',
    title: 'CRUD: Редактирование записи',
    description: 'Форма редактирования с загрузкой начальных данных',
    example: `import { z } from 'zod/v4'
import { useAppForm } from '@lena/form-components'

const UpdateSchema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  email: z.email('Некорректный email'),
}).strip()

export function EditEntityForm({ entity, onSubmit }: { entity: Entity; onSubmit: (data: UpdateForm) => Promise<void> }) {
  const form = useAppForm({
    schema: UpdateSchema,
    defaultValues: { name: entity.name, email: entity.email },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  return (
    <Form form={form}>
      <Form.Field.String name="name" label="Имя" required />
      <Form.Field.String name="email" label="Email" required />
      <Form.Button.Submit>Сохранить</Form.Button.Submit>
    </Form>
  )
}`,
  },
  {
    name: 'multi-step',
    title: 'Многошаговая форма',
    description: 'Форма с несколькими шагами и валидацией на каждом',
    example: `<Form form={form}>
  <Form.Steps validateOnNext animated>
    <Form.Steps.Step title="Основное">
      <Form.Field.String name="name" label="Имя" required />
      <Form.Field.String name="email" label="Email" required />
    </Form.Steps.Step>
    <Form.Steps.Step title="Детали">
      <Form.Field.Textarea name="bio" label="О себе" />
      <Form.Field.Phone name="phone" label="Телефон" />
    </Form.Steps.Step>
    <Form.Steps.Step title="Подтверждение">
      <Form.DebugValues />
    </Form.Steps.Step>
  </Form.Steps>
  <Form.Button.Submit>Готово</Form.Button.Submit>
</Form>`,
  },
  {
    name: 'offline',
    title: 'Оффлайн-форма',
    description: 'Форма с поддержкой оффлайн-режима и синхронизацией',
    example: `import { useOfflineForm, FormOfflineIndicator, FormSyncStatus } from '@lena/form-components'

function OfflineForm() {
  const form = useOfflineForm({
    schema: MySchema,
    storageKey: 'my-form',
    syncAction: async (data) => await saveToServer(data),
  })

  return (
    <Form form={form}>
      <FormOfflineIndicator />
      <Form.Field.String name="title" label="Заголовок" />
      <Form.Button.Submit>Сохранить</Form.Button.Submit>
      <FormSyncStatus />
    </Form>
  )
}`,
  },
  {
    name: 'i18n',
    title: 'Мультиязычная форма',
    description: 'Форма с поддержкой i18n через FormI18nProvider',
    example: `import { FormI18nProvider } from '@lena/form-components'

function LocalizedForm() {
  return (
    <FormI18nProvider locale="ru" messages={ruMessages}>
      <Form form={form}>
        <Form.Field.String name="name" label="Имя" required />
      </Form>
    </FormI18nProvider>
  )
}`,
  },
  {
    name: 'from-schema',
    title: 'Автогенерация из схемы',
    description: 'Форма, автоматически сгенерированная из Zod-схемы с UI метаданными',
    example: `import { UserCreateFormSchema } from '@/generated/form-schemas/User.form'

// Полная автогенерация — одна строка
<Form form={form}>
  <Form.FromSchema schema={UserCreateFormSchema} />
  <Form.Button.Submit>Создать</Form.Button.Submit>
</Form>

// Частичная — выбранные поля
<Form form={form}>
  <Form.AutoFields schema={UserCreateFormSchema} include={['name', 'email']} />
  <Form.Field.Custom name="avatar" label="Аватар">
    <CustomAvatarUpload />
  </Form.Field.Custom>
  <Form.Button.Submit>Создать</Form.Button.Submit>
</Form>`,
  },
  {
    name: 'declarative',
    title: 'Декларативный API',
    description: 'Полный декларативный API с условными полями и группами',
    example: `<Form form={form}>
  <Form.Group title="Основная информация">
    <Form.Field.String name="name" label="Имя" required />
    <Form.Field.Select name="type" label="Тип" options={typeOptions} />
  </Form.Group>

  <Form.When name="type" is="company">
    <Form.Group title="Данные компании">
      <Form.Field.String name="companyName" label="Название компании" />
      <Form.Field.String name="inn" label="ИНН" />
    </Form.Group>
  </Form.When>

  <Form.Group.List name="contacts" title="Контакты" addLabel="Добавить контакт">
    <Form.Field.String name="phone" label="Телефон" />
    <Form.Field.String name="email" label="Email" />
  </Form.Group.List>

  <Form.Errors />
  <Form.DirtyGuard message="Есть несохранённые изменения" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>`,
  },
  {
    name: 'server-action',
    title: 'Server Action интеграция',
    description: 'Форма с вызовом Server Action напрямую из onSubmit',
    example: `// actions.ts
'use server'
import { CreateSchema } from './_schemas/create.schema'

export async function createEntity(formData: unknown) {
  const parsed = CreateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const db = await getEnhancedPrisma()
  await db.entity.create({ data: parsed.data })
  return { success: true }
}

// form.tsx
const form = useAppForm({
  schema: CreateSchema,
  defaultValues: { name: '' },
  onSubmit: async ({ value }) => {
    const result = await createEntity(value)
    if (result.error) { /* обработка ошибок */ }
  },
})`,
  },
]

/** Строит реестр паттернов */
export function buildPatternRegistry(): Map<FormPattern, PatternInfo> {
  const registry = new Map<FormPattern, PatternInfo>()
  for (const pattern of PATTERNS) {
    registry.set(pattern.name, pattern)
  }
  return registry
}

/** Возвращает паттерн по имени или все */
export function getPatterns(registry: Map<FormPattern, PatternInfo>, name?: string): PatternInfo[] {
  if (name) {
    const pattern = registry.get(name as FormPattern)
    return pattern ? [pattern] : []
  }
  return Array.from(registry.values())
}
