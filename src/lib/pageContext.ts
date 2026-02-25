export const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/": "Journal page — daily journal entries organized by categories (General, Health, Finance, Relationships, Career, Knowledge, Novelty, Projects). Users write reflections, log emotions, and can view past entries in list or calendar mode.",
  "/habits": "Habits page — habit tracker with targets (things to do more) and limits (things to reduce). Each habit has a daily/weekly target value. Users can log progress and view history.",
  "/tasks": "Tasks page — task list with drag-to-reorder. Tasks have title, optional notes, and time estimates. Tabs for Open/Done/All. Shows progress bar.",
  "/schedule": "Schedule page — drag-to-create time blocks on a daily timeline. Users plan their day visually.",
  "/rules": "Life Rules page — ordered list of personal principles and rules. Users can add, edit, reorder, and delete rules.",
};

export function getPageDescription(pathname: string): string {
  return PAGE_DESCRIPTIONS[pathname] || `Page: ${pathname}`;
}
