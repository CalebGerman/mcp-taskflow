# API Reference

TaskFlow MCP exposes tools over MCP. This document summarizes the tool set at a high level.

## MCP App

- `show_todo_list`: Display an interactive UI showing all tasks

## Task Planning

- `plan_task`: turn a goal into a structured plan
- `split_tasks`: split a plan into discrete tasks
- `analyze_task`: capture analysis state for a task
- `reflect_task`: record a reflection on a task

## Task Management

- `list_tasks`: list tasks by status
- `get_task_detail`: detailed view of a task
- `query_task`: search tasks
- `create_task`: create a new task
- `update_task`: update fields/status
- `delete_task`: remove a task
- `clear_all_tasks`: remove all tasks

## Workflow

- `execute_task`: mark a task in progress and capture execution notes
- `verify_task`: score and mark a task complete

## Research and Project

- `research_mode`: guided research with state tracking
- `process_thought`: record a reasoning step
- `init_project_rules`: create default project rules
- `get_server_info`: server status and counts
