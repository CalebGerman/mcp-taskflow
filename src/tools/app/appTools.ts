/**
 * MCP App Tools Registration
 *
 * Registers tools for displaying tasks in an interactive UI.
 */

import type { McpServer } from '../../server/mcpServer.js';
import type { ServiceContainer } from '../../server/container.js';

/**
 * Register MCP App tools with the server
 *
 * This registers:
 * 1. A tool to display the interactive todo list
 * 2. The HTML resource that renders the UI
 *
 * @param server - MCP server instance
 * @param container - Service container with dependencies
 */
export function registerAppTools(server: McpServer, container: ServiceContainer): void {
  const logger = container.logger;

  try {
    // Register the show_todo_list tool using our server wrapper
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
        // The UI will display this data
        return JSON.stringify({ tasks }, null, 2);
      },
    });

    logger.info('MCP App show_todo_list tool registered successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to register MCP App tools');
    throw error;
  }
}
