import { Subject, Task } from "@/types";

/**
 * Computes live synchronized subject statuses and coverage percentages from workspace tasks.
 */
export function getSyncedSubjects(subjects: Subject[], tasks: Task[]): Subject[] {
  return subjects.map((sub) => {
    // Match tasks by subjectId or subject name
    const subTasks = tasks.filter((t) => {
      if (t.subjectId && t.subjectId === sub.id) return true;
      if (t.category && sub.name && t.category.toLowerCase().trim() === sub.name.toLowerCase().trim()) return true;
      return false;
    });

    if (subTasks.length === 0) {
      return sub;
    }

    const totalTasks = subTasks.length;
    const completedTasks = subTasks.filter((t) => t.status === "Completed").length;
    const inProgressTasks = subTasks.filter(
      (t) => t.status === "In Progress" || (t.timeSpentMinutes && t.timeSpentMinutes > 0)
    ).length;

    let computedPercentage = Math.round((completedTasks / totalTasks) * 100);
    let computedStatus: Subject["status"] = "Not Started";

    if (completedTasks === totalTasks) {
      computedStatus = "Completed";
      computedPercentage = 100;
    } else if (completedTasks > 0 || inProgressTasks > 0) {
      computedStatus = "In Progress";
      if (computedPercentage === 0) {
        // If some task is in progress with logged time, display at least 5% or proportional progress
        const partialProgress = subTasks.reduce((acc, t) => {
          if (t.status === "Completed") return acc + 1;
          if (t.timeSpentMinutes && t.timeSpentMinutes > 0) return acc + 0.5;
          return acc;
        }, 0);
        computedPercentage = Math.max(5, Math.min(95, Math.round((partialProgress / totalTasks) * 100)));
      }
    } else {
      computedStatus = "Not Started";
      computedPercentage = 0;
    }

    const completedTopicNames = subTasks
      .filter((t) => t.status === "Completed")
      .map((t) => t.title)
      .join(", ");

    const pendingTopicNames = subTasks
      .filter((t) => t.status !== "Completed")
      .map((t) => t.title)
      .join(", ");

    return {
      ...sub,
      percentage: computedPercentage,
      status: computedStatus,
      completedTopics: completedTopicNames || sub.completedTopics || "",
      pendingTopics: pendingTopicNames || sub.pendingTopics || "",
    };
  });
}
