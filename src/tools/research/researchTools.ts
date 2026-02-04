/**
 * Research Tools Implementation
 *
 * Implements MCP tools for guided technical research workflows.
 *
 * Tools:
 * - research_mode: Iterative research with state management
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { McpServer } from '../../server/mcpServer.js';
import type { ServiceContainer } from '../../server/container.js';
import {
  ResearchModeParamsSchema,
  type ResearchModeParams,
} from '../../data/schemas.js';
import {
  ResearchModePromptBuilder,
} from '../../prompts/researchPromptBuilder.js';

/**
 * Register all research tools with the MCP server
 *
 * @param server - MCP server instance
 */
export function registerResearchTools(server: McpServer): void {
  const container = server.getContainer();

  registerResearchMode(server, container);
}

/**
 * Register research_mode tool
 */
function registerResearchMode(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'research_mode',
    description: 'Enter research mode to explore a programming topic in depth with iterative state tracking.',
    inputSchema: zodToJsonSchema(ResearchModeParamsSchema, { $refStrategy: 'none' }) as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = ResearchModeParamsSchema.parse(args) as ResearchModeParams;
      const { logger } = container;

      logger.info({ topic: params.topic }, 'Starting research mode');

      const isInitialIteration = !params.previousState || params.previousState.trim() === '';

      const builder = new ResearchModePromptBuilder();
      const result = await builder.build(
        params.topic,
        params.previousState,
        params.currentState,
        params.nextSteps
      );

      logger.info({ topic: params.topic, isInitial: isInitialIteration }, 'Research mode prompt generated');
      return result;
    },
  });
}
