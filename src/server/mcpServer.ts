/**
 * MCP Server Setup & Tool Registration
 *
 * Implements the Model Context Protocol (MCP) server using @modelcontextprotocol/sdk.
 * The server uses STDIO transport for universal compatibility and follows the
 * JSON-RPC 2.0 protocol for request/response communication.
 *
 * Key Concepts:
 * - STDIO Transport: Uses stdin for input, stdout for output, stderr for logs
 * - JSON-RPC: Protocol for request correlation (id, method, params, result/error)
 * - Tool Discovery: Clients call tools/list to see available capabilities
 * - Stateless Design: Each request is independent (no session state)
 *
 * @see https://modelcontextprotocol.io/docs/concepts/architecture
 * @see https://www.jsonrpc.org/specification
 */

// Using Server from index.js instead of McpServer from mcp.js
// The new McpServer API is different and would require significant refactoring
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { ServiceContainer } from './container.js';
import type { Logger } from './logger.js';
import { registerTaskPlanningTools, registerTaskCRUDTools, registerTaskWorkflowTools } from '../tools/task/taskTools.js';
import { registerProjectTools } from '../tools/project/projectTools.js';
import { registerThoughtTools } from '../tools/thought/thoughtTools.js';
import { registerResearchTools } from '../tools/research/researchTools.js';

/**
 * MCP Server instance
 *
 * Manages the lifecycle of the MCP server including:
 * - Tool registration and discovery
 * - Request handling and routing
 * - Error handling and logging
 * - Graceful shutdown
 *
 * Dependencies are injected via the constructor (Dependency Injection pattern).
 */
export class McpServer {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  private readonly server: Server;
  private readonly logger: Logger;
  private readonly tools: Map<string, ToolHandler> = new Map();
  private readonly container: ServiceContainer;

  /**
   * Create a new MCP server instance
   *
   * @param container - Service container with all dependencies
   */
  constructor(container: ServiceContainer) {
    this.container = container;
    this.logger = container.logger;

    // Create MCP server with metadata
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    this.server = new Server(
      {
        name: 'taskflow-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {}, // Enables tool support
        },
      }
    );

    this.setupHandlers();
    this.logger.info('MCP server initialized');
  }

  /**
   * Setup request handlers
   *
   * Registers handlers for MCP protocol methods:
   * - tools/list: Returns available tools
   * - tools/call: Executes a specific tool
   */
  private setupHandlers(): void {
    // Handle tools/list - return all registered tools
    this.server.setRequestHandler(ListToolsRequestSchema, (_request: ListToolsRequest) => {
      this.logger.debug({ method: 'tools/list' }, 'Listing tools');

      const tools = Array.from(this.tools.values()).map((handler) => ({
        name: handler.name,
        description: handler.description,
        inputSchema: handler.inputSchema,
      }));

      return { tools };
    });

    // Handle tools/call - execute a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      this.logger.info({ tool: name }, 'Executing tool');

      const handler = this.tools.get(name);
      if (!handler) {
        const error = `Unknown tool: ${name}`;
        this.logger.error({ tool: name }, error);
        throw new Error(error);
      }

      try {
        const result = await handler.execute(args ?? {});

        this.logger.debug({ tool: name }, 'Tool executed successfully');

        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        this.logger.error({ tool: name, err: error }, 'Tool execution failed');

        // Re-throw as MCP error (JSON-RPC format)
        throw error;
      }
    });
  }

  /**
   * Register a tool with the server
   *
   * @param handler - Tool handler with name, description, schema, and execute function
   *
   * @example
   * ```typescript
   * server.registerTool({
   *   name: 'list_tasks',
   *   description: 'List all tasks',
   *   inputSchema: {
   *     type: 'object',
   *     properties: {
   *       status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] }
   *     }
   *   },
   *   execute: async (args) => {
   *     const tasks = await taskStore.listAsync();
   *     return { tasks };
   *   }
   * });
   * ```
   */
  registerTool(handler: ToolHandler): void {
    if (!handler.inputSchema?.type) {
      handler.inputSchema = {
        type: 'object',
        properties: handler.inputSchema?.properties,
        required: handler.inputSchema?.required,
      };
    }

    if (this.tools.has(handler.name)) {
      throw new Error(`Tool already registered: ${handler.name}`);
    }

    this.tools.set(handler.name, handler);
    this.logger.debug({ tool: handler.name }, 'Tool registered');
  }

  /**
   * Start the MCP server with STDIO transport
   *
   * The server will:
   * 1. Connect to stdin/stdout for communication
   * 2. Listen for initialize request from client
   * 3. Process tool/list and tools/call requests
   * 4. Handle graceful shutdown on SIGINT/SIGTERM
   *
   * @returns Promise that resolves when server starts
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();

    // Setup graceful shutdown
    const shutdown = () => {
      this.logger.info('Shutting down MCP server');
      void this.server.close().then(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    this.logger.info({ toolCount: this.tools.size }, 'Starting MCP server');

    // Connect and start processing requests
    await this.server.connect(transport);

    this.logger.info('MCP server ready');
  }

  /**
   * Get server instance (for testing)
   */
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  getServer(): Server {
    return this.server;
  }

  /**
   * Get the service container
   *
   * Provides access to all application services for tool implementations
   *
   * @returns The service container
   */
  getContainer(): ServiceContainer {
    return this.container;
  }

  /**
   * Get registered tool count (for testing)
   */
  getToolCount(): number {
    return this.tools.size;
  }
}

/**
 * Tool handler interface
 *
 * Defines the contract for MCP tools. Each tool must:
 * - Have a unique name
 * - Provide a human-readable description
 * - Define input schema (JSON Schema format)
 * - Implement execute function
 */
export interface ToolHandler {
  /**
   * Unique tool name (e.g., 'list_tasks', 'create_task')
   */
  name: string;

  /**
   * Human-readable description of what the tool does
   */
  description: string;

  /**
   * JSON Schema defining the tool's input parameters
   * @see https://json-schema.org/
   */
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };

  /**
   * Execute the tool with given arguments
   *
   * @param args - Tool arguments (validated against inputSchema by MCP SDK)
   * @returns Tool result (will be serialized to JSON)
   */
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Create and configure MCP server
 *
 * Factory function that creates a server instance and registers all tools.
 * Separates server creation from tool registration for testing.
 *
 * @returns Configured MCP server instance
 */
/**
 * Factory function to create a configured MCP server
 *
 * This is the main entry point for server creation. It accepts a
 * ServiceContainer with all dependencies already configured.
 *
 * @param container - Service container with all dependencies
 * @returns Configured MCP server ready to start
 *
 * @example
 * ```typescript
 * const container = createContainer();
 * const server = createMcpServer(container);
 * await server.start();
 * ```
 */
export function createMcpServer(container: ServiceContainer): McpServer {
  const server = new McpServer(container);

  // Register task planning tools
  registerTaskPlanningTools(server);
  registerTaskCRUDTools(server);
  registerTaskWorkflowTools(server);
  registerProjectTools(server);
  registerThoughtTools(server);
  registerResearchTools(server);

  return server;
}
