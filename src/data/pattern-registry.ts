/** Available form patterns */
export type FormPattern =
  | 'crud-create'
  | 'crud-edit'
  | 'multi-step'
  | 'offline'
  | 'i18n'
  | 'from-schema'
  | 'declarative'
  | 'server-action'

/** Form pattern description */
export interface PatternInfo {
  name: FormPattern
  title: string
  description: string
  /** TSX code example */
  example: string
}

/** Form pattern registry — code templates for common scenarios */
const PATTERNS: PatternInfo[] = [
  {
    name: 'crud-create',
    title: 'CRUD: Create Record',
    description: 'Form for creating a new record with validation and Server Action',
    example: `import { z } from 'zod/v4'
import { useAppForm } from '@letar/forms'

const CreateSchema = z.object({
  name: z.string().min(1, 'Required field'),
  email: z.email('Invalid email'),
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
      <Form.Field.String name="name" label="Name" required />
      <Form.Field.String name="email" label="Email" required />
      <Form.Button.Submit>Create</Form.Button.Submit>
    </Form>
  )
}`,
  },
  {
    name: 'crud-edit',
    title: 'CRUD: Edit Record',
    description: 'Edit form with initial data loading',
    example: `import { z } from 'zod/v4'
import { useAppForm } from '@letar/forms'

const UpdateSchema = z.object({
  name: z.string().min(1, 'Required field'),
  email: z.email('Invalid email'),
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
      <Form.Field.String name="name" label="Name" required />
      <Form.Field.String name="email" label="Email" required />
      <Form.Button.Submit>Save</Form.Button.Submit>
    </Form>
  )
}`,
  },
  {
    name: 'multi-step',
    title: 'Multi-step Form',
    description: 'Form with multiple steps and per-step validation',
    example: `<Form form={form}>
  <Form.Steps validateOnNext animated>
    <Form.Steps.Step title="General">
      <Form.Field.String name="name" label="Name" required />
      <Form.Field.String name="email" label="Email" required />
    </Form.Steps.Step>
    <Form.Steps.Step title="Details">
      <Form.Field.Textarea name="bio" label="About" />
      <Form.Field.Phone name="phone" label="Phone" />
    </Form.Steps.Step>
    <Form.Steps.Step title="Confirmation">
      <Form.DebugValues />
    </Form.Steps.Step>
  </Form.Steps>
  <Form.Button.Submit>Done</Form.Button.Submit>
</Form>`,
  },
  {
    name: 'offline',
    title: 'Offline Form',
    description: 'Form with offline mode support and synchronization',
    example: `import { useOfflineForm, FormOfflineIndicator, FormSyncStatus } from '@letar/forms'

function OfflineForm() {
  const form = useOfflineForm({
    schema: MySchema,
    storageKey: 'my-form',
    syncAction: async (data) => await saveToServer(data),
  })

  return (
    <Form form={form}>
      <FormOfflineIndicator />
      <Form.Field.String name="title" label="Title" />
      <Form.Button.Submit>Save</Form.Button.Submit>
      <FormSyncStatus />
    </Form>
  )
}`,
  },
  {
    name: 'i18n',
    title: 'Multilingual Form',
    description: 'Form with i18n support via FormI18nProvider',
    example: `import { FormI18nProvider } from '@letar/forms'

function LocalizedForm() {
  return (
    <FormI18nProvider locale="ru" messages={ruMessages}>
      <Form form={form}>
        <Form.Field.String name="name" label="Name" required />
      </Form>
    </FormI18nProvider>
  )
}`,
  },
  {
    name: 'from-schema',
    title: 'Auto-generation from Schema',
    description: 'Form automatically generated from a Zod schema with UI metadata',
    example: `import { UserCreateFormSchema } from '@/generated/form-schemas/User.form'

// Full auto-generation — single line
<Form form={form}>
  <Form.FromSchema schema={UserCreateFormSchema} />
  <Form.Button.Submit>Create</Form.Button.Submit>
</Form>

// Partial — selected fields
<Form form={form}>
  <Form.AutoFields schema={UserCreateFormSchema} include={['name', 'email']} />
  <Form.Field.Custom name="avatar" label="Avatar">
    <CustomAvatarUpload />
  </Form.Field.Custom>
  <Form.Button.Submit>Create</Form.Button.Submit>
</Form>`,
  },
  {
    name: 'declarative',
    title: 'Declarative API',
    description: 'Full declarative API with conditional fields and groups',
    example: `<Form form={form}>
  <Form.Group title="General Information">
    <Form.Field.String name="name" label="Name" required />
    <Form.Field.Select name="type" label="Type" options={typeOptions} />
  </Form.Group>

  <Form.When name="type" is="company">
    <Form.Group title="Company Details">
      <Form.Field.String name="companyName" label="Company Name" />
      <Form.Field.String name="inn" label="Tax ID" />
    </Form.Group>
  </Form.When>

  <Form.Group.List name="contacts" title="Contacts" addLabel="Add contact">
    <Form.Field.String name="phone" label="Phone" />
    <Form.Field.String name="email" label="Email" />
  </Form.Group.List>

  <Form.Errors />
  <Form.DirtyGuard message="You have unsaved changes" />
  <Form.Button.Submit>Save</Form.Button.Submit>
</Form>`,
  },
  {
    name: 'server-action',
    title: 'Server Action Integration',
    description: 'Form calling a Server Action directly from onSubmit',
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
    if (result.error) { /* handle errors */ }
  },
})`,
  },
]

/** Builds the pattern registry */
export function buildPatternRegistry(): Map<FormPattern, PatternInfo> {
  const registry = new Map<FormPattern, PatternInfo>()
  for (const pattern of PATTERNS) {
    registry.set(pattern.name, pattern)
  }
  return registry
}

/** Returns a pattern by name or all patterns */
export function getPatterns(registry: Map<FormPattern, PatternInfo>, name?: string): PatternInfo[] {
  if (name) {
    const pattern = registry.get(name as FormPattern)
    return pattern ? [pattern] : []
  }
  return Array.from(registry.values())
}
