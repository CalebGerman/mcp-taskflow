# TaskFlow MCP UI

Interactive todo list UI for displaying tasks from mcp-taskflow.

## Overview

This is a React + Vite application that provides a visual interface for viewing tasks managed by mcp-taskflow. The UI is served as an MCP App and displays in VS Code when the `show_todo_list` tool is invoked.

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
pnpm install
```

### Development Server

```bash
pnpm run dev
```

This starts a Vite development server at `http://localhost:5173` with hot module replacement.

### Build

```bash
pnpm run build
```

Builds the application to the `dist/` directory. The build output is a single HTML file with inlined assets, ready to be served as an MCP App resource.

### Type Checking

```bash
pnpm run type-check
```

Runs TypeScript type checking without emitting files.

## Architecture

### Components

- **App.tsx**: Main component that fetches and displays tasks
- **types.ts**: TypeScript interfaces matching the server task schema
- **App.css**: Component styles
- **index.css**: Global styles

### Task Schema

The task interface matches the server-side schema defined in `src/data/schemas.ts`:

```typescript
interface Task {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies: TaskDependency[];
  relatedFiles: RelatedFile[];
  createdAt: string;
  updatedAt: string;
  // ... other fields
}
```

### Styling

The UI uses a clean, minimal design with:
- Responsive layout
- Status badges with color coding
- Collapsible sections for dependencies and files
- Hover effects for better UX

## Integration with MCP Server

The UI is served by the MCP server via the `show_todo_list` tool:

1. User invokes `show_todo_list` in VS Code
2. MCP server reads the built HTML from `dist/ui/index.html`
3. Server returns the HTML with task data
4. VS Code displays the interactive UI

## Future Enhancements

Potential improvements:

- **Real-time updates**: Poll or use WebSocket for live task changes
- **Filtering**: Filter tasks by status, dependencies, or search
- **Sorting**: Sort by creation date, status, or name
- **Task editing**: Allow creating/updating tasks from the UI
- **Pagination**: Virtual scrolling for large task lists
- **Export**: Download tasks as JSON or CSV

## Troubleshooting

### Build fails with type errors

Make sure you've run `pnpm install` in both the UI directory and the root project.

### UI doesn't display in VS Code

1. Ensure the UI is built: `pnpm run build`
2. Verify `dist/index.html` exists
3. Check server logs for errors
4. Rebuild the main project: `cd .. && pnpm run build`

### Styles not appearing

The Vite build should inline all CSS. If styles are missing:

1. Check the build output for errors
2. Verify `dist/assets/` contains CSS files
3. Rebuild with `pnpm run build`
