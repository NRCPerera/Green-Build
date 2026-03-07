import { useCallback, useMemo } from 'react';
import usePMStore from '../models/usePMStore';

/**
 * Controller hook for task & milestone management within a project.
 * Works with local persisted Zustand state (usePMStore).
 */
const useTaskController = (projectId) => {
    const store = usePMStore();

    // ── Tasks for this project ──
    const tasks = useMemo(() => {
        return store.tasksByProject[projectId] || [];
    }, [store.tasksByProject, projectId]);

    // ── Milestones for this project ──
    const milestones = useMemo(() => {
        return store.milestonesByProject[projectId] || [];
    }, [store.milestonesByProject, projectId]);

    // ── Tasks grouped by status (for Kanban) ──
    const tasksByStatus = useMemo(() => {
        const grouped = { 'todo': [], 'in-progress': [], 'review': [], 'done': [] };
        tasks.forEach((task) => {
            if (grouped[task.status]) grouped[task.status].push(task);
            else grouped['todo'].push(task);
        });
        return grouped;
    }, [tasks]);

    // ── Progress ──
    const progress = useMemo(() => {
        return store.computeProgress(projectId);
    }, [store.computeProgress, projectId, tasks]);

    // ── Overdue tasks ──
    const overdueTasks = useMemo(() => {
        return store.getOverdueTasks(projectId);
    }, [store.getOverdueTasks, projectId, tasks]);

    // ── Upcoming tasks (next 7 days) ──
    const upcomingTasks = useMemo(() => {
        return store.getUpcomingTasks(projectId, 7);
    }, [store.getUpcomingTasks, projectId, tasks]);

    // ── Activity for this project ──
    const activity = useMemo(() => {
        return store.activityLog.filter((e) => e.projectId === projectId);
    }, [store.activityLog, projectId]);

    // ── Unique tags ──
    const allTags = useMemo(() => {
        const tags = new Set();
        tasks.forEach((t) => t.tags?.forEach((tag) => tags.add(tag)));
        return Array.from(tags).sort();
    }, [tasks]);

    // ── Task Actions ──
    const handleAddTask = useCallback((data) => store.addTask(projectId, data), [store.addTask, projectId]);
    const handleUpdateTask = useCallback((taskId, updates) => store.updateTask(projectId, taskId, updates), [store.updateTask, projectId]);
    const handleMoveTask = useCallback((taskId, newStatus) => store.moveTask(projectId, taskId, newStatus), [store.moveTask, projectId]);
    const handleDeleteTask = useCallback((taskId) => store.deleteTask(projectId, taskId), [store.deleteTask, projectId]);

    // ── Milestone Actions ──
    const handleAddMilestone = useCallback((data) => store.addMilestone(projectId, data), [store.addMilestone, projectId]);
    const handleUpdateMilestone = useCallback((msId, updates) => store.updateMilestone(projectId, msId, updates), [store.updateMilestone, projectId]);
    const handleDeleteMilestone = useCallback((msId) => store.deleteMilestone(projectId, msId), [store.deleteMilestone, projectId]);

    // ── Filter helper ──
    const getFilteredTasks = useCallback((filters = {}) => {
        let result = [...tasks];
        if (filters.priority) result = result.filter((t) => t.priority === filters.priority);
        if (filters.status) result = result.filter((t) => t.status === filters.status);
        if (filters.tag) result = result.filter((t) => t.tags?.includes(filters.tag));
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter((t) =>
                t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
            );
        }
        if (filters.sortBy === 'priority') {
            const order = { high: 0, medium: 1, low: 2 };
            result.sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1));
        } else if (filters.sortBy === 'dueDate') {
            result.sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
        }
        return result;
    }, [tasks]);

    return {
        tasks, milestones, tasksByStatus, progress,
        overdueTasks, upcomingTasks, activity, allTags,
        addTask: handleAddTask, updateTask: handleUpdateTask,
        moveTask: handleMoveTask, deleteTask: handleDeleteTask,
        addMilestone: handleAddMilestone, updateMilestone: handleUpdateMilestone,
        deleteMilestone: handleDeleteMilestone, getFilteredTasks,
    };
};

export default useTaskController;
