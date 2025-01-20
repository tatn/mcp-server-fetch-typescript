#!/usr/bin/env node

/**
 * This MCP server implements web content fetching and conversion functionality.
 * It provides tools for:
 * - Fetching raw text content from URLs
 * - Getting rendered HTML content with JavaScript execution
 * - Converting web content to Markdown format
 * - Extracting main content from web pages
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import axios from 'axios';
import { Browser, chromium } from 'playwright';
import Turndown from 'turndown';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import type { TranslatorConfigObject } from 'node-html-markdown';

/**
 * Create an MCP server with capabilities for web content fetching tools.
 * The server provides various tools for fetching and converting web content
 * in different formats including raw text, rendered HTML, and Markdown.
 */
const server = new Server(
  {
    name: "mcp-server-fetch-typescript",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

const TIMEOUT = 20000;

/**
 * Handler that lists available web content fetching tools.
 * Exposes multiple tools for fetching and converting web content
 * in various formats including raw text, rendered HTML, and Markdown.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_raw_text",
        description: "Retrieves raw text content directly from a URL without browser rendering. Ideal for structured data formats like JSON, XML, CSV, TSV, or plain text files. Best used when fast, direct access to the source content is needed without processing dynamic elements.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of the target resource containing raw text content (JSON, XML, CSV, TSV, plain text, etc.)."
            }
          },
          required: ["url"]
        }
      },
      {
        name: "get_rendered_html",
        description: "Fetches fully rendered HTML content using a headless browser, including JavaScript-generated content. Essential for modern web applications, single-page applications (SPAs), or any content that requires client-side rendering to be complete.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of the target web page that requires JavaScript execution or dynamic content rendering."
            }
          },
          required: ["url"]
        }
      },
      {
        name: "get_markdown",
        description: "Converts web page content to well-formatted Markdown, preserving structural elements like tables and definition lists. Recommended as the default tool for web content extraction when a clean, readable text format is needed while maintaining document structure.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of the web page to convert to Markdown format, supporting various HTML elements and structures."
            }
          },
          required: ["url"]
        }
      },
      {
        name: "get_markdown_summary",
        description: "Extracts and converts the main content area of a web page to Markdown format, automatically removing navigation menus, headers, footers, and other peripheral content. Perfect for capturing the core content of articles, blog posts, or documentation pages.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of the web page whose main content should be extracted and converted to Markdown."
            }
          },
          required: ["url"]
        }
      },
    ]
  };
});

/**
 * Handler for web content fetching tools.
 * Processes requests to fetch and convert web content based on the specified tool
 * and returns the content in the requested format.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const url = String(request.params.arguments?.url);

  if (!url) {
    throw new Error("url is required !");
  }

  switch (request.params.name) {
    case "get_raw_text": {
      return {
        content: [{
          type: "text",
          text: (await getRawTextString(url))
        }]
      };
    }
    case "get_rendered_html": {
      return {
        content: [{
          type: "text",
          text: (await getHtmlString(url))
        }]
      };
    }
    case "get_markdown": {
      return {
        content: [{
          type: "text",
          text: (await getMarkdownStringFromHtmlByNHM(url))
        }]
      };
    }
    case "get_markdown_summary": {
      return {
        content: [{
          type: "text",
          text: (await getMarkdownStringFromHtmlByTD(url, true))
        }]
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});


// Helper method to fetch raw text content from a URL
export async function getRawTextString(request_url: string) {
  const response = await axios.get(request_url);
  const data = response.data;
  return data;
}

// Helper method to fetch rendered HTML content using a headless browser
export async function getHtmlString(request_url: string) {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      args: ['--single-process'],
      headless: true,
    });
    const page = await browser.newPage();
    await page.goto(request_url, { timeout: TIMEOUT });
    const htmlString = await page.content();
    return htmlString;
  } finally {
    try {
      if (browser) {
        await browser.close();
      }
    } catch (error) {
      console.error('error:', error);
    }
  }
}

// Helper method to convert HTML to Markdown using Turndown with custom rules for tables and definition lists
export async function getMarkdownStringFromHtmlByTD(
  request_url: string,
  mainOnly: boolean = false,
) {
  const htmlString = await getHtmlString(request_url);

  const turndownService = new Turndown({ headingStyle: 'atx' });
  turndownService.remove('script');
  turndownService.remove('style');

  if (mainOnly) {
    turndownService.remove('header');
    turndownService.remove('footer');
    turndownService.remove('nav');
  }

  turndownService.addRule('table', {
    filter: 'table',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    replacement: function (content, node, _options) {
      // Process each row in the table
      const rows = Array.from(node.querySelectorAll('tr'));
      if (rows.length === 0) {
        return '';
      }
      const headerRow = rows[0];
      const headerCells = Array.from(
        headerRow.querySelectorAll('th, td'),
      ).map((cell) => cell.textContent?.trim() || '');
      const separator = headerCells.map(() => '---').join('|');
      // Header row and separator line
      let markdown = `\n| ${headerCells.join(' | ')} |\n|${separator}|`;
      // Process remaining rows
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowCells = Array.from(row.querySelectorAll('th, td')).map(
          (cell) => cell.textContent?.trim() || '',
        );
        markdown += `\n| ${rowCells.join(' | ')} |`;
      }
      return markdown + '\n';
    },
  });

  turndownService.addRule('dl', {
    filter: 'dl',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    replacement: function (content, node, _options) {
      let markdown = '\n\n';
      const items = Array.from(node.children);

      let currentDt: string = '';
      items.forEach((item) => {
        if (item.tagName === 'DT') {
          currentDt = item.textContent?.trim() || '';
          if (currentDt) {
            markdown += `**${currentDt}:**`;
          }
        } else if (item.tagName === 'DD') {
          const ddContent = item.textContent?.trim() || '';
          if (ddContent) {
            markdown += ` ${ddContent}\n`;
          }
        }
      });
      return markdown + '\n';
    },
  });

  const markdownString = turndownService.turndown(htmlString);

  return markdownString;
}

// Helper method to convert HTML to Markdown using NodeHtmlMarkdown with custom translators for special elements
export async function getMarkdownStringFromHtmlByNHM(
  request_url: string,
  mainOnly: boolean = false,
) {
  const htmlString = await getHtmlString(request_url);

  const customTranslators: TranslatorConfigObject = {
    dl: () => ({
      preserveWhitespace: false,
      surroundingNewlines: true,
    }),
    dt: () => ({
      prefix: '**',
      postfix: ':** ',
      surroundingNewlines: false,
    }),
    dd: () => ({
      postfix: '\n',
      surroundingNewlines: false,
    }),
    Head: () => ({
      postfix: '\n',
      ignore: false,
      postprocess: (ctx) => {
        const titleNode = ctx.node.querySelector('title');
        if (titleNode) {
          return titleNode.textContent || '';
        }
        return '';
      },
      surroundingNewlines: true,
    }),
  };

  if (mainOnly) {
    customTranslators.Header = () => ({
      ignore: true,
    });
    customTranslators.Footer = () => ({
      ignore: true,
    });
    customTranslators.Nav = () => ({
      ignore: true,
    });
  }

  const markdownString = NodeHtmlMarkdown.translate(
    htmlString,
    {},
    customTranslators,
  );

  return markdownString;
}

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});


