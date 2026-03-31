#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createFormMcpServer } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Порядок поиска docs/:
// 1. FORM_MCP_DOCS_PATH env — явно указанный путь
// 2. ./docs/ — bundled в npm пакете (dist/docs/)
// 3. ../../form-components/docs — локально в монорепо
function resolveDocsPath(): string {
  if (process.env.FORM_MCP_DOCS_PATH) {
    return process.env.FORM_MCP_DOCS_PATH
  }
  // npm пакет: docs/ лежит рядом с cli.js
  const bundledDocs = resolve(join(__dirname, 'docs'))
  if (existsSync(bundledDocs)) {
    return bundledDocs
  }
  // Монорепо: docs/ в form-components
  return resolve(join(__dirname, '..', '..', 'form-components', 'docs'))
}

const docsPath = resolveDocsPath()

const server = createFormMcpServer({
  docsPath,
  name: '@letar/form-mcp',
  version: '1.0.0',
})

const transport = new StdioServerTransport()
await server.connect(transport)
