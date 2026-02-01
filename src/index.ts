#!/usr/bin/env node
/**
 * Entry Point for MCP Task and Research Server
 *
 * This file serves as the main entry point for the MCP server.
 * It handles:
 * - Environment configuration (DATA_DIR, LOG_LEVEL, NODE_ENV)
 * - Server initialization and startup
 * - Global error handling
 * - Process lifecycle management
 *
 * The server uses STDIO transport, so:
 * - stdin: Receives JSON-RPC requests from MCP client
 * - stdout: Sends JSON-RPC responses to MCP client
 * - stderr: Logs (don't pollute stdout!)
 *
 * Environment Variables:
 * - DATA_DIR: Directory for task data (default: .mcp-tasks in workspace)
 * - LOG_LEVEL: Log verbosity (trace, debug, info, warn, error)
 * - NODE_ENV: Environment (development, production)
 */

import { getLogger } from './server/logger.js';
import { createMcpServer } from './server/mcpServer.js';
import { initializeGlobalContainer } from './server/container.js';
import pino from 'pino';

/**
 * Main entry point
 *
 * Handles server lifecycle:
 * 1. Configure logging (silent in production, verbose in dev)
 * 2. Initialize dependency injection container
 * 3. Create and configure MCP server
 * 4. Start STDIO transport
 * 5. Handle uncaught errors gracefully
 */
async function main(): Promise<void> {
  const isProduction = process.env['NODE_ENV'] === 'production';

  let logger = getLogger();
  if (isProduction && !process.env['LOG_LEVEL']) {
    logger = pino({ level: 'error' });
  }

  try {
    // Log startup (to stderr, won't interfere with STDIO transport)
    logger.info(
      {
        nodeVersion: process.version,
        platform: process.platform,
        dataDir: process.env['DATA_DIR'] ?? '.mcp-tasks',
      },
      'Starting MCP Task and Research Server'
    );

    // Initialize dependency injection container
    // This is the "Composition Root" - where all services are wired together
    const container = initializeGlobalContainer({
      dataDir: process.env['DATA_DIR'],
    });

    // Create and start server with container
    const server = createMcpServer(container);
    await server.start();

    // Server is now running and processing requests via STDIO
    // It will continue until SIGINT/SIGTERM is received
  } catch (error) {
    logger.error({ err: error }, 'Failed to start MCP server');
    process.exit(1);
  }
}

/**
 * Global error handlers
 *
 * Ensures that uncaught errors are logged before process termination
 * This prevents silent failures in production
 */
process.on('uncaughtException', (error: Error) => {
  const logger = getLogger();
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const logger = getLogger();
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

// Start the server
main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
