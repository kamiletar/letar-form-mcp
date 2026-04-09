# @letar/form-mcp

MCP (Model Context Protocol) server for [@letar/forms](https://www.npmjs.com/package/@letar/forms) — gives AI assistants full context about **56 declarative form field components**, form patterns, and ZenStack code generation directives.

[![npm version](https://img.shields.io/npm/v/@letar/form-mcp)](https://www.npmjs.com/package/@letar/form-mcp)
[![license](https://img.shields.io/npm/l/@letar/form-mcp)](./LICENSE)

📖 [Forms Documentation](https://forms.letar.best) · 🎮 [Live Examples](https://forms-example.letar.best) · 📦 [@letar/forms](https://www.npmjs.com/package/@letar/forms)

[Документация на русском](./README.ru.md)

## Quick Start

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "form-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@letar/form-mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "form-mcp": {
      "command": "npx",
      "args": ["-y", "@letar/form-mcp"]
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "form-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@letar/form-mcp"]
    }
  }
}
```

## What It Provides

### Tools (6)

| Tool                | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `list_fields`       | List all 56 field types with optional category filter         |
| `get_field_props`   | Get props, description, and docs for a specific field         |
| `get_field_example` | Get TSX code example for a field component                    |
| `get_form_pattern`  | Get complete form examples: CRUD, multi-step, offline, i18n   |
| `get_directives`    | Get @form.* directive docs for zenstack-form-plugin           |
| `generate_form`     | Generate form code from a field specification                 |

### Resources (7)

Documentation available via `form-docs://` URIs:

- `form-docs://fields` — 56 field component reference
- `form-docs://form-level` — Form.Steps, Form.When, Form.Errors, etc.
- `form-docs://schema-generation` — FromSchema, AutoFields, Builder
- `form-docs://offline` — useOfflineForm, sync queue
- `form-docs://i18n` — FormI18nProvider, localized errors
- `form-docs://zenstack` — ZenStack integration, @form.* directives
- `form-docs://api-reference` — Hooks, contexts, types

### Prompts (3)

| Prompt         | Description                                     |
| -------------- | ----------------------------------------------- |
| `create-form`  | Template for generating a CRUD form             |
| `add-field`    | Add a field to an existing form                 |
| `migrate-form` | Migrate from React Hook Form / Formik / Conform |

## Field Categories

| Category         | Fields                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| **Text**         | String, Textarea, Password, PasswordStrength, Editable, RichText                                              |
| **Number**       | Number, NumberInput, Slider, Rating, Currency, Percentage                                                     |
| **Date**         | Date, Time, DateRange, DateTimePicker, Duration, Schedule                                                     |
| **Select**       | Select, NativeSelect, CascadingSelect, Combobox, Autocomplete, Listbox, RadioGroup, RadioCard, SegmentedGroup |
| **Multi-select** | Checkbox, CheckboxCard, Switch, Tags                                                                          |
| **Special**      | Auto, PinInput, OTPInput, ColorPicker, FileUpload, Phone, MaskedInput, Address, Signature, CreditCard         |

## Related

- [@letar/forms](https://www.npmjs.com/package/@letar/forms) — the form component library (56 fields, offline, analytics, testing utilities)
- [@letar/zenstack-form-plugin](https://www.npmjs.com/package/@letar/zenstack-form-plugin) — ZenStack schema-to-form generator
- [forms-example.letar.best](https://forms-example.letar.best) — live interactive examples
