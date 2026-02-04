# Performance Guide

This document describes how to measure TaskFlow MCP performance, expected baselines, and how to interpret results. Performance will vary by machine, disk, and OS. Use these numbers as target SLOs, not absolute guarantees.

## What We Measure

- Task CRUD latency
- Search performance on 1,000+ tasks
- Template rendering speed
- JSON parse/serialize time
- Sustained load behavior
- Memory growth under repeated operations

## Benchmarking

Run the benchmark script after building:

```bash
pnpm build
pnpm run benchmark
```

The script creates a temporary dataset and prints timings for task creation, list operations, search, planning, and JSON parse/serialize.

## Integration Performance Tests

The integration test suite includes performance checks:

```bash
pnpm test tests/integration/performance.test.ts
```

These tests validate latency and sustained load characteristics against the targets below.

## Profiling

For deeper profiling, run Node with built-in profiling:

```bash
node --prof dist/index.js
```

You can also profile the benchmark script:

```bash
node --prof benchmarks/run-benchmarks.mjs
```

The generated `isolate-*.log` can be inspected with `node --prof-process`.

## Target SLOs

These are the performance objectives for typical developer machines:

- Task operations: < 50ms for 1,000 tasks
- Search: < 100ms for 1,000 tasks
- Template rendering: < 10ms
- JSON parse/serialize: < 20ms for 1,000 tasks
- Memory: < 100MB during steady load
- Sustained load: < 100ms average list time on 500 tasks

## Notes

- Cold runs are slower due to disk caches and module initialization.
- Disk speed impacts CRUD and list performance the most.
- Use the benchmark output to compare improvements across releases.
