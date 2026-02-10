/**
 * MCP App Tools Registration
 *
 * Registers tools and resources for displaying tasks in an interactive UI.
 * Implements MCP Apps protocol without using Ext-Apps SDK due to API incompatibility.
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { McpServer } from '../../server/mcpServer.js';
import type { ServiceContainer } from '../../server/container.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * URI for the todo list UI resource
 */
const TODO_UI_URI = 'ui://taskflow/todo';

/**
 * MIME type for MCP App resources
 */
const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * Register MCP App tools with the server
 *
 * This registers:
 * 1. A tool to display the interactive todo list with UI metadata
 * 2. The HTML resource that renders the UI
 *
 * Note: This implementation uses our custom server wrapper's registration methods
 * instead of ext-apps SDK due to API version incompatibility (Server vs McpServer).
 *
 * @param server - MCP server instance
 * @param container - Service container with dependencies
 */
export function registerAppTools(server: McpServer, container: ServiceContainer): void {
  const logger = container.logger;

  try {
    // Register the show_todo_list tool with UI metadata
    server.registerTool({
      name: 'show_todo_list',
      description: 'Display an interactive todo list UI showing all tasks from mcp-taskflow',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        // Fetch tasks from the task store
        const tasks = await container.taskStore.getAllAsync();

        logger.info({ taskCount: tasks.length }, 'Displaying todo list');

        // Return task data in the response
        // The UI will receive and display this data
        return JSON.stringify({ tasks }, null, 2);
      },
      // MCP Apps metadata - indicates this tool has a UI
      _meta: {
        ui: {
          resourceUri: TODO_UI_URI,
        },
      },
    });

    // Register the HTML resource for the UI
    // Using our server's resource registration (note: may need server update to support this)
    server.registerResource({
      name: 'Todo List UI',
      uri: TODO_UI_URI,
      description: 'Interactive todo list displaying tasks from mcp-taskflow',
      mimeType: RESOURCE_MIME_TYPE,
      read: async () => {
        // Read the built UI HTML file
        const uiPath = join(__dirname, '..', '..', '..', 'dist', 'ui', 'index.html');
        
        let htmlContent: string;
        try {
          htmlContent = await readFile(uiPath, 'utf-8');
        } catch (error) {
          logger.error({ err: error, uiPath }, 'Failed to read UI HTML file');
          throw new Error(
            `UI build not found at ${uiPath}. Please run: pnpm run build:ui`
          );
        }

        return htmlContent;
      },
    });

    logger.info('MCP App tools and resources registered successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to register MCP App tools');
    throw error;
  }
}
