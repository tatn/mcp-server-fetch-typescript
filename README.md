# mcp-server-fetch-typescript MCP Server

A Model Context Protocol server that provides web content fetching and conversion capabilities. This server implements a comprehensive web content retrieval system with support for various formats and rendering methods, making it ideal for tasks ranging from simple data extraction to sophisticated web scraping.

<a href="https://glama.ai/mcp/servers/iyfpvfkgyx"><img width="380" height="200" src="https://glama.ai/mcp/servers/iyfpvfkgyx/badge" alt="Server Fetch TypeScript MCP server" /></a>

## Features

### Tools

- `get_raw_text` - Retrieve raw text content directly from URLs
  - Takes `url` as a required parameter pointing to text-based resources
  - Returns unprocessed text content without browser rendering
  - Ideal for JSON, XML, CSV, TSV, or plain text files
  - Best used when fast, direct access to source content is needed

- `get_rendered_html` - Fetch fully rendered HTML content
  - Takes `url` as a required parameter
  - Returns complete HTML content after JavaScript execution
  - Uses Playwright for headless browser rendering
  - Essential for modern web applications and SPAs

- `get_markdown` - Convert web content to Markdown format
  - Takes `url` as a required parameter
  - Returns well-formatted Markdown preserving structural elements
  - Supports tables and definition lists
  - Recommended for content archiving and documentation

- `get_markdown_summary` - Extract and convert main content
  - Takes `url` as a required parameter
  - Returns clean Markdown focusing on main content
  - Automatically removes navigation, headers, footers
  - Perfect for article and blog post extraction

## Installation

### As a Global Package

```bash
npm install -g mcp-server-fetch-typescript
```

### As a Project Dependency

```bash
npm install mcp-server-fetch-typescript
```

## Usage

### Using with Claude Desktop

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`  
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
"mcpServers": {
  "mcp-server-fetch-typescript": {
    "command": "npx",
    "args": [
      "-y",
      "mcp-server-fetch-typescript"
    ]
  }
}
```

or Add the following configuration:

```bash
git clone https://github.com/tatn/mcp-server-fetch-typescript.git
cd mcp-server-fetch-typescript
npm install
npm run build
```

```json
"mcpServers": {
  "mcp-server-fetch-typescript": {
    "command": "node",
    "args": [
      "/path/to/mcp-server-fetch-typescript/build/index.js"
    ]
  }
}
```

### Debugging

To debug the MCP server:

```bash
npx @modelcontextprotocol/inspector npx -y mcp-server-fetch-typescript
```

```bash
npx @modelcontextprotocol/inspector node /path/to/mcp-server-fetch-typescript/build/index.js
```


