export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface TaskDependency {
  taskId: string;
  name?: string;
}

export interface RelatedFile {
  path: string;
  type: 'TO_MODIFY' | 'REFERENCE' | 'CREATE' | 'DEPENDENCY' | 'OTHER';
  description?: string | null;
  lineStart?: number | null;
  lineEnd?: number | null;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  notes?: string | null;
  status: TaskStatus;
  dependencies: TaskDependency[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  summary?: string | null;
  relatedFiles: RelatedFile[];
  analysisResult?: string | null;
  agent?: string | null;
  implementationGuide?: string | null;
  verificationCriteria?: string | null;
}
