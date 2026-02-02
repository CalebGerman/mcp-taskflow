/**
 * Prompt builder for research mode tool.
 * Generates prompts for iterative technical research workflows.
 *
 * @module prompts/researchPromptBuilder
 */

import { loadTemplate } from './templateLoader.js';
import { render } from './templateEngine.js';

export class ResearchModePromptBuilder {
  async build(
    topic: string,
    previousState: string,
    currentState: string,
    nextSteps: string
  ): Promise<string> {
    const template = await loadTemplate('researchMode/index.md');

    return render(template, {
      topic,
      previousState,
      currentState,
      nextSteps
    });
  }
}
