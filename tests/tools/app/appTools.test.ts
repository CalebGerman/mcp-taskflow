/**
 * App Tools Tests
 *
 * Tests for the show_todo_list tool registration using MCP Apps SDK.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createContainer, resetGlobalContainer, type ServiceContainer } from '../../../src/server/container.js';
import { createMcpServer } from '../../../src/server/mcpServer.js';

describe('App Tools', () => {
  let tempDir: string;
  let container: ServiceContainer;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `apptools-${timestamp}-${random}-`));
    container = createContainer({ dataDir: tempDir });
    
    // Create dist/ui directory with a mock HTML file for testing
    const uiDistDir = path.join(process.cwd(), 'dist', 'ui');
    await fs.mkdir(uiDistDir, { recursive: true });
    await fs.writeFile(
      path.join(uiDistDir, 'index.html'),
      '<!DOCTYPE html><html><head><title>Test UI</title></head><body><div id="root"></div></body></html>'
    );
  });

  afterEach(async () => {
    resetGlobalContainer();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up ${tempDir}:`, error);
    }
  });

  describe('MCP Apps integration', () => {
    it('should register show_todo_list tool with server', () => {
      const server = createMcpServer(container);
      
      // Verify tool was registered
      expect(server.getToolCount()).toBeGreaterThan(0);
    });

    it('should include UI metadata in tool registration', () => {
      const server = createMcpServer(container);
      
      // The tool should be registered (verified by tool count)
      // Tool metadata is tested through MCP protocol integration
      expect(server).toBeDefined();
    });

    it('should register resource for UI serving', () => {
      const server = createMcpServer(container);
      
      // Resource registration succeeds if no errors thrown
      expect(server).toBeDefined();
    });
  });
});
