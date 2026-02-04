/**
 * Project Tools Implementation
 *
 * Implements MCP tools for project rules management and server metadata.
 *
 * Tools:
 * - init_project_rules: Initialize or update project coding rules
 * - get_server_info: Return server metadata and health status
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { McpServer } from '../../server/mcpServer.js';
import type { ServiceContainer } from '../../server/container.js';
import {
  InitProjectRulesParamsSchema,
  GetServerInfoParamsSchema,
} from '../../data/schemas.js';
import {
  InitProjectRulesPromptBuilder,
  GetServerInfoPromptBuilder,
} from '../../prompts/projectPromptBuilder.js';

/**
 * Register all project tools with the MCP server
 *
 * @param server - MCP server instance
 */
export function registerProjectTools(server: McpServer): void {
  const container = server.getContainer();

  registerInitProjectRules(server, container);
  registerGetServerInfo(server, container);
}

/**
 * Register init_project_rules tool
 */
function registerInitProjectRules(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'init_project_rules',
    description: 'Initialize or update project coding rules and guidelines.',
    inputSchema: zodToJsonSchema(InitProjectRulesParamsSchema, { $refStrategy: 'none' }) as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (_args: unknown) => {
      const { rulesStore, logger } = container;

      logger.info('Initializing project rules');

      const rulesExist = await rulesStore.rulesExistAsync();

      if (!rulesExist) {
        await rulesStore.initializeRulesAsync();
        logger.info('Created default project rules');
      }

      const rules = await rulesStore.loadRulesAsync();
      const builder = new InitProjectRulesPromptBuilder();
      const result = await builder.build(rules, rulesExist);

      logger.info({ rulesExist }, 'Project rules initialized');
      return result;
    },
  });
}

/**
 * Register get_server_info tool
 */
function registerGetServerInfo(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'get_server_info',
    description: 'Get server metadata, version, and health status.',
    inputSchema: zodToJsonSchema(GetServerInfoParamsSchema, { $refStrategy: 'none' }) as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (_args: unknown) => {
      const { taskStore, logger } = container;

      logger.info('Getting server info');

      const allTasks = await taskStore.getAllAsync();
      const taskCounts = {
        pending: allTasks.filter(t => t.status === 'pending').length,
        in_progress: allTasks.filter(t => t.status === 'in_progress').length,
        completed: allTasks.filter(t => t.status === 'completed').length,
        blocked: allTasks.filter(t => t.status === 'blocked').length,
        total: allTasks.length,
      };

      const builder = new GetServerInfoPromptBuilder();
      const result = builder.build(
        '1.0.0',
        'taskflow-mcp',
        'MCP Task and Research Manager - Task planning, analysis, and research workflow tools'
      );

      logger.info(taskCounts, 'Server info retrieved');
      return result;
    },
  });
}
