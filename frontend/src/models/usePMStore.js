import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Constants ──────────────────────────────────────────────────────
export const PROJECT_STATUSES = [
    { key: 'draft', label: 'Draft', color: '#8c8c8c' },
    { key: 'active', label: 'Active', color: '#52c41a' },
    { key: 'on-hold', label: 'On Hold', color: '#faad14' },
    { key: 'completed', label: 'Completed', color: '#1890ff' },
    { key: 'cancelled', label: 'Cancelled', color: '#ff4d4f' },
];

export const TASK_STATUSES = ['todo', 'in-progress', 'review', 'done'];

export const PRIORITIES = [
    { key: 'low', label: 'Low', color: '#8c8c8c', weight: 1 },
    { key: 'medium', label: 'Medium', color: '#faad14', weight: 2 },
    { key: 'high', label: 'High', color: '#ff4d4f', weight: 3 },
];

export const ROLES = [
    { key: 'admin', label: 'Admin', defaultTab: 'overview' },
    { key: 'pm', label: 'Project Manager', defaultTab: 'tasks' },
    { key: 'qs', label: 'Quantity Surveyor', defaultTab: 'analysis' },
    { key: 'site-engineer', label: 'Site Engineer', defaultTab: 'tasks' },
];

// ─── Project Templates ─────────────────────────────────────────────
export const PROJECT_TEMPLATES = {
    'residential-house': {
        name: 'Residential House',
        icon: '🏠',
        projectType: 'residential',
        description: 'Standard residential house construction project',
        milestones: [
            { title: 'Site Preparation', daysFromStart: 7 },
            { title: 'Foundation Complete', daysFromStart: 30 },
            { title: 'Structural Framework', daysFromStart: 60 },
            { title: 'Roofing Complete', daysFromStart: 90 },
            { title: 'MEP Rough-In', daysFromStart: 110 },
            { title: 'Interior Finishing', daysFromStart: 140 },
            { title: 'Final Inspection', daysFromStart: 160 },
            { title: 'Handover', daysFromStart: 180 },
        ],
        tasks: [
            { title: 'Land survey & soil testing', priority: 'high', tags: ['foundation'] },
            { title: 'Obtain building permits', priority: 'high', tags: ['admin'] },
            { title: 'Site clearing & excavation', priority: 'medium', tags: ['foundation'] },
            { title: 'Foundation pouring', priority: 'high', tags: ['foundation'] },
            { title: 'Column & beam erection', priority: 'high', tags: ['structure'] },
            { title: 'Slab casting', priority: 'high', tags: ['structure'] },
            { title: 'Brickwork / blockwork', priority: 'medium', tags: ['structure'] },
            { title: 'Roof truss installation', priority: 'high', tags: ['roofing'] },
            { title: 'Roofing & waterproofing', priority: 'medium', tags: ['roofing'] },
            { title: 'Electrical rough-in', priority: 'medium', tags: ['mep'] },
            { title: 'Plumbing rough-in', priority: 'medium', tags: ['mep'] },
            { title: 'Plastering & rendering', priority: 'medium', tags: ['finishing'] },
            { title: 'Tiling & flooring', priority: 'medium', tags: ['finishing'] },
            { title: 'Painting', priority: 'low', tags: ['finishing'] },
            { title: 'Fixtures & fittings', priority: 'low', tags: ['finishing'] },
            { title: 'Landscaping', priority: 'low', tags: ['external'] },
        ],
    },
    'apartment-building': {
        name: 'Apartment Building',
        icon: '🏢',
        projectType: 'commercial',
        description: 'Multi-storey apartment building project',
        milestones: [
            { title: 'Design Approval', daysFromStart: 14 },
            { title: 'Piling Complete', daysFromStart: 45 },
            { title: 'Basement Complete', daysFromStart: 75 },
            { title: 'Superstructure 50%', daysFromStart: 120 },
            { title: 'Superstructure 100%', daysFromStart: 180 },
            { title: 'MEP Installation', daysFromStart: 220 },
            { title: 'Interior Works', daysFromStart: 270 },
            { title: 'Testing & Commissioning', daysFromStart: 300 },
            { title: 'Occupation Certificate', daysFromStart: 320 },
        ],
        tasks: [
            { title: 'Geotechnical investigation', priority: 'high', tags: ['foundation'] },
            { title: 'Piling works', priority: 'high', tags: ['foundation'] },
            { title: 'Pile cap & grade beams', priority: 'high', tags: ['foundation'] },
            { title: 'Basement retaining walls', priority: 'high', tags: ['structure'] },
            { title: 'Elevator shaft construction', priority: 'high', tags: ['structure'] },
            { title: 'Floor slab casting (per floor)', priority: 'high', tags: ['structure'] },
            { title: 'Fire protection system', priority: 'high', tags: ['mep'] },
            { title: 'HVAC installation', priority: 'medium', tags: ['mep'] },
            { title: 'Elevator installation', priority: 'high', tags: ['mep'] },
            { title: 'Common area finishing', priority: 'medium', tags: ['finishing'] },
            { title: 'Unit-wise interior works', priority: 'medium', tags: ['finishing'] },
            { title: 'Parking lot finishing', priority: 'low', tags: ['external'] },
        ],
    },
    'road-construction': {
        name: 'Road Construction',
        icon: '🛣️',
        projectType: 'industrial',
        description: 'Road infrastructure construction project',
        milestones: [
            { title: 'Survey & Design Complete', daysFromStart: 21 },
            { title: 'Land Acquisition Done', daysFromStart: 45 },
            { title: 'Earthworks Complete', daysFromStart: 90 },
            { title: 'Sub-base & Base Course', daysFromStart: 130 },
            { title: 'Asphalt/Concrete Paving', daysFromStart: 170 },
            { title: 'Drainage & Utilities', daysFromStart: 200 },
            { title: 'Road Furniture & Marking', daysFromStart: 220 },
            { title: 'Final Inspection & Opening', daysFromStart: 240 },
        ],
        tasks: [
            { title: 'Topographic survey', priority: 'high', tags: ['survey'] },
            { title: 'Road alignment design', priority: 'high', tags: ['design'] },
            { title: 'Environmental clearance', priority: 'high', tags: ['admin'] },
            { title: 'Land acquisition & clearing', priority: 'high', tags: ['admin'] },
            { title: 'Cut & fill earthworks', priority: 'high', tags: ['earthworks'] },
            { title: 'Subgrade preparation', priority: 'medium', tags: ['earthworks'] },
            { title: 'Drainage construction', priority: 'medium', tags: ['utilities'] },
            { title: 'Sub-base layer', priority: 'medium', tags: ['pavement'] },
            { title: 'Base course layer', priority: 'medium', tags: ['pavement'] },
            { title: 'Asphalt paving', priority: 'high', tags: ['pavement'] },
            { title: 'Road marking & signage', priority: 'low', tags: ['furniture'] },
            { title: 'Guard rails & barriers', priority: 'medium', tags: ['furniture'] },
        ],
    },
};

// ─── ID Generator ───────────────────────────────────────────────────
const genId = () => crypto.randomUUID();

// ─── Store ──────────────────────────────────────────────────────────
const usePMStore = create(
    persist(
        (set, get) => ({
            // ── Tasks keyed by projectId ──
            tasksByProject: {},

            // ── Milestones keyed by projectId ──
            milestonesByProject: {},

            // ── Activity log (global, last 200) ──
            activityLog: [],

            // ── Recently accessed project IDs ──
            recentProjectIds: [],

            // ── User role (local mock) ──
            userRole: 'pm',

            // ═════════════════════════════════════════════════════
            // TASK ACTIONS
            // ═════════════════════════════════════════════════════
            addTask: (projectId, taskData) => {
                const task = {
                    id: genId(),
                    projectId,
                    title: taskData.title || 'Untitled Task',
                    description: taskData.description || '',
                    status: taskData.status || 'todo',
                    priority: taskData.priority || 'medium',
                    assignee: taskData.assignee || '',
                    dueDate: taskData.dueDate || null,
                    tags: taskData.tags || [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                set((state) => ({
                    tasksByProject: {
                        ...state.tasksByProject,
                        [projectId]: [...(state.tasksByProject[projectId] || []), task],
                    },
                }));
                get()._log('task', projectId, `Task "${task.title}" created`, task.id);
                return task;
            },

            updateTask: (projectId, taskId, updates) => {
                const tasks = get().tasksByProject[projectId] || [];
                const oldTask = tasks.find((t) => t.id === taskId);

                set((state) => ({
                    tasksByProject: {
                        ...state.tasksByProject,
                        [projectId]: (state.tasksByProject[projectId] || []).map((t) =>
                            t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
                        ),
                    },
                }));

                if (oldTask && updates.status && updates.status !== oldTask.status) {
                    const labels = { todo: 'Todo', 'in-progress': 'In Progress', review: 'Review', done: 'Done' };
                    get()._log('task', projectId, `Task "${oldTask.title}" moved ${labels[oldTask.status]} → ${labels[updates.status]}`, taskId);
                } else if (oldTask) {
                    get()._log('task', projectId, `Task "${oldTask.title}" updated`, taskId);
                }
            },

            moveTask: (projectId, taskId, newStatus) => {
                get().updateTask(projectId, taskId, { status: newStatus });
            },

            deleteTask: (projectId, taskId) => {
                const task = (get().tasksByProject[projectId] || []).find((t) => t.id === taskId);
                set((state) => ({
                    tasksByProject: {
                        ...state.tasksByProject,
                        [projectId]: (state.tasksByProject[projectId] || []).filter((t) => t.id !== taskId),
                    },
                }));
                if (task) get()._log('task', projectId, `Task "${task.title}" deleted`, taskId);
            },

            // ═════════════════════════════════════════════════════
            // MILESTONE ACTIONS
            // ═════════════════════════════════════════════════════
            addMilestone: (projectId, data) => {
                const ms = {
                    id: genId(),
                    projectId,
                    title: data.title || 'Untitled Milestone',
                    targetDate: data.targetDate || null,
                    status: data.status || 'pending',
                    description: data.description || '',
                    createdAt: new Date().toISOString(),
                };
                set((state) => ({
                    milestonesByProject: {
                        ...state.milestonesByProject,
                        [projectId]: [...(state.milestonesByProject[projectId] || []), ms],
                    },
                }));
                get()._log('milestone', projectId, `Milestone "${ms.title}" added`, ms.id);
                return ms;
            },

            updateMilestone: (projectId, msId, updates) => {
                const old = (get().milestonesByProject[projectId] || []).find((m) => m.id === msId);
                set((state) => ({
                    milestonesByProject: {
                        ...state.milestonesByProject,
                        [projectId]: (state.milestonesByProject[projectId] || []).map((m) =>
                            m.id === msId ? { ...m, ...updates } : m
                        ),
                    },
                }));
                if (old && updates.status === 'complete' && old.status !== 'complete') {
                    get()._log('milestone', projectId, `Milestone "${old.title}" completed`, msId);
                }
            },

            deleteMilestone: (projectId, msId) => {
                const ms = (get().milestonesByProject[projectId] || []).find((m) => m.id === msId);
                set((state) => ({
                    milestonesByProject: {
                        ...state.milestonesByProject,
                        [projectId]: (state.milestonesByProject[projectId] || []).filter((m) => m.id !== msId),
                    },
                }));
                if (ms) get()._log('milestone', projectId, `Milestone "${ms.title}" deleted`, msId);
            },

            // ═════════════════════════════════════════════════════
            // PROGRESS CALCULATION
            // ═════════════════════════════════════════════════════
            computeProgress: (projectId) => {
                const tasks = get().tasksByProject[projectId] || [];
                if (tasks.length === 0) return { percentage: 0, weighted: 0, total: 0, done: 0 };
                const weights = { low: 1, medium: 2, high: 3 };
                let totalW = 0, doneW = 0, doneC = 0;
                tasks.forEach((t) => {
                    const w = weights[t.priority] || 1;
                    totalW += w;
                    if (t.status === 'done') { doneW += w; doneC++; }
                });
                return {
                    percentage: Math.round((doneC / tasks.length) * 100),
                    weighted: Math.round((doneW / totalW) * 100),
                    total: tasks.length,
                    done: doneC,
                };
            },

            // ═════════════════════════════════════════════════════
            // OVERDUE / UPCOMING
            // ═════════════════════════════════════════════════════
            getOverdueTasks: (projectId) => {
                const tasks = projectId
                    ? (get().tasksByProject[projectId] || [])
                    : Object.values(get().tasksByProject).flat();
                const now = new Date(); now.setHours(0, 0, 0, 0);
                return tasks.filter((t) => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now);
            },

            getUpcomingTasks: (projectId, days = 7) => {
                const tasks = projectId
                    ? (get().tasksByProject[projectId] || [])
                    : Object.values(get().tasksByProject).flat();
                const now = new Date(); now.setHours(0, 0, 0, 0);
                const future = new Date(now); future.setDate(future.getDate() + days);
                return tasks.filter((t) => {
                    if (!t.dueDate || t.status === 'done') return false;
                    const d = new Date(t.dueDate);
                    return d >= now && d <= future;
                });
            },

            // ═════════════════════════════════════════════════════
            // ACTIVITY LOG
            // ═════════════════════════════════════════════════════
            _log: (type, projectId, message, entityId = null) => {
                set((state) => ({
                    activityLog: [
                        { id: genId(), type, projectId, entityId, message, timestamp: new Date().toISOString() },
                        ...state.activityLog,
                    ].slice(0, 200),
                }));
            },

            logProjectEvent: (projectId, message) => {
                get()._log('project', projectId, message);
            },

            // ═════════════════════════════════════════════════════
            // RECENT PROJECTS
            // ═════════════════════════════════════════════════════
            trackRecentProject: (projectId) => {
                set((state) => ({
                    recentProjectIds: [projectId, ...state.recentProjectIds.filter((id) => id !== projectId)].slice(0, 5),
                }));
            },

            // ═════════════════════════════════════════════════════
            // ROLE
            // ═════════════════════════════════════════════════════
            setUserRole: (role) => set({ userRole: role }),

            // ═════════════════════════════════════════════════════
            // CREATE FROM TEMPLATE
            // ═════════════════════════════════════════════════════
            applyTemplate: (projectId, templateKey) => {
                const tpl = PROJECT_TEMPLATES[templateKey];
                if (!tpl) return;
                const now = new Date();

                // Create milestones
                const milestones = tpl.milestones.map((ms) => ({
                    id: genId(),
                    projectId,
                    title: ms.title,
                    targetDate: new Date(now.getTime() + ms.daysFromStart * 86400000).toISOString().split('T')[0],
                    status: 'pending',
                    description: '',
                    createdAt: now.toISOString(),
                }));

                // Create tasks
                const tasks = tpl.tasks.map((t) => ({
                    id: genId(),
                    projectId,
                    title: t.title,
                    description: '',
                    status: 'todo',
                    priority: t.priority,
                    assignee: '',
                    dueDate: null,
                    tags: t.tags,
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                }));

                set((state) => ({
                    milestonesByProject: { ...state.milestonesByProject, [projectId]: milestones },
                    tasksByProject: { ...state.tasksByProject, [projectId]: tasks },
                }));

                get()._log('project', projectId, `Template "${tpl.name}" applied — ${tasks.length} tasks, ${milestones.length} milestones`);
            },

            // ═════════════════════════════════════════════════════
            // CLEANUP
            // ═════════════════════════════════════════════════════
            removeProjectData: (projectId) => {
                set((state) => {
                    const newTasks = { ...state.tasksByProject };
                    const newMs = { ...state.milestonesByProject };
                    delete newTasks[projectId];
                    delete newMs[projectId];
                    return {
                        tasksByProject: newTasks,
                        milestonesByProject: newMs,
                        recentProjectIds: state.recentProjectIds.filter((id) => id !== projectId),
                    };
                });
            },

            // ═════════════════════════════════════════════════════
            // GLOBAL SEARCH
            // ═════════════════════════════════════════════════════
            searchAll: (query) => {
                if (!query || query.length < 2) return { tasks: [], projects: [] };
                const q = query.toLowerCase();
                const allTasks = Object.values(get().tasksByProject).flat();
                const matchedTasks = allTasks.filter(
                    (t) =>
                        t.title.toLowerCase().includes(q) ||
                        t.description?.toLowerCase().includes(q) ||
                        t.tags?.some((tag) => tag.toLowerCase().includes(q))
                );
                return { tasks: matchedTasks };
            },
        }),
        {
            name: 'green-build-pm-storage',
            version: 1,
            partialize: (state) => ({
                tasksByProject: state.tasksByProject,
                milestonesByProject: state.milestonesByProject,
                activityLog: state.activityLog,
                recentProjectIds: state.recentProjectIds,
                userRole: state.userRole,
            }),
        }
    )
);

export default usePMStore;
