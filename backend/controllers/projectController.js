/**
 * Project Controller
 * 
 * Handles CRUD operations for construction projects.
 * All projects are owned by authenticated users.
 */

const Project = require('../models/Project');
const FloorPlan = require('../models/FloorPlan');

/**
 * Create a new project
 * POST /api/projects
 */
const createProject = async (req, res) => {
    try {
        const {
            name, projectCode, description, projectType,
            client, location, startDate, expectedEndDate,
            budget, tags, notes, status, priority,
            contractorGrade, constructionPeriod, floors, areaSQFT
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Project name is required.'
            });
        }

        const project = new Project({
            name,
            projectCode: projectCode || '',
            description: description || '',
            owner: req.userId,
            projectType: projectType || 'residential',
            status: status || 'draft',
            priority: priority || 'medium',
            contractorGrade: contractorGrade || '',
            constructionPeriod: constructionPeriod ? Number(constructionPeriod) : null,
            floors: floors ? Number(floors) : null,
            areaSQFT: areaSQFT ? Number(areaSQFT) : null,
            client: client || {},
            location: location || {},
            startDate: startDate ? new Date(startDate) : null,
            expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
            budget: budget || { estimated: 0, actual: 0, currency: 'LKR' },
            tags: tags || [],
            notes: notes || ''
        });

        await project.save();

        console.log(`[Project] Created: ${project.name} by user ${req.userId}`);

        res.status(201).json({
            success: true,
            message: 'Project created successfully.',
            data: { project }
        });
    } catch (error) {
        console.error('[Project] Create error:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create project.'
        });
    }
};

/**
 * Get all projects for authenticated user
 * GET /api/projects
 */
const getProjects = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, projectType, search } = req.query;

        const query = { owner: req.userId };

        if (status) query.status = status;
        if (projectType) query.projectType = projectType;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const projects = await Project.find(query)
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('floorPlans', 'name status mlAnalysis.isProcessed createdAt');

        const total = await Project.countDocuments(query);

        res.json({
            success: true,
            data: {
                projects,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('[Project] Get all error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch projects.'
        });
    }
};

/**
 * Get a single project by ID
 * GET /api/projects/:id
 */
const getProject = async (req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findOne({ _id: id, owner: req.userId })
            .populate({
                path: 'floorPlans',
                select: 'name description floorNumber status mlAnalysis createdAt originalFilename'
            });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        res.json({
            success: true,
            data: { project }
        });
    } catch (error) {
        console.error('[Project] Get one error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project.'
        });
    }
};

/**
 * Update a project
 * PUT /api/projects/:id
 */
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates.owner;
        delete updates.floorPlans;
        delete updates.boqReports;
        delete updates._id;

        const project = await Project.findOneAndUpdate(
            { _id: id, owner: req.userId },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        console.log(`[Project] Updated: ${project.name}`);

        res.json({
            success: true,
            message: 'Project updated successfully.',
            data: { project }
        });
    } catch (error) {
        console.error('[Project] Update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update project.'
        });
    }
};

/**
 * Delete a project and all associated floor plans
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findOne({ _id: id, owner: req.userId });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // Delete all associated floor plans
        await FloorPlan.deleteMany({ project: id });

        // Delete the project
        await Project.findByIdAndDelete(id);

        console.log(`[Project] Deleted: ${project.name} with ${project.floorPlans?.length || 0} floor plans`);

        res.json({
            success: true,
            message: 'Project and all associated data deleted successfully.'
        });
    } catch (error) {
        console.error('[Project] Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete project.'
        });
    }
};

/**
 * Get project statistics/summary
 * GET /api/projects/:id/summary
 */
const getProjectSummary = async (req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findOne({ _id: id, owner: req.userId });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // Get floor plan statistics
        const floorPlans = await FloorPlan.find({ project: id });

        const summary = {
            totalFloorPlans: floorPlans.length,
            processedFloorPlans: floorPlans.filter(fp => fp.mlAnalysis?.isProcessed).length,
            totalWallArea: 0,
            totalDoors: 0,
            totalWindows: 0,
            totalRooms: 0,
            totalFloorArea: 0
        };

        floorPlans.forEach(fp => {
            if (fp.mlAnalysis?.isProcessed) {
                summary.totalWallArea += fp.mlAnalysis.walls?.netSurfaceArea || 0;
                summary.totalDoors += fp.mlAnalysis.doors?.count || 0;
                summary.totalWindows += fp.mlAnalysis.windows?.count || 0;
                summary.totalRooms += fp.mlAnalysis.rooms?.length || 0;

                if (fp.mlAnalysis.rooms) {
                    fp.mlAnalysis.rooms.forEach(room => {
                        summary.totalFloorArea += room.area || 0;
                    });
                }
            }
        });

        res.json({
            success: true,
            data: {
                project: {
                    _id: project._id,
                    name: project.name,
                    status: project.status,
                    projectType: project.projectType,
                    budget: project.budget
                },
                summary
            }
        });
    } catch (error) {
        console.error('[Project] Summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project summary.'
        });
    }
};

module.exports = {
    createProject,
    getProjects,
    getProject,
    updateProject,
    deleteProject,
    getProjectSummary
};
