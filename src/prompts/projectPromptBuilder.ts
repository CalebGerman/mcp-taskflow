/**
 * Prompt builders for project management tools.
 * Handles project rules and server information.
 *
 * @module prompts/projectPromptBuilder
 */

import { loadTemplate } from './templateLoader.js';
import { render } from './templateEngine.js';

export class InitProjectRulesPromptBuilder {
  async build(rulesPath: string, exists: boolean): Promise<string> {
    const template = await loadTemplate('initProjectRules/index.md');

    return render(template, {
      rulesPath,
      exists: exists ? 'true' : 'false',
      action: exists ? 'updated' : 'created'
    });
  }
}

export class GetServerInfoPromptBuilder {
  build(
    version: string,
    name: string,
    description: string
  ): string {
    // Simple response - no template needed for this one
    return `# MCP Task and Research Manager\n\n` +
           `**Name:** ${name}\n` +
           `**Version:** ${version}\n` +
           `**Description:** ${description}\n\n` +
           `This server provides task management and research tools for AI assistants.`;
  }
}
