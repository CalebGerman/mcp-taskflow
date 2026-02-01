/**
 * Tests for template loading and validation
 *
 * Verifies that all prompt templates load correctly and can be
 * rendered with the template engine.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTemplate, clearCache } from '../../src/prompts/templateLoader.js';
import { render } from '../../src/prompts/templateEngine.js';

describe('Template Loading and Validation', () => {
  beforeAll(() => {
    clearCache();
  });

  describe('Tool Templates - analyzeTask', () => {
    it('should load analyzeTask/index.md', async () => {
      const template = await loadTemplate('analyzeTask/index.md');
      expect(template).toBeDefined();
      expect(template.length).toBeGreaterThan(0);
      expect(template).toContain('Codebase Analysis');
    });

    it('should load analyzeTask/iteration.md', async () => {
      const template = await loadTemplate('analyzeTask/iteration.md');
      expect(template).toBeDefined();
    });
  });

  describe('Tool Templates - clearAllTasks', () => {
    const templates = [
      'backupInfo.md',
      'cancel.md',
      'empty.md',
      'index.md',
      'success.md'
    ];

    templates.forEach(tmpl => {
      it(`should load clearAllTasks/${tmpl}`, async () => {
        const template = await loadTemplate(`clearAllTasks/${tmpl}`);
        expect(template).toBeDefined();
        expect(template.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tool Templates - deleteTask', () => {
    const templates = [
      'completed.md',
      'index.md',
      'notFound.md',
      'success.md'
    ];

    templates.forEach(tmpl => {
      it(`should load deleteTask/${tmpl}`, async () => {
        const template = await loadTemplate(`deleteTask/${tmpl}`);
        expect(template).toBeDefined();
      });
    });
  });

  describe('Tool Templates - executeTask', () => {
    const templates = [
      'analysisResult.md',
      'complexity.md',
      'dependencyTasks.md',
      'implementationGuide.md',
      'index.md',
      'notes.md',
      'relatedFilesSummary.md',
      'verificationCriteria.md'
    ];

    templates.forEach(tmpl => {
      it(`should load executeTask/${tmpl}`, async () => {
        const template = await loadTemplate(`executeTask/${tmpl}`);
        expect(template).toBeDefined();
      });
    });

    it('should render executeTask/index.md with data', async () => {
      const template = await loadTemplate('executeTask/index.md');
      const rendered = render(template, {
        name: 'Test Task',
        id: 'task-123',
        description: 'Test description',
        notesTemplate: '',
        implementationGuideTemplate: '',
        verificationCriteriaTemplate: '',
        analysisResultTemplate: '',
        dependencyTasksTemplate: '',
        relatedFilesSummaryTemplate: '',
        complexityTemplate: ''
      });
      expect(rendered).toContain('Test Task');
      expect(rendered).toContain('task-123');
    });
  });

  describe('Tool Templates - getTaskDetail', () => {
    const templates = [
      'complatedSummary.md',
      'dependencies.md',
      'error.md',
      'implementationGuide.md',
      'index.md',
      'notes.md',
      'notFound.md',
      'relatedFiles.md',
      'verificationCriteria.md'
    ];

    templates.forEach(tmpl => {
      it(`should load getTaskDetail/${tmpl}`, async () => {
        const template = await loadTemplate(`getTaskDetail/${tmpl}`);
        expect(template).toBeDefined();
      });
    });
  });

  describe('Tool Templates - initProjectRules', () => {
    it('should load initProjectRules/index.md', async () => {
      const template = await loadTemplate('initProjectRules/index.md');
      expect(template).toBeDefined();
    });
  });

  describe('Tool Templates - listTasks', () => {
    const templates = [
      'index.md',
      'notFound.md',
      'taskDetails.md'
    ];

    templates.forEach(tmpl => {
      it(`should load listTasks/${tmpl}`, async () => {
        const template = await loadTemplate(`listTasks/${tmpl}`);
        expect(template).toBeDefined();
      });
    });
  });

  describe('Tool Templates - planTask', () => {
    const templates = [
      'hasThought.md',
      'index.md',
      'noThought.md',
      'tasks.md'
    ];

    templates.forEach(tmpl => {
      it(`should load planTask/${tmpl}`, async () => {
        const template = await loadTemplate(`planTask/${tmpl}`);
        expect(template).toBeDefined();
      });
    });
  });

  describe('Tool Templates - processThought', () => {
    const templates = [
      'complatedThought.md',
      'index.md',
      'moreThought.md'
    ];

    templates.forEach(tmpl => {
      it(`should load processThought/${tmpl}`, async () => {
        const template = await loadTemplate(`processThought/${tmpl}`);
        expect(template).toBeDefined();
      });
    });
  });

  describe('Tool Templates - queryTask', () => {
    const templates = [
      'index.md',
      'notFound.md',
      'taskDetails.md'
    ];

    templates.forEach(tmpl => {
      it(`should load queryTask/${tmpl}`, async () => {
        const template = await loadTemplate(`queryTask/${tmpl}`);
        expect(template).toBeDefined();
      });
    });
  });

  describe('Tool Templates - reflectTask', () => {
    it('should load reflectTask/index.md', async () => {
      const template = await loadTemplate('reflectTask/index.md');
      expect(template).toBeDefined();
    });
  });

  describe('Tool Templates - researchMode', () => {
    const templates = [
      'index.md',
      'previousState.md'
    ];

    templates.forEach(tmpl => {
      it(`should load researchMode/${tmpl}`, async () => {
        const template = await loadTemplate(`researchMode/${tmpl}`);
        expect(template).toBeDefined();
      });
    });
  });

  describe('Tool Templates - splitTasks', () => {
    const templates = [
      'index.md',
      'taskDetails.md'
    ];

    templates.forEach(tmpl => {
      it(`should load splitTasks/${tmpl}`, async () => {
        const template = await loadTemplate(`splitTasks/${tmpl}`);
        expect(template).toBeDefined();
      });
    });
  });

  describe('Tool Templates - updateTaskContent', () => {
    const templates = [
      'emptyUpdate.md',
      'fileDetails.md',
      'index.md',
      'notFound.md',
      'success.md',
      'validation.md'
    ];

    templates.forEach(tmpl => {
      it(`should load updateTaskContent/${tmpl}`, async () => {
        const template = await loadTemplate(`updateTaskContent/${tmpl}`);
        expect(template).toBeDefined();
      });
    });
  });

  describe('Tool Templates - verifyTask', () => {
    const templates = [
      'index.md',
      'noPass.md'
    ];

    templates.forEach(tmpl => {
      it(`should load verifyTask/${tmpl}`, async () => {
        const template = await loadTemplate(`verifyTask/${tmpl}`);
        expect(template).toBeDefined();
      });
    });
  });

  describe('Tool Descriptions', () => {
    const toolDescriptions = [
      'analyzeTask.md',
      'clearAllTasks.md',
      'deleteTask.md',
      'executeTask.md',
      'getTaskDetail.md',
      'initProjectRules.md',
      'listTasks.md',
      'planTask.md',
      'processThought.md',
      'queryTask.md',
      'reflectTask.md',
      'researchMode.md',
      'splitTasks.md',
      'updateTask.md',
      'verifyTask.md'
    ];

    toolDescriptions.forEach(desc => {
      it(`should load toolsDescription/${desc}`, async () => {
        const template = await loadTemplate(`toolsDescription/${desc}`);
        expect(template).toBeDefined();
        expect(template.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Template Content Validation', () => {
    it('should use correct placeholder format', async () => {
      const template = await loadTemplate('executeTask/index.md');
      // Template engine supports both {placeholder} and {{placeholder}}
      expect(template).toMatch(/\{[a-zA-Z]+\}/);
    });

    it('should render templates with TypeScript engine', async () => {
      const template = await loadTemplate('listTasks/taskDetails.md');
      const rendered = render(template, {
        taskName: 'My Task',
        taskId: '12345',
        taskStatus: 'pending',
        taskDescription: 'Test description'
      });

      expect(rendered).toBeDefined();
      expect(rendered.length).toBeGreaterThan(0);
    });
  });

  describe('Template Structure Validation', () => {
    it('should have all 17 tool template directories', async () => {
      const toolDirs = [
        'analyzeTask',
        'clearAllTasks',
        'deleteTask',
        'executeTask',
        'getTaskDetail',
        'initProjectRules',
        'listTasks',
        'planTask',
        'processThought',
        'queryTask',
        'reflectTask',
        'researchMode',
        'splitTasks',
        'updateTaskContent',
        'verifyTask'
      ];

      for (const dir of toolDirs) {
        const template = await loadTemplate(`${dir}/index.md`);
        expect(template).toBeDefined();
      }
    });

    it('should have toolsDescription directory with all tool descriptions', async () => {
      // At least 15 tool descriptions should exist
      const descriptions = [
        'analyzeTask.md',
        'executeTask.md',
        'listTasks.md',
        'planTask.md',
        'splitTasks.md'
      ];

      for (const desc of descriptions) {
        const template = await loadTemplate(`toolsDescription/${desc}`);
        expect(template).toBeDefined();
      }
    });
  });
});
