/**
 * Thought Tools Implementation
 *
 * Implements MCP tools for structured thinking and reasoning processes.
 *
 * Tools:
 * - process_thought: Record and structure reasoning steps
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { McpServer } from '../../server/mcpServer.js';
import type { ServiceContainer } from '../../server/container.js';
import {
  ProcessThoughtParamsSchema,
  type ProcessThoughtParams,
} from '../../data/schemas.js';
import {
  ProcessThoughtPromptBuilder,
} from '../../prompts/thoughtPromptBuilder.js';

/**
 * Register all thought tools with the MCP server
 *
 * @param server - MCP server instance
 */
export function registerThoughtTools(server: McpServer): void {
  const container = server.getContainer();

  registerProcessThought(server, container);
}

/**
 * Register process_thought tool
 */
function registerProcessThought(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'process_thought',
    description: 'Record a structured thought step in a reasoning process with stage tracking.',
    inputSchema: zodToJsonSchema(ProcessThoughtParamsSchema, 'ProcessThoughtParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = ProcessThoughtParamsSchema.parse(args) as ProcessThoughtParams;
      const { logger } = container;

      logger.info({
        thoughtNumber: params.thoughtNumber,
        totalThoughts: params.totalThoughts,
        stage: params.stage,
      }, 'Processing thought');

      const builder = new ProcessThoughtPromptBuilder();
      const result = await builder.build(
        params.thought,
        params.thoughtNumber,
        params.totalThoughts,
        params.stage,
        params.nextThoughtNeeded,
        params.tags ?? undefined,
        params.axiomsUsed ?? undefined,
        params.assumptionsChallenged ?? undefined
      );

      logger.info({
        thoughtNumber: params.thoughtNumber,
        nextNeeded: params.nextThoughtNeeded,
      }, 'Thought processed');

      return result;
    },
  });
}
