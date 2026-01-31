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

import { configureTestLogger, getLogger } from './server/logger.js';
import { createMcpServer } from './server/mcpServer.js';

/**
 * Main entry point
 *
 * Handles server lifecycle:
 * 1. Configure logging (silent in production, verbose in dev)
 * 2. Create and configure MCP server
 * 3. Start STDIO transport
 * 4. Handle uncaught errors gracefully
 */
async function main(): Promise<void> {
  // Configure logging - in production, only log errors to stderr
  // In development, log to stderr with pretty formatting
  const isProduction = process.env['NODE_ENV'] === 'production';
  if (isProduction && !process.env['LOG_LEVEL']) {
    configureTestLogger(); // Silent mode
  }

  const logger = getLogger();

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

    // Create and start server
    const server = createMcpServer();
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
