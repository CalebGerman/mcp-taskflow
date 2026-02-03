/**
 * Tests for the template engine
 */

import { describe, it, expect } from 'vitest';
import { render, TemplateEngine, defaultEngine } from '../../src/prompts/templateEngine.js';

describe('render()', () => {
  describe('Basic Functionality', () => {
    it('should replace {{key}} tokens with values', () => {
      const template = 'Hello {{name}}!';
      const result = render(template, { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should replace {{ key }} tokens with spaces', () => {
      const template = 'Hello {{ name }}!';
      const result = render(template, { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should replace {key} single-brace tokens', () => {
      const template = 'Hello {name}!';
      const result = render(template, { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should handle multiple tokens in one template', () => {
      const template = '{{greeting}} {{name}}, you have {{count}} messages!';
      const result = render(template, {
        greeting: 'Hello',
        name: 'Alice',
        count: 5
      });
      expect(result).toBe('Hello Alice, you have 5 messages!');
    });

    it('should handle mixed token formats', () => {
      const template = '{{name}} - {{ age }} - {city}';
      const result = render(template, {
        name: 'Bob',
        age: 30,
        city: 'NYC'
      });
      expect(result).toBe('Bob - 30 - NYC');
    });

    it('should return template unchanged when no parameters', () => {
      const template = 'Hello {{name}}!';
      expect(render(template)).toBe('Hello {{name}}!');
      expect(render(template, null)).toBe('Hello {{name}}!');
      expect(render(template, {})).toBe('Hello {{name}}!');
    });

    it('should leave unreplaced tokens as-is', () => {
      const template = 'Hello {{name}}, {{missing}} token!';
      const result = render(template, { name: 'World' });
      expect(result).toBe('Hello World, {{missing}} token!');
    });
  });

  describe('Data Type Handling', () => {
    it('should convert numbers to strings', () => {
      const template = 'Count: {{count}}';
      const result = render(template, { count: 42 });
      expect(result).toBe('Count: 42');
    });

    it('should convert booleans to strings', () => {
      const template = 'Enabled: {{enabled}}';
      expect(render(template, { enabled: true })).toBe('Enabled: true');
      expect(render(template, { enabled: false })).toBe('Enabled: false');
    });

    it('should handle arrays by calling toString()', () => {
      const template = 'Items: {{items}}';
      const result = render(template, { items: [1, 2, 3] });
      expect(result).toBe('Items: 1,2,3');
    });

    it('should handle objects by calling toString()', () => {
      const template = 'User: {{user}}';
      const result = render(template, { user: { name: 'Alice' } });
      expect(result).toBe('User: [object Object]');
    });

    it('should render custom toString() implementations', () => {
      class CustomObject {
        toString() {
          return 'CustomValue';
        }
      }
      const template = 'Custom: {{obj}}';
      const result = render(template, { obj: new CustomObject() });
      expect(result).toBe('Custom: CustomValue');
    });
  });

  describe('Null safety', () => {
    it('should replace null values with empty string', () => {
      const template = 'Hello {{name}}!';
      const result = render(template, { name: null });
      expect(result).toBe('Hello !');
    });

    it('should replace undefined values with empty string', () => {
      const template = 'Hello {{name}}!';
      const result = render(template, { name: undefined });
      expect(result).toBe('Hello !');
    });

    it('should handle mix of null, undefined, and valid values', () => {
      const template = '{{a}}-{{b}}-{{c}}-{{d}}';
      const result = render(template, {
        a: 'one',
        b: null,
        c: undefined,
        d: 'four'
      });
      expect(result).toBe('one---four');
    });
  });

  describe('Input validation', () => {
    it('should throw TypeError for non-string template', () => {
      expect(() => render(null as any)).toThrow(TypeError);
      expect(() => render(undefined as any)).toThrow(TypeError);
      expect(() => render(42 as any)).toThrow(TypeError);
      expect(() => render({} as any)).toThrow(TypeError);
      expect(() => render([] as any)).toThrow(TypeError);
    });

    it('should have descriptive error message', () => {
      expect(() => render(42 as any)).toThrow(
        'Template must be a string, got number'
      );
    });

    it('should accept empty string template', () => {
      expect(render('')).toBe('');
      expect(render('', { key: 'value' })).toBe('');
    });
  });

  describe('Code execution prevention', () => {
    it('should NOT execute code in templates', () => {
      const template = '{{code}}';
      const result = render(template, { code: 'alert("XSS")' });
      expect(result).toBe('alert("XSS")'); // Rendered as string, NOT executed
    });

    it('should NOT interpret template expressions', () => {
      const template = '{{expr}}';
      const result = render(template, { expr: '{{nested}}' });
      expect(result).toBe('{{nested}}'); // Not re-evaluated
    });

    it('should safely handle special characters', () => {
      const template = 'Value: {{value}}';
      const result = render(template, {
        value: '<script>alert("xss")</script>'
      });
      // No escaping - this is markdown for LLMs, not HTML for browsers
      expect(result).toBe('Value: <script>alert("xss")</script>');
    });
  });

  describe('Performance - No ReDoS Vulnerability', () => {
    it('should handle large templates efficiently', () => {
      const largeTemplate = 'x'.repeat(100_000) + '{{key}}' + 'y'.repeat(100_000);
      const start = performance.now();
      const result = render(largeTemplate, { key: 'value' });
      const duration = performance.now() - start;

      expect(result).toContain('value');
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should handle many parameters efficiently', () => {
      const params: Record<string, number> = {};
      let template = '';

      // Create 1000 unique parameters
      for (let i = 0; i < 1000; i++) {
        params[`key${i}`] = i;
        template += `{{key${i}}},`;
      }

      const start = performance.now();
      const result = render(template, params);
      const duration = performance.now() - start;

      expect(result).toContain('0,');
      expect(result).toContain('999,');
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle repeated tokens', () => {
      const template = '{{x}} {{x}} {{x}}';
      const result = render(template, { x: 'A' });
      expect(result).toBe('A A A');
    });

    it('should handle adjacent tokens', () => {
      const template = '{{a}}{{b}}{{c}}';
      const result = render(template, { a: '1', b: '2', c: '3' });
      expect(result).toBe('123');
    });

    it('should handle tokens at start and end', () => {
      const template = '{{start}}middle{{end}}';
      const result = render(template, { start: 'A', end: 'B' });
      expect(result).toBe('AmiddleB');
    });

    it('should handle empty parameter values', () => {
      const template = '{{a}}-{{b}}-{{c}}';
      const result = render(template, { a: '', b: 'X', c: '' });
      expect(result).toBe('-X-');
    });

    it('should preserve whitespace', () => {
      const template = '  {{key}}  \n  {{key}}  ';
      const result = render(template, { key: 'value' });
      expect(result).toBe('  value  \n  value  ');
    });

    it('should handle special regex characters in keys', () => {
      const template = '{{$key}} {{key.name}} {{key[0]}}';
      const result = render(template, {
        '$key': 'A',
        'key.name': 'B',
        'key[0]': 'C'
      });
      expect(result).toBe('A B C');
    });
  });

  describe('Real-world Templates (compatibility)', () => {
    it('should render task list template', () => {
      const template = `### {name}

**ID:** \`{id}\`

**Description:** {description}

**Dependencies:** {dependencies}

**Creation Time:** {createAt}`;

      const result = render(template, {
        name: 'Deploy Feature',
        id: 'abc-123',
        description: 'Deploy the new feature to production',
        dependencies: 'task-1, task-2',
        createAt: 'Monday, 19 January 2026 11:30'
      });

      expect(result).toContain('### Deploy Feature');
      expect(result).toContain('**ID:** `abc-123`');
      expect(result).toContain('Deploy the new feature to production');
    });

    it('should render nested template composition', () => {
      // Compose partials manually
      const notesTemplate = '**Notes:** {notes}';
      const notesRendered = render(notesTemplate, { notes: 'Important task' });

      const mainTemplate = `# Task

{notesTemplate}

## End`;
      const result = render(mainTemplate, { notesTemplate: notesRendered });

      expect(result).toContain('**Notes:** Important task');
    });
  });
});

describe('TemplateEngine class', () => {
  describe('render() method', () => {
    it('should render templates', () => {
      const engine = new TemplateEngine();
      const result = engine.render('Hello {{name}}!', { name: 'World' });
      expect(result).toBe('Hello World!');
    });
  });

  describe('renderBatch() method', () => {
    it('should render multiple templates in sequence', () => {
      const engine = new TemplateEngine();
      const results = engine.renderBatch([
        { template: 'Name: {{name}}', parameters: { name: 'Alice' } },
        { template: 'Age: {{age}}', parameters: { age: 30 } },
        { template: 'City: {{city}}', parameters: { city: 'NYC' } }
      ]);

      expect(results).toEqual([
        'Name: Alice',
        'Age: 30',
        'City: NYC'
      ]);
    });

    it('should handle templates without parameters', () => {
      const engine = new TemplateEngine();
      const results = engine.renderBatch([
        { template: 'Static text' },
        { template: 'Name: {{name}}', parameters: { name: 'Bob' } }
      ]);

      expect(results).toEqual([
        'Static text',
        'Name: Bob'
      ]);
    });

    it('should handle empty batch', () => {
      const engine = new TemplateEngine();
      const results = engine.renderBatch([]);
      expect(results).toEqual([]);
    });
  });
});

describe('defaultEngine', () => {
  it('should provide a ready-to-use engine instance', () => {
    const result = defaultEngine.render('Test {{value}}', { value: '123' });
    expect(result).toBe('Test 123');
  });

  it('should be a TemplateEngine instance', () => {
    expect(defaultEngine).toBeInstanceOf(TemplateEngine);
  });
});

describe('Template Injection Prevention (Security Audit)', () => {
  describe('SSTI Attack Patterns', () => {
    it('should NOT evaluate expressions', () => {
      const template = '{{expr}}';
      const result = render(template, { expr: '7*7' });
      expect(result).toBe('7*7'); // NOT 49
    });

    it('should NOT execute Function constructor', () => {
      const template = '{{func}}';
      const result = render(template, { func: 'Function("return 42")()' });
      expect(result).toBe('Function("return 42")()'); // NOT 42
    });

    it('should NOT evaluate nested templates', () => {
      const template = '{{nested}}';
      const result = render(template, { nested: '{{otherKey}}' });
      expect(result).toBe('{{otherKey}}'); // NOT evaluated recursively
    });
  });

  describe('DoS Attack Prevention', () => {
    it('should handle malicious large input without hanging', () => {
      const template = '{{data}}';
      const largeData = 'x'.repeat(10_000_000); // 10MB string

      const start = performance.now();
      const result = render(template, { data: largeData });
      const duration = performance.now() - start;

      expect(result).toContain('xxx');
      expect(duration).toBeLessThan(1000); // Should complete in < 1s
    });
  });
});
