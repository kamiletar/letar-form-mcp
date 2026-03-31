#!/usr/bin/env node

// src/cli.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { existsSync as existsSync2 } from "fs";
import { dirname, join as join2, resolve } from "path";
import { fileURLToPath } from "url";

// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// src/data/directive-registry.ts
var KNOWN_DIRECTIVES = [
  {
    name: "@form.title",
    description: "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043F\u043E\u043B\u044F \u0432 \u0444\u043E\u0440\u043C\u0435",
    example: '/// @form.title("\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0446\u0435\u043F\u0442\u0430")',
    output: '.meta({ ui: { title: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0446\u0435\u043F\u0442\u0430" } })'
  },
  {
    name: "@form.placeholder",
    description: "Placeholder \u0434\u043B\u044F \u043F\u043E\u043B\u044F \u0432\u0432\u043E\u0434\u0430",
    example: '/// @form.placeholder("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435")',
    output: '.meta({ ui: { placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" } })'
  },
  {
    name: "@form.description",
    description: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u043F\u043E\u0434 \u043F\u043E\u043B\u0435\u043C",
    example: '/// @form.description("\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0431\u043B\u044E\u0434\u0430")',
    output: '.meta({ ui: { description: "\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0431\u043B\u044E\u0434\u0430" } })'
  },
  {
    name: "@form.fieldType",
    description: "\u042F\u0432\u043D\u043E\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0438\u0435 \u0442\u0438\u043F\u0430 \u043F\u043E\u043B\u044F \u0444\u043E\u0440\u043C\u044B",
    example: '/// @form.fieldType("tags")',
    output: '.meta({ ui: { fieldType: "tags" } })'
  },
  {
    name: "@form.props",
    description: "\u0421\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u043F\u043E\u043B\u044F. \u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0440\u0430\u0437\u0434\u0435\u043B\u044F\u044E\u0442\u0441\u044F \u043D\u0430 Zod constraints (min, max, step) \u0438 UI props (layout, count)",
    example: "/// @form.props({ min: 1, max: 100, step: 0.5 })",
    output: "z.number().min(1).max(100).step(0.5)"
  },
  {
    name: "@form.relation",
    description: "\u041A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u044F \u0434\u043B\u044F relation-\u043F\u043E\u043B\u0435\u0439 (FK \u2192 Select/Combobox)",
    example: '/// @form.relation({ labelField: "name", searchable: true })',
    output: '.meta({ ui: { fieldType: "combobox", relation: { labelField: "name", searchable: true } } })'
  },
  {
    name: "@form.exclude",
    description: "\u0418\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u043E\u043B\u0435 \u0438\u0437 \u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u043C\u044B\u0445 \u0444\u043E\u0440\u043C-\u0441\u0445\u0435\u043C",
    example: "/// @form.exclude",
    output: "\u041F\u043E\u043B\u0435 \u043D\u0435 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 CreateFormSchema / UpdateFormSchema"
  }
];
function buildDirectiveRegistry(zenstackSections) {
  const registry = /* @__PURE__ */ new Map();
  for (const directive of KNOWN_DIRECTIVES) {
    registry.set(directive.name, directive);
  }
  for (const section of zenstackSections) {
    if (section.heading.includes("@form.")) {
      const nameMatch = section.heading.match(/@form\.\w+/);
      if (nameMatch) {
        const existing = registry.get(nameMatch[0]);
        if (existing) {
          existing.description = section.content.split("\n")[0] || existing.description;
        }
      }
    }
  }
  return registry;
}
function getDirectives(registry, name) {
  if (name) {
    const normalized = name.startsWith("@form.") ? name : `@form.${name}`;
    const directive = registry.get(normalized);
    return directive ? [directive] : [];
  }
  return Array.from(registry.values());
}

// src/data/field-registry.ts
var CATEGORY_MAP = {
  "\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0435 \u043F\u043E\u043B\u044F": "text",
  "\u0427\u0438\u0441\u043B\u043E\u0432\u044B\u0435 \u043F\u043E\u043B\u044F": "number",
  "\u0414\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F": "date",
  "\u0412\u044B\u0431\u043E\u0440 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430": "select",
  "\u041C\u043D\u043E\u0436\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 \u0432\u044B\u0431\u043E\u0440": "multi-select",
  \u0421\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435: "special"
};
function parseTableRow(line) {
  const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|/);
  if (!match) {
    return null;
  }
  return { component: match[1], description: match[2] };
}
function shortName(fullName) {
  const parts = fullName.split(".");
  return parts.at(-1) ?? fullName;
}
function buildFieldRegistry(fieldSections) {
  const registry = /* @__PURE__ */ new Map();
  const detailSections = /* @__PURE__ */ new Map();
  for (const section of fieldSections) {
    if (section.level === 2 && section.heading.includes("Form.Field.")) {
      const fieldMatch = section.heading.match(/Form\.Field\.(\w+)/);
      if (fieldMatch) {
        detailSections.set(fieldMatch[1], section.content);
      }
    }
  }
  for (const section of fieldSections) {
    const category = CATEGORY_MAP[section.heading];
    if (!category) {
      continue;
    }
    const lines = section.content.split("\n");
    for (const line of lines) {
      const row = parseTableRow(line);
      if (!row) {
        continue;
      }
      const name = shortName(row.component);
      const info = {
        name,
        fullName: row.component,
        description: row.description,
        category,
        details: detailSections.get(name)
      };
      registry.set(name.toLowerCase(), info);
    }
  }
  return registry;
}
function getFields(registry, category) {
  const all = Array.from(registry.values());
  if (!category) {
    return all;
  }
  return all.filter((f) => f.category === category);
}

// src/data/loader.ts
import { existsSync, readFileSync } from "fs";
import { join } from "path";
var DOC_FILES = {
  fields: "fields.md",
  "form-level": "form-level.md",
  "schema-generation": "schema-generation.md",
  offline: "offline.md",
  i18n: "i18n.md",
  zenstack: "zenstack.md",
  "api-reference": "api-reference.md"
};
function parseMarkdownSections(markdown) {
  const lines = markdown.split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);
    if (h2Match || h3Match) {
      if (current) {
        current.content = current.content.trimEnd();
        sections.push(current);
      }
      current = {
        heading: h2Match?.[1] ?? h3Match?.[1],
        level: h2Match ? 2 : 3,
        content: ""
      };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) {
    current.content = current.content.trimEnd();
    sections.push(current);
  }
  return sections;
}
function loadDocs(docsPath2) {
  const raw = {};
  const sections = {};
  for (const [key, filename] of Object.entries(DOC_FILES)) {
    const filePath = join(docsPath2, filename);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf-8");
      raw[key] = content;
      sections[key] = parseMarkdownSections(content);
    } else {
      raw[key] = "";
      sections[key] = [];
    }
  }
  return { raw, sections };
}

// src/data/pattern-registry.ts
var PATTERNS = [
  {
    name: "crud-create",
    title: "CRUD: \u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0438",
    description: "\u0424\u043E\u0440\u043C\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043D\u043E\u0432\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u0438 \u0441 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0435\u0439 \u0438 Server Action",
    example: `import { z } from 'zod/v4'
import { useAppForm } from '@lena/form-components'

const CreateSchema = z.object({
  name: z.string().min(1, '\u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u043F\u043E\u043B\u0435'),
  email: z.email('\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 email'),
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
      <Form.Field.String name="name" label="\u0418\u043C\u044F" required />
      <Form.Field.String name="email" label="Email" required />
      <Form.Button.Submit>\u0421\u043E\u0437\u0434\u0430\u0442\u044C</Form.Button.Submit>
    </Form>
  )
}`
  },
  {
    name: "crud-edit",
    title: "CRUD: \u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0438",
    description: "\u0424\u043E\u0440\u043C\u0430 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0441 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u043E\u0439 \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445",
    example: `import { z } from 'zod/v4'
import { useAppForm } from '@lena/form-components'

const UpdateSchema = z.object({
  name: z.string().min(1, '\u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u043F\u043E\u043B\u0435'),
  email: z.email('\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 email'),
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
      <Form.Field.String name="name" label="\u0418\u043C\u044F" required />
      <Form.Field.String name="email" label="Email" required />
      <Form.Button.Submit>\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</Form.Button.Submit>
    </Form>
  )
}`
  },
  {
    name: "multi-step",
    title: "\u041C\u043D\u043E\u0433\u043E\u0448\u0430\u0433\u043E\u0432\u0430\u044F \u0444\u043E\u0440\u043C\u0430",
    description: "\u0424\u043E\u0440\u043C\u0430 \u0441 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u043C\u0438 \u0448\u0430\u0433\u0430\u043C\u0438 \u0438 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0435\u0439 \u043D\u0430 \u043A\u0430\u0436\u0434\u043E\u043C",
    example: `<Form form={form}>
  <Form.Steps validateOnNext animated>
    <Form.Steps.Step title="\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0435">
      <Form.Field.String name="name" label="\u0418\u043C\u044F" required />
      <Form.Field.String name="email" label="Email" required />
    </Form.Steps.Step>
    <Form.Steps.Step title="\u0414\u0435\u0442\u0430\u043B\u0438">
      <Form.Field.Textarea name="bio" label="\u041E \u0441\u0435\u0431\u0435" />
      <Form.Field.Phone name="phone" label="\u0422\u0435\u043B\u0435\u0444\u043E\u043D" />
    </Form.Steps.Step>
    <Form.Steps.Step title="\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435">
      <Form.DebugValues />
    </Form.Steps.Step>
  </Form.Steps>
  <Form.Button.Submit>\u0413\u043E\u0442\u043E\u0432\u043E</Form.Button.Submit>
</Form>`
  },
  {
    name: "offline",
    title: "\u041E\u0444\u0444\u043B\u0430\u0439\u043D-\u0444\u043E\u0440\u043C\u0430",
    description: "\u0424\u043E\u0440\u043C\u0430 \u0441 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u043E\u0439 \u043E\u0444\u0444\u043B\u0430\u0439\u043D-\u0440\u0435\u0436\u0438\u043C\u0430 \u0438 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0435\u0439",
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
      <Form.Field.String name="title" label="\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A" />
      <Form.Button.Submit>\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</Form.Button.Submit>
      <FormSyncStatus />
    </Form>
  )
}`
  },
  {
    name: "i18n",
    title: "\u041C\u0443\u043B\u044C\u0442\u0438\u044F\u0437\u044B\u0447\u043D\u0430\u044F \u0444\u043E\u0440\u043C\u0430",
    description: "\u0424\u043E\u0440\u043C\u0430 \u0441 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u043E\u0439 i18n \u0447\u0435\u0440\u0435\u0437 FormI18nProvider",
    example: `import { FormI18nProvider } from '@lena/form-components'

function LocalizedForm() {
  return (
    <FormI18nProvider locale="ru" messages={ruMessages}>
      <Form form={form}>
        <Form.Field.String name="name" label="\u0418\u043C\u044F" required />
      </Form>
    </FormI18nProvider>
  )
}`
  },
  {
    name: "from-schema",
    title: "\u0410\u0432\u0442\u043E\u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0438\u0437 \u0441\u0445\u0435\u043C\u044B",
    description: "\u0424\u043E\u0440\u043C\u0430, \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0438\u0437 Zod-\u0441\u0445\u0435\u043C\u044B \u0441 UI \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u043C\u0438",
    example: `import { UserCreateFormSchema } from '@/generated/form-schemas/User.form'

// \u041F\u043E\u043B\u043D\u0430\u044F \u0430\u0432\u0442\u043E\u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u2014 \u043E\u0434\u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0430
<Form form={form}>
  <Form.FromSchema schema={UserCreateFormSchema} />
  <Form.Button.Submit>\u0421\u043E\u0437\u0434\u0430\u0442\u044C</Form.Button.Submit>
</Form>

// \u0427\u0430\u0441\u0442\u0438\u0447\u043D\u0430\u044F \u2014 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u044F
<Form form={form}>
  <Form.AutoFields schema={UserCreateFormSchema} include={['name', 'email']} />
  <Form.Field.Custom name="avatar" label="\u0410\u0432\u0430\u0442\u0430\u0440">
    <CustomAvatarUpload />
  </Form.Field.Custom>
  <Form.Button.Submit>\u0421\u043E\u0437\u0434\u0430\u0442\u044C</Form.Button.Submit>
</Form>`
  },
  {
    name: "declarative",
    title: "\u0414\u0435\u043A\u043B\u0430\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0439 API",
    description: "\u041F\u043E\u043B\u043D\u044B\u0439 \u0434\u0435\u043A\u043B\u0430\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0439 API \u0441 \u0443\u0441\u043B\u043E\u0432\u043D\u044B\u043C\u0438 \u043F\u043E\u043B\u044F\u043C\u0438 \u0438 \u0433\u0440\u0443\u043F\u043F\u0430\u043C\u0438",
    example: `<Form form={form}>
  <Form.Group title="\u041E\u0441\u043D\u043E\u0432\u043D\u0430\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F">
    <Form.Field.String name="name" label="\u0418\u043C\u044F" required />
    <Form.Field.Select name="type" label="\u0422\u0438\u043F" options={typeOptions} />
  </Form.Group>

  <Form.When name="type" is="company">
    <Form.Group title="\u0414\u0430\u043D\u043D\u044B\u0435 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438">
      <Form.Field.String name="companyName" label="\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438" />
      <Form.Field.String name="inn" label="\u0418\u041D\u041D" />
    </Form.Group>
  </Form.When>

  <Form.Group.List name="contacts" title="\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B" addLabel="\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u043D\u0442\u0430\u043A\u0442">
    <Form.Field.String name="phone" label="\u0422\u0435\u043B\u0435\u0444\u043E\u043D" />
    <Form.Field.String name="email" label="Email" />
  </Form.Group.List>

  <Form.Errors />
  <Form.DirtyGuard message="\u0415\u0441\u0442\u044C \u043D\u0435\u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F" />
  <Form.Button.Submit>\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</Form.Button.Submit>
</Form>`
  },
  {
    name: "server-action",
    title: "Server Action \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u044F",
    description: "\u0424\u043E\u0440\u043C\u0430 \u0441 \u0432\u044B\u0437\u043E\u0432\u043E\u043C Server Action \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E \u0438\u0437 onSubmit",
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
    if (result.error) { /* \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u043E\u0448\u0438\u0431\u043E\u043A */ }
  },
})`
  }
];
function buildPatternRegistry() {
  const registry = /* @__PURE__ */ new Map();
  for (const pattern of PATTERNS) {
    registry.set(pattern.name, pattern);
  }
  return registry;
}
function getPatterns(registry, name) {
  if (name) {
    const pattern = registry.get(name);
    return pattern ? [pattern] : [];
  }
  return Array.from(registry.values());
}

// src/index.ts
function createFormMcpServer(options) {
  const { docsPath: docsPath2, name = "@letar/form-mcp", version = "0.1.0" } = options;
  const docs = loadDocs(docsPath2);
  const fieldRegistry = buildFieldRegistry(docs.sections.fields);
  const directiveRegistry = buildDirectiveRegistry(docs.sections.zenstack);
  const patternRegistry = buildPatternRegistry();
  const server2 = new McpServer({ name, version }, { capabilities: { resources: {}, tools: {}, prompts: {} } });
  server2.tool(
    "list_fields",
    "\u0421\u043F\u0438\u0441\u043E\u043A \u0432\u0441\u0435\u0445 \u0442\u0438\u043F\u043E\u0432 \u043F\u043E\u043B\u0435\u0439 @lena/form-components. \u0424\u0438\u043B\u044C\u0442\u0440 \u043F\u043E \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438: text, number, date, select, multi-select, special.",
    { category: z.string().optional().describe("\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F: text, number, date, select, multi-select, special") },
    async ({ category }) => {
      const fields = getFields(fieldRegistry, category);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              fields.map((f) => ({
                name: f.name,
                fullName: f.fullName,
                description: f.description,
                category: f.category
              })),
              null,
              2
            )
          }
        ]
      };
    }
  );
  server2.tool(
    "get_field_props",
    "\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u0440\u043E\u043F\u0441\u044B, \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0438 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u044E \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u044F \u0444\u043E\u0440\u043C\u044B.",
    { fieldType: z.string().describe("\u0422\u0438\u043F \u043F\u043E\u043B\u044F, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: String, Date, Select, Combobox") },
    async ({ fieldType }) => {
      const field = fieldRegistry.get(fieldType.toLowerCase());
      if (!field) {
        return {
          content: [{ type: "text", text: `\u041F\u043E\u043B\u0435 "${fieldType}" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 list_fields \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u043A\u0430.` }],
          isError: true
        };
      }
      const result = {
        name: field.name,
        fullName: field.fullName,
        description: field.description,
        category: field.category
      };
      if (field.details) {
        result.details = field.details;
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
  server2.tool(
    "get_field_example",
    "\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043A\u043E\u0434-\u043F\u0440\u0438\u043C\u0435\u0440 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u044F \u0444\u043E\u0440\u043C\u044B.",
    {
      fieldType: z.string().describe("\u0422\u0438\u043F \u043F\u043E\u043B\u044F: String, Date, Select, \u0438 \u0442.\u0434."),
      variant: z.string().optional().describe("\u0412\u0430\u0440\u0438\u0430\u043D\u0442: basic, with-validation, in-form")
    },
    async ({ fieldType }) => {
      const field = fieldRegistry.get(fieldType.toLowerCase());
      if (!field) {
        return {
          content: [{ type: "text", text: `\u041F\u043E\u043B\u0435 "${fieldType}" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.` }],
          isError: true
        };
      }
      const example = generateFieldExample(field);
      return { content: [{ type: "text", text: example }] };
    }
  );
  server2.tool(
    "get_form_pattern",
    "\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u043E\u043B\u043D\u044B\u0439 \u043F\u0440\u0438\u043C\u0435\u0440 \u0444\u043E\u0440\u043C\u044B \u0434\u043B\u044F \u0442\u0438\u043F\u043E\u0432\u043E\u0433\u043E \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u044F: crud-create, crud-edit, multi-step, offline, i18n, from-schema, declarative, server-action.",
    {
      pattern: z.string().describe(
        "\u0418\u043C\u044F \u043F\u0430\u0442\u0442\u0435\u0440\u043D\u0430: crud-create, crud-edit, multi-step, offline, i18n, from-schema, declarative, server-action"
      )
    },
    async ({ pattern }) => {
      const patterns = getPatterns(patternRegistry, pattern);
      if (patterns.length === 0) {
        const all = getPatterns(patternRegistry);
        return {
          content: [
            {
              type: "text",
              text: `\u041F\u0430\u0442\u0442\u0435\u0440\u043D "${pattern}" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435: ${all.map((p2) => p2.name).join(", ")}`
            }
          ],
          isError: true
        };
      }
      const p = patterns[0];
      return {
        content: [{ type: "text", text: `# ${p.title}

${p.description}

\`\`\`tsx
${p.example}
\`\`\`` }]
      };
    }
  );
  server2.tool(
    "get_directives",
    "\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 @form.* \u0434\u0438\u0440\u0435\u043A\u0442\u0438\u0432 zenstack-form-plugin. \u0411\u0435\u0437 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u2014 \u0432\u0441\u0435 \u0434\u0438\u0440\u0435\u043A\u0442\u0438\u0432\u044B.",
    { directive: z.string().optional().describe("\u0418\u043C\u044F \u0434\u0438\u0440\u0435\u043A\u0442\u0438\u0432\u044B: @form.title, @form.props, \u0438 \u0442.\u0434.") },
    async ({ directive }) => {
      const directives = getDirectives(directiveRegistry, directive);
      return {
        content: [{ type: "text", text: JSON.stringify(directives, null, 2) }]
      };
    }
  );
  server2.tool(
    "generate_form",
    "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u043E\u0434 \u0444\u043E\u0440\u043C\u044B \u043F\u043E \u0441\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u0438 \u043F\u043E\u043B\u0435\u0439.",
    {
      fields: z.array(
        z.object({
          name: z.string().describe("\u0418\u043C\u044F \u043F\u043E\u043B\u044F"),
          type: z.string().describe("\u0422\u0438\u043F \u043F\u043E\u043B\u044F: String, Number, Date, Select, \u0438 \u0442.\u0434."),
          label: z.string().describe("\u041C\u0435\u0442\u043A\u0430 \u043F\u043E\u043B\u044F"),
          required: z.boolean().optional().describe("\u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u043F\u043E\u043B\u0435"),
          validation: z.string().optional().describe("\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u044F Zod")
        })
      ).describe("\u041C\u0430\u0441\u0441\u0438\u0432 \u0441\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u0439 \u043F\u043E\u043B\u0435\u0439"),
      formName: z.string().optional().describe("\u0418\u043C\u044F \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u0430 \u0444\u043E\u0440\u043C\u044B"),
      withSchema: z.boolean().optional().describe("\u0413\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C Zod-\u0441\u0445\u0435\u043C\u0443")
    },
    async ({ fields, formName = "MyForm", withSchema = true }) => {
      const code = generateFormCode(fields, formName, withSchema);
      return { content: [{ type: "text", text: code }] };
    }
  );
  const docEntries = [
    { key: "fields", name: "Field \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u044B", description: "\u041F\u043E\u043B\u043D\u044B\u0439 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A 40+ \u0442\u0438\u043F\u043E\u0432 \u043F\u043E\u043B\u0435\u0439" },
    {
      key: "form-level",
      name: "Form-level \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u044B",
      description: "Steps, When, Errors, DirtyGuard, DebugValues \u0438 \u0434\u0440\u0443\u0433\u0438\u0435"
    },
    { key: "schema-generation", name: "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0438\u0437 \u0441\u0445\u0435\u043C\u044B", description: "FromSchema, AutoFields, Builder, Auto \u043F\u043E\u043B\u044F" },
    { key: "offline", name: "Offline \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430", description: "useOfflineForm, sync queue, \u0438\u043D\u0434\u0438\u043A\u0430\u0442\u043E\u0440\u044B \u0441\u0442\u0430\u0442\u0443\u0441\u0430" },
    { key: "i18n", name: "\u041C\u0443\u043B\u044C\u0442\u0438\u044F\u0437\u044B\u0447\u043D\u043E\u0441\u0442\u044C", description: "FormI18nProvider, \u043B\u043E\u043A\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \u043E\u0448\u0438\u0431\u043E\u043A \u0438 \u043E\u043F\u0446\u0438\u0439" },
    { key: "zenstack", name: "ZenStack \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u044F", description: "@form.* \u0434\u0438\u0440\u0435\u043A\u0442\u0438\u0432\u044B, \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0438\u0437 schema.zmodel" },
    { key: "api-reference", name: "API Reference", description: "Hooks, contexts, \u0442\u0438\u043F\u044B, \u0443\u0442\u0438\u043B\u0438\u0442\u044B" }
  ];
  for (const entry of docEntries) {
    server2.resource(
      entry.name,
      `form-docs://${entry.key}`,
      { description: entry.description, mimeType: "text/markdown" },
      async () => ({
        contents: [
          {
            uri: `form-docs://${entry.key}`,
            mimeType: "text/markdown",
            text: docs.raw[entry.key] || `# ${entry.name}

\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430.`
          }
        ]
      })
    );
  }
  server2.prompt(
    "create-form",
    "\u0421\u043E\u0437\u0434\u0430\u0442\u044C CRUD \u0444\u043E\u0440\u043C\u0443 \u0434\u043B\u044F \u043C\u043E\u0434\u0435\u043B\u0438 \u0434\u0430\u043D\u043D\u044B\u0445",
    {
      modelName: z.string().describe("\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: User, Product, Recipe)"),
      fields: z.string().describe("\u0421\u043F\u0438\u0441\u043E\u043A \u043F\u043E\u043B\u0435\u0439 \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E: name:String, email:String, age:Number"),
      withOffline: z.boolean().optional().describe("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043E\u0444\u0444\u043B\u0430\u0439\u043D-\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443"),
      withI18n: z.boolean().optional().describe("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C i18n")
    },
    async ({ modelName, fields, withOffline, withI18n }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: buildCreateFormPrompt(modelName, fields, withOffline === true, withI18n === true)
          }
        }
      ]
    })
  );
  server2.prompt(
    "add-field",
    "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u043E\u043B\u0435 \u043A \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0439 \u0444\u043E\u0440\u043C\u0435",
    {
      fieldType: z.string().describe("\u0422\u0438\u043F \u043F\u043E\u043B\u044F: String, Date, Select, Combobox, \u0438 \u0442.\u0434."),
      fieldName: z.string().describe("\u0418\u043C\u044F \u043F\u043E\u043B\u044F \u0432 \u0444\u043E\u0440\u043C\u0435"),
      validation: z.string().optional().describe("\u0412\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u044F: required, email, min:3, max:100")
    },
    async ({ fieldType, fieldName, validation }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: buildAddFieldPrompt(fieldType, fieldName, validation)
          }
        }
      ]
    })
  );
  server2.prompt(
    "migrate-form",
    "\u041C\u0438\u0433\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0444\u043E\u0440\u043C\u0443 \u0441 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0444\u0440\u0435\u0439\u043C\u0432\u043E\u0440\u043A\u0430 \u043D\u0430 @lena/form-components",
    {
      sourceFramework: z.string().describe("\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u0444\u0440\u0435\u0439\u043C\u0432\u043E\u0440\u043A: react-hook-form, formik, conform")
    },
    async ({ sourceFramework }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: buildMigratePrompt(sourceFramework)
          }
        }
      ]
    })
  );
  return server2;
}
function generateFieldExample(field) {
  const lines = [
    `// \u041F\u0440\u0438\u043C\u0435\u0440 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F ${field.fullName}`,
    "",
    `// \u0412 \u0434\u0435\u043A\u043B\u0430\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u043C API:`,
    `<${field.fullName} name="myField" label="\u041C\u043E\u0451 \u043F\u043E\u043B\u0435" />`,
    "",
    `// \u0412 \u0444\u043E\u0440\u043C\u0435:`,
    `<Form form={form}>`,
    `  <${field.fullName} name="myField" label="\u041C\u043E\u0451 \u043F\u043E\u043B\u0435"${field.category === "select" ? " options={options}" : ""} />`,
    `  <Form.Button.Submit>\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C</Form.Button.Submit>`,
    `</Form>`
  ];
  if (field.details) {
    lines.push("", "// \u0414\u0435\u0442\u0430\u043B\u0438:", "/*", field.details.slice(0, 500), "*/");
  }
  return lines.join("\n");
}
function generateFormCode(fields, formName, withSchema) {
  const lines = [];
  if (withSchema) {
    lines.push(`import { z } from 'zod/v4'`);
  }
  lines.push(`import { useAppForm } from '@lena/form-components'`);
  lines.push("");
  if (withSchema) {
    lines.push(`const ${formName}Schema = z.object({`);
    for (const field of fields) {
      const zodType = mapFieldTypeToZod(field.type, field.required, field.validation);
      lines.push(`  ${field.name}: ${zodType},`);
    }
    lines.push(`}).strip()`);
    lines.push("");
    lines.push(`type ${formName}Values = z.infer<typeof ${formName}Schema>`);
    lines.push("");
  }
  lines.push(`export function ${formName}() {`);
  lines.push(`  const form = useAppForm({`);
  if (withSchema) {
    lines.push(`    schema: ${formName}Schema,`);
  }
  lines.push(`    defaultValues: {`);
  for (const field of fields) {
    lines.push(`      ${field.name}: ${getDefaultValue(field.type)},`);
  }
  lines.push(`    },`);
  lines.push(`    onSubmit: async ({ value }) => {`);
  lines.push(`      // TODO: \u0432\u044B\u0437\u043E\u0432 Server Action`);
  lines.push(`      console.log(value)`);
  lines.push(`    },`);
  lines.push(`  })`);
  lines.push("");
  lines.push(`  return (`);
  lines.push(`    <Form form={form}>`);
  for (const field of fields) {
    const required = field.required ? " required" : "";
    lines.push(`      <Form.Field.${field.type} name="${field.name}" label="${field.label}"${required} />`);
  }
  lines.push(`      <Form.Button.Submit>\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</Form.Button.Submit>`);
  lines.push(`    </Form>`);
  lines.push(`  )`);
  lines.push(`}`);
  return lines.join("\n");
}
function mapFieldTypeToZod(type, required, validation) {
  const base = {
    String: "z.string()",
    Textarea: "z.string()",
    Number: "z.number()",
    NumberInput: "z.number()",
    Date: "z.date()",
    Checkbox: "z.boolean()",
    Switch: "z.boolean()",
    Select: "z.string()",
    Combobox: "z.string()"
  };
  let zodType = base[type] ?? "z.string()";
  if (required) {
    zodType += `.min(1, '\u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u043F\u043E\u043B\u0435')`;
  }
  if (validation) {
    zodType += `.${validation}`;
  }
  return zodType;
}
function getDefaultValue(type) {
  const defaults = {
    Number: "0",
    NumberInput: "0",
    Checkbox: "false",
    Switch: "false",
    Date: "undefined"
  };
  return defaults[type] ?? `''`;
}
function buildCreateFormPrompt(modelName, fields, withOffline, withI18n) {
  const parts = [
    `\u0421\u043E\u0437\u0434\u0430\u0439 CRUD \u0444\u043E\u0440\u043C\u0443 \u0434\u043B\u044F \u043C\u043E\u0434\u0435\u043B\u0438 "${modelName}" \u0441 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435\u043C @lena/form-components.`,
    "",
    `\u041F\u043E\u043B\u044F: ${fields}`,
    "",
    "\u0422\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F:",
    "- \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 useAppForm \u0438\u0437 @lena/form-components",
    "- \u0421\u043E\u0437\u0434\u0430\u0439 Zod v4 \u0441\u0445\u0435\u043C\u0443 \u0441 .strip()",
    "- \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0434\u0435\u043A\u043B\u0430\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0439 API (Form.Field.*)",
    "- \u0421\u043E\u0437\u0434\u0430\u0439 Server Action \u0434\u043B\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F",
    "- \u0424\u0430\u0439\u043B \u0441\u0445\u0435\u043C\u044B: _schemas/{modelName}.schema.ts"
  ];
  if (withOffline) {
    parts.push("- \u0414\u043E\u0431\u0430\u0432\u044C \u043E\u0444\u0444\u043B\u0430\u0439\u043D-\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443 \u0447\u0435\u0440\u0435\u0437 useOfflineForm");
  }
  if (withI18n) {
    parts.push("- \u0414\u043E\u0431\u0430\u0432\u044C i18n \u0447\u0435\u0440\u0435\u0437 FormI18nProvider");
  }
  return parts.join("\n");
}
function buildAddFieldPrompt(fieldType, fieldName, validation) {
  return [
    `\u0414\u043E\u0431\u0430\u0432\u044C \u043F\u043E\u043B\u0435 "${fieldName}" \u0442\u0438\u043F\u0430 Form.Field.${fieldType} \u043A \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0439 \u0444\u043E\u0440\u043C\u0435.`,
    "",
    "\u0422\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F:",
    "- \u0414\u043E\u0431\u0430\u0432\u044C \u043F\u043E\u043B\u0435 \u0432 Zod-\u0441\u0445\u0435\u043C\u0443",
    "- \u0414\u043E\u0431\u0430\u0432\u044C defaultValue \u0432 useAppForm",
    `- \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 <Form.Field.${fieldType} name="${fieldName}" />`,
    validation ? `- \u0412\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u044F: ${validation}` : "",
    "- \u041D\u0435 \u0437\u0430\u0431\u0443\u0434\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0442\u0438\u043F \u0444\u043E\u0440\u043C\u044B"
  ].filter(Boolean).join("\n");
}
function buildMigratePrompt(sourceFramework) {
  return [
    `\u041C\u0438\u0433\u0440\u0438\u0440\u0443\u0439 \u0444\u043E\u0440\u043C\u0443 \u0441 ${sourceFramework} \u043D\u0430 @lena/form-components.`,
    "",
    "\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F:",
    "- \u0417\u0430\u043C\u0435\u043D\u0438 useForm \u2192 useAppForm \u0438\u0437 @lena/form-components",
    "- \u0417\u0430\u043C\u0435\u043D\u0438 Controller/Field \u2192 Form.Field.* (\u0434\u0435\u043A\u043B\u0430\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0439 API)",
    "- \u0417\u0430\u043C\u0435\u043D\u0438 yup/joi \u2192 Zod v4 \u0441 .strip()",
    "- \u0417\u0430\u043C\u0435\u043D\u0438 handleSubmit \u2192 onSubmit \u0432 useAppForm",
    "- \u0417\u0430\u043C\u0435\u043D\u0438 FormProvider \u2192 <Form form={form}>",
    "- \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 FormGroup \u0434\u043B\u044F \u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0438 \u043F\u043E\u043B\u0435\u0439",
    "- \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 Form.When \u0434\u043B\u044F \u0443\u0441\u043B\u043E\u0432\u043D\u044B\u0445 \u043F\u043E\u043B\u0435\u0439",
    "",
    "\u0418\u043C\u043F\u043E\u0440\u0442\u044B:",
    "import { useAppForm } from '@lena/form-components'",
    "import { z } from 'zod/v4'"
  ].join("\n");
}

// src/cli.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
function resolveDocsPath() {
  if (process.env.FORM_MCP_DOCS_PATH) {
    return process.env.FORM_MCP_DOCS_PATH;
  }
  const bundledDocs = resolve(join2(__dirname, "docs"));
  if (existsSync2(bundledDocs)) {
    return bundledDocs;
  }
  return resolve(join2(__dirname, "..", "..", "form-components", "docs"));
}
var docsPath = resolveDocsPath();
var server = createFormMcpServer({
  docsPath,
  name: "@letar/form-mcp",
  version: "1.0.0"
});
var transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=cli.js.map