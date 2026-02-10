import { useEffect, useState } from 'react';
import type { Task } from './types';
import './App.css';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch tasks from the MCP server via the app bridge
    const fetchTasks = async () => {
      try {
        // In a real MCP App, this would use the MCP Apps client SDK
        // to communicate with the server and receive task data
        // For now, we'll show sample data for demonstration
        const sampleTasks: Task[] = [
          {
            id: '1',
            name: 'Setup UI project structure',
            description: 'Create React + Vite project with TypeScript',
            status: 'completed',
            dependencies: [],
            relatedFiles: [
              { path: 'ui/package.json', type: 'CREATE' },
              { path: 'ui/tsconfig.json', type: 'CREATE' },
            ],
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            updatedAt: new Date(Date.now() - 1800000).toISOString(),
            completedAt: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: '2',
            name: 'Implement TodoList component',
            description: 'Create React component to display tasks with styling',
            status: 'completed',
            dependencies: [{ taskId: '1', name: 'Setup UI project structure' }],
            relatedFiles: [
              { path: 'ui/src/App.tsx', type: 'CREATE' },
              { path: 'ui/src/App.css', type: 'CREATE' },
            ],
            createdAt: new Date(Date.now() - 3000000).toISOString(),
            updatedAt: new Date(Date.now() - 900000).toISOString(),
            completedAt: new Date(Date.now() - 900000).toISOString(),
          },
          {
            id: '3',
            name: 'Add app tool registration',
            description: 'Register show_todo_list tool in MCP server',
            status: 'in_progress',
            dependencies: [{ taskId: '2' }],
            relatedFiles: [
              { path: 'src/tools/app/appTools.ts', type: 'CREATE' },
              { path: 'src/server/mcpServer.ts', type: 'TO_MODIFY' },
            ],
            createdAt: new Date(Date.now() - 2400000).toISOString(),
            updatedAt: new Date(Date.now() - 300000).toISOString(),
            notes: 'Implementing graceful error handling',
          },
          {
            id: '4',
            name: 'Write unit tests',
            description: 'Create comprehensive tests for app tool registration',
            status: 'pending',
            dependencies: [{ taskId: '3' }],
            relatedFiles: [
              { path: 'tests/tools/app/appTools.test.ts', type: 'CREATE' },
            ],
            createdAt: new Date(Date.now() - 1800000).toISOString(),
            updatedAt: new Date(Date.now() - 1800000).toISOString(),
          },
        ];
        
        setTasks(sampleTasks);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return '#22c55e';
      case 'in_progress':
        return '#3b82f6';
      case 'blocked':
        return '#ef4444';
      case 'pending':
      default:
        return '#9ca3af';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'blocked':
        return 'Blocked';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <h2>No Tasks</h2>
          <p>No tasks found. Create tasks using mcp-taskflow tools to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>📋 TaskFlow Todo List</h1>
        <p className="subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
      </header>

      <div className="task-list">
        {tasks.map((task) => (
          <div key={task.id} className="task-card">
            <div className="task-header">
              <h3 className="task-name">{task.name}</h3>
              <span 
                className="status-badge" 
                style={{ backgroundColor: getStatusColor(task.status) }}
              >
                {getStatusLabel(task.status)}
              </span>
            </div>

            <p className="task-description">{task.description}</p>

            {task.notes && (
              <div className="task-section">
                <strong>Notes:</strong>
                <p>{task.notes}</p>
              </div>
            )}

            {task.dependencies.length > 0 && (
              <div className="task-section">
                <strong>Dependencies:</strong>
                <ul className="dependency-list">
                  {task.dependencies.map((dep, idx) => (
                    <li key={idx}>{dep.name || dep.taskId}</li>
                  ))}
                </ul>
              </div>
            )}

            {task.relatedFiles.length > 0 && (
              <div className="task-section">
                <strong>Related Files:</strong>
                <ul className="file-list">
                  {task.relatedFiles.map((file, idx) => (
                    <li key={idx}>
                      <code>{file.path}</code>
                      <span className="file-type">{file.type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="task-footer">
              <div className="timestamp">
                <span>Created: {formatDate(task.createdAt)}</span>
                {task.completedAt && (
                  <span> • Completed: {formatDate(task.completedAt)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
