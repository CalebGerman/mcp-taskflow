import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function ensureBuild() {
  try {
    await fs.access(path.join(distDir, 'index.js'));
  } catch (error) {
    console.error('Build output not found. Run `pnpm build` first.');
    process.exit(1);
  }
}

function formatMs(value) {
  return `${value.toFixed(2)}ms`;
}

async function measure(label, fn) {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  console.log(`${label}: ${formatMs(duration)}`);
  return { duration, result };
}

async function main() {
  await ensureBuild();

  const { createContainer, resetGlobalContainer } = await import(
    path.join(distDir, 'server', 'container.js')
  );
  const { createMcpServer } = await import(
    path.join(distDir, 'server', 'mcpServer.js')
  );

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `mcp-perf-${timestamp}-${random}-`));

  const container = createContainer({ dataDir: tempDir });
  const server = createMcpServer(container);
  const splitTasks = server.tools.get('split_tasks');
  const listTasks = server.tools.get('list_tasks');
  const planTask = server.tools.get('plan_task');

  try {
    const batchSize = 100;
    const totalTasks = 1000;
    await measure('Create 1000 tasks', async () => {
      for (let batch = 0; batch < totalTasks / batchSize; batch++) {
        await splitTasks.execute({
          updateMode: 'append',
          tasks: Array.from({ length: batchSize }, (_, i) => ({
            name: `Bench Task ${batch * batchSize + i}`,
            description: `Benchmark task ${batch * batchSize + i}`,
          })),
        });
      }
    });

    const allTasks = await container.taskStore.getAllAsync();

    await measure('Search query (1000 tasks)', async () => {
      return container.taskSearchService.search(allTasks, {
        query: 'Bench Task 500',
        page: 1,
        pageSize: 10,
      });
    });

    const listIterations = 50;
    const listTimes = [];
    for (let i = 0; i < listIterations; i++) {
      const { duration } = await measure(`List tasks run ${i + 1}`, async () => {
        await listTasks.execute({ status: 'all' });
      });
      listTimes.push(duration);
    }

    const avgListTime = listTimes.reduce((a, b) => a + b, 0) / listTimes.length;
    console.log(`Average list time (${listIterations} runs): ${formatMs(avgListTime)}`);

    const planIterations = 20;
    const planTimes = [];
    for (let i = 0; i < planIterations; i++) {
      const { duration } = await measure(`Plan task run ${i + 1}`, async () => {
        await planTask.execute({
          description: `Benchmark planning ${i}`,
          existingTasksReference: false,
        });
      });
      planTimes.push(duration);
    }

    const avgPlanTime = planTimes.reduce((a, b) => a + b, 0) / planTimes.length;
    console.log(`Average plan time (${planIterations} runs): ${formatMs(avgPlanTime)}`);

    const jsonPayload = JSON.stringify({ version: '1.0', tasks: allTasks });
    await measure('JSON parse (1000 tasks)', async () => {
      JSON.parse(jsonPayload);
    });
    await measure('JSON serialize (1000 tasks)', async () => {
      JSON.stringify({ version: '1.0', tasks: allTasks });
    });
  } finally {
    resetGlobalContainer();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
