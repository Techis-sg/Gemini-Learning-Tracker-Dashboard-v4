import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "@utils/index";
import {
  IconSparkles as Sparkles,
  IconX as X,
  IconSend as Send,
  IconLoader2 as Loader2,
  IconRobot as Robot,
  IconUser as UserIcon,
  IconTerminal as Terminal,
  IconChevronDown as ChevronDown,
  IconRefresh as RefreshIcon
} from '@tabler/icons-react';

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeDashboardId: string;
  onRefreshData: () => Promise<void>;
}

export function AIChatDrawer({ isOpen, onClose, activeDashboardId, onRefreshData }: AIChatDrawerProps) {
  const INITIAL_MESSAGE: Message = {
    role: "assistant",
    content: "Hello! I am your StudyOS AI Copilot. I can manage your syllabus tracks, add new modules, update tasks on your Kanban, or provide intelligent insights. Try asking me: 'Add a high priority task for tomorrow to study Array Sorting' or 'Mark task ID ... as completed'!"
  };

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [executedActions, setExecutedActions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Add a high priority task for tomorrow to study Array Sorting",
    "Mark task ID ... as completed",
    "Create a new Subject block named 'Operating Systems'",
    "Give me an executive summary of my pending tasks",
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleResetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setExecutedActions([]);
    setInput("");
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const userId = localStorage.getItem("portal_user_id") || "demo-user";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          messages: updatedMessages,
          activeDashboardId,
        }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          const errData = await res.json();
          toast.error(errData.error || "Your account has been blocked for misuse.");
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: errData.content || "❌ Your account is blocked for misuse. Please contact administrator: support@studybuddy.com" }
          ]);
          setTimeout(() => {
            window.dispatchEvent(new Event("auth_blocked_logout"));
          }, 3500);
          return;
        }
        throw new Error("Chat assistant failed to respond.");
      }

      const data = await res.json();
      if (data.isWarning) {
        toast.error(`⚠️ Security warning: ${data.warningsCount}/3 violations logged.`);
      }

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.content || "I have processed your command." }
      ]);

      if (data.actions && data.actions.length > 0) {
        setExecutedActions(prev => [...prev, ...data.actions]);
        await onRefreshData();
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `⚠️ Error: ${err.message || "Failed to contact AI Copilot service."}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Floating macOS Dock-style Overlay Modal */}
      <motion.div
        initial={{ opacity: 0, y: 90, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 90, scale: 0.92 }}
        transition={{ type: "spring", damping: 26, stiffness: 320, mass: 0.7 }}
        className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 w-[95vw] sm:w-[600px] md:w-[640px] h-[580px] max-h-[82vh] bg-[#18181b]/95 text-zinc-100 rounded-[28px] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden backdrop-blur-2xl"
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              className="bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white text-xs px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 transition cursor-pointer font-medium"
              title="Start a new chat conversation"
            >
              <span>New chat</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>StudyOS AI</span>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer border border-white/5"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Logs Bar (if actions executed) */}
        {executedActions.length > 0 && (
          <div className="px-5 py-2 border-b border-white/5 bg-indigo-950/40 flex items-center gap-2 justify-between shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[10px] font-mono font-semibold text-indigo-300 uppercase tracking-wider">Latest Action:</span>
              <span className="text-[11px] font-mono text-zinc-300 truncate">{executedActions[executedActions.length - 1]}</span>
            </div>
            <button 
              onClick={() => setExecutedActions([])}
              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 uppercase tracking-tight shrink-0"
            >
              Clear
            </button>
          </div>
        )}

        {/* Main Body - Conversation / Welcome View */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 flex flex-col">
          {messages.length === 1 ? (
            /* Apple-style Hero Welcome Screen */
            <div className="my-auto flex flex-col items-center text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-500 to-indigo-400 p-0.5 shadow-xl shadow-indigo-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#18181b] rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-indigo-300" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-1">How can I help?</h2>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Ask me to update your workspace, assign tasks, or automate workflows.
                </p>
              </div>

              {/* Initial Greeting Card */}
              <div className="bg-zinc-800/40 border border-white/5 rounded-2xl p-4 text-xs leading-relaxed text-zinc-300 max-w-lg mx-auto text-left shadow-sm">
                {messages[0].content}
              </div>

              {/* Suggested Prompt Pills */}
              <div className="w-full max-w-lg pt-1">
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Suggested Actions</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      className="px-3.5 py-2 rounded-full border border-dashed border-zinc-700/80 hover:border-indigo-500/60 bg-zinc-800/30 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs transition cursor-pointer text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Message Stream */
            <div className="space-y-4 flex-1">
              <AnimatePresence initial={false}>
                {messages.map((m, idx) => {
                  const isAssistant = m.role === "assistant";
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
                    >
                      {isAssistant && (
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm mt-0.5">
                          <Robot className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`max-w-[82%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        isAssistant 
                          ? "bg-zinc-800/90 text-zinc-100 border border-white/5 rounded-tl-xs shadow-sm"
                          : "bg-indigo-600 text-white rounded-tr-xs shadow-md shadow-indigo-900/20"
                      }`}>
                        {m.content}
                      </div>

                      {!isAssistant && (
                        <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center text-zinc-200 shrink-0 shadow-sm mt-0.5">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0 animate-spin mt-0.5">
                    <Loader2 className="w-4 h-4" />
                  </div>
                  <div className="bg-zinc-800/60 border border-white/5 text-zinc-400 rounded-2xl rounded-tl-xs p-3 text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce delay-200" />
                    <span className="text-[11px] text-zinc-400">Updating workspace...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Input Area - Image 2 Style */}
        <div className="p-4 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="bg-[#232326] border border-white/10 focus-within:border-indigo-500/50 rounded-2xl p-3 flex flex-col gap-2 transition"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Describe a task, change, or workflow..."
              rows={2}
              className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none resize-none"
              disabled={loading}
            />

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>StudyOS Copilot v3</span>
              </div>

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center transition cursor-pointer shadow-md"
                title="Send prompt"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}

