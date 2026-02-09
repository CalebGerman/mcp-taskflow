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
        // For now, use mock data - will be replaced with actual MCP bridge communication
        // In production, this would use the MCP Apps client SDK to communicate with the server
        const mockTasks: Task[] = [];
        
        setTasks(mockTasks);
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
