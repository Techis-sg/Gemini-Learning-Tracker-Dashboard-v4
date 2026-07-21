export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeDashboardId: string;
  onRefreshData: () => Promise<void>;
}
