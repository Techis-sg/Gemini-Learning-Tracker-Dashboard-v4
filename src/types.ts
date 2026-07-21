export interface TimeLog {
  id: string;
  minutes: number;
  note: string;
  loggedAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  url: string;
}

export interface Task {
  id: string;
  dashboardId: string;
  subjectId?: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  category: 'Block 1 - GATE' | 'Block 2 - Placements' | 'DSA' | 'General';
  status: 'Not Started' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  notes: string;
  timeSpentMinutes: number;
  timeLogs: TimeLog[];
  attachments: TaskAttachment[];
  boardColumnId: 'backlog' | 'today' | 'in_progress' | 'completed' | 'revision';
}

export interface Subject {
  id: string;
  dashboardId?: string;
  name: string;
  block: 'Block 1 - GATE' | 'Block 2 - Placements' | 'DSA';
  daysPlanned: number;
  timeline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  percentage: number;
  pendingTopics: string;
  completedTopics?: string;
  weightage?: string; // Marks
  resource?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  createdAt: string;
  isDefault: boolean;
  target?: string;
  statusOverview?: string;
}

export interface DashboardData {
  dashboards: Dashboard[];
  subjects: Record<string, Subject[]>; // dashboardId -> Subject[]
  tasks: Record<string, Task[]>; // dashboardId -> Task[]
}

export interface HistoryLog {
  id: string;
  type: "session" | "action";
  subType?: "ai" | "user";
  action: string;
  description: string;
  timestamp: string; // ISO String
  durationMinutes?: number; // For login sessions
  sessionNumber?: number;
  loggedInTime?: string;
  loggedOutTime?: string;
}

export interface UserSettings {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  addressLine1: string;
  addressLine2: string;
  bio: string;
  theme: "light" | "dark" | "cosmic";
  fontFamily?: string;
  fontSize?: string;
  accentColor?: string;
  defaultTab: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigests: boolean;
  isPublicProfile: boolean;
}
