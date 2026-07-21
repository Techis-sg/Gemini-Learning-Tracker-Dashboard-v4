export function getCategoryBg(category: string): string {
  switch (category) {
    case 'Block 1 - GATE':
      return 'bg-emerald-300';
    case 'Block 2 - Placements':
      return 'bg-amber-200';
    case 'DSA':
      return 'bg-sky-200';
    default:
      return 'bg-purple-200';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'High':
      return 'bg-rose-400 text-black';
    case 'Medium':
      return 'bg-amber-300 text-black';
    case 'Low':
      return 'bg-slate-200 text-black';
    default:
      return 'bg-slate-100 text-black';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-400';
    case 'In Progress':
      return 'bg-yellow-300';
    case 'Not Started':
      return 'bg-rose-200';
    default:
      return 'bg-slate-200';
  }
}
