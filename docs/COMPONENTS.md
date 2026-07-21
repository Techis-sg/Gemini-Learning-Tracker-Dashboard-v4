# Frontend Architecture & Component Guide

This document describes the React 18 frontend architecture, component layout hierarchy, visual design system tokens, and key interactive components in the **Student Syllabus & Target Study Portal**.

---

## 1. Component Hierarchy & Layout Structure

```
src/
├── App.tsx                     # Main Router & Provider Entry Point
├── layouts/
│   └── SidebarLayout.tsx       # Sidebar Navigation + Brand Header + Give Feedback CTA
├── features/
│   ├── auth/
│   │   └── LoginModal.tsx      # OAuth Simulation Dialog
│   ├── dashboard/
│   │   └── PortalApp.tsx       # Main Study Hub, Self-Motivation Card & Task Engine
│   ├── settings/
│   │   └── ProfileSettings.tsx # User Profile & Portal Subtabs (includes User Motivation field)
│   ├── ai-importer/
│   │   └── AIImporterModal.tsx # Gemini AI Syllabus Parser
│   └── chatbot/
│       └── ChatbotDrawer.tsx   # AI Study Assistant Drawer
├── components/
│   ├── feedback/
│   │   └── FeedbackModal.tsx   # Direct Feedback Form with Validation & IconSend
│   ├── theme/
│   │   └── ThemeToggle.tsx     # Light/Dark/Cosmic Vibe Switcher
│   └── ui/                     # Reusable Core UI (Select, Tooltip, Badges)
```

---

## 2. Key Interactive Components

### 2.1 `SidebarLayout.tsx`
- **Responsibilities**:
  - Displays Study Buddy brand header with animated flame icon.
  - Houses navigation menu tabs (`Dashboard`, `Tasks`, `Subjects`, `Kanban`, `Calendar`, `Insights`, `Uploads`, `History`, `Settings`).
  - Computes and renders live **Day Study Streak** badge based on daily task completions or study time logs.
  - Renders the **Give Feedback** button with blinking pulse animation (`animate-pulse`) and session dismissal cross icon (`IconX`).
  - Handles session dismissal via `sessionStorage.setItem("feedback_dismissed_session", "true")`.

### 2.2 `FeedbackModal.tsx`
- **Responsibilities**:
  - Collects direct user feedback with strict validation rules.
  - Pre-fills user's verified email and renders it disabled (`disabled`).
  - Uses `IconSend` from `@tabler/icons-react` inside the submit button.
  - Applies smooth hover scaling and transform animations (`hover:scale-[1.02] active:scale-95 group`).
  - Validates:
    - Only alphanumeric characters and spaces (`/^[a-zA-Z0-9\s]+$/`).
    - Minimum 2 words.
    - Message length between 5 and 255 characters.
  - Displays instant visual validation checklist indicators (`IconCheck` / `IconAlertCircle`).
  - On submission, calls `POST /api/feedback` and redirects the user to the Dashboard page.

### 2.3 `ProfileSettings.tsx`
- **Responsibilities**:
  - Contains subtabs for `Profile`, `Portal`, `Account`, `Notifications`, and `Privacy`.
  - Under the `Portal` tab, provides the **User Motivation Field** text input where users can define their custom study mantra.
  - Manages visual theme selection (`Clean Slate`, `Cosmic Navy`, `Retro Terminal`), custom font selection (`Inter`, `Space Grotesk`, `Playfair Display`, `JetBrains Mono`), and accent colors.
  - Persists settings to `/users/{userId}/settings/info`.

### 2.4 `PortalApp.tsx` (Dashboard View)
- **Responsibilities**:
  - Central dashboard hub.
  - Displays the **My Motivation Message** card on the top right. Automatically reads custom motivation from `appSettings?.userMotivation || user?.motivation`. If unset, falls back to a rotating daily study inspiration quote from `STUDY_QUOTES`.
  - Renders overview metrics (Total Tasks, Completed Tasks, Study Hours, Overall Syllabus Percentage).
  - Handles subject cards, task creation modal, subject drawer, and time logger.

---

## 3. Design System & Typography Tokens

- **Icons**: Standardized on `@tabler/icons-react` (`IconSend`, `IconX`, `IconMessageReport`, `IconSparkles`, etc.).
- **Typography**: Paired display fonts with technical sans/mono styles.
- **Color Palette**: High-contrast light layout with subtle slate neutrals (`bg-[#FCFDFE]`), crisp borders (`border-slate-100`), and indigo/emerald accents (`bg-indigo-600`, `bg-emerald-600`).
