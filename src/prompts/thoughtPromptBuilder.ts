/**
 * Prompt builder for structured thinking tool (process_thought).
 * Supports metacognitive reasoning and chain-of-thought processing.
 *
 * @module prompts/thoughtPromptBuilder
 */

import { loadTemplate } from './templateLoader.js';
import { render } from './templateEngine.js';

export class ProcessThoughtPromptBuilder {
  async build(
    thought: string,
    thoughtNumber: number,
    totalThoughts: number,
    stage: string,
    nextThoughtNeeded: boolean,
    tags?: string[],
    axiomsUsed?: string[],
    assumptionsChallenged?: string[]
  ): Promise<string> {
    const template = await loadTemplate('processThought/index.md');

    return render(template, {
      thought,
      thoughtNumber,
      totalThoughts,
      stage,
      nextThoughtNeeded: nextThoughtNeeded ? 'yes' : 'no',
      tags: tags ? tags.join(', ') : 'none',
      axioms: axiomsUsed ? this.formatList(axiomsUsed) : 'none',
      assumptions: assumptionsChallenged ? this.formatList(assumptionsChallenged) : 'none'
    });
  }

  private formatList(items: string[]): string {
    if (items.length === 0) {
      return 'none';
    }
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  }
}
