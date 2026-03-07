/**
 * Floor Plan Controller
 * 
 * Handles floor plan uploads and ML analysis within projects.
 * Stores all analysis results in the database.
 */

const FloorPlan = require('../models/FloorPlan');
const Project = require('../models/Project');
const BOQReport = require('../models/BOQReport');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { calculateCosts } = require('../models/costModel');

/**
 * Upload and analyze a floor plan
 * POST /api/projects/:projectId/floorplans
 */
const uploadFloorPlan = async (req, res) => {
    const startTime = Date.now();
    let tempFilePath = null;

    try {
        const { projectId } = req.params;
        const { scale = 100, wallHeight = 2.7, name, description, floorNumber = 0 } = req.body;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No floor plan image uploaded.'
            });
        }

        tempFilePath = req.file.path;
        const floorPlanName = name || req.file.originalname.replace(/\.[^/.]+$/, '');

        console.log(`[FloorPlan] Processing: ${floorPlanName} for project ${project.name}`);

        // Create floor plan record
        const floorPlan = new FloorPlan({
            project: projectId,
            uploadedBy: req.userId,
            name: floorPlanName,
            description: description || '',
            floorNumber: parseInt(floorNumber),
            originalFilename: req.file.originalname,
            storedFilename: req.file.filename,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            scale: {
                pixelsPerMeter: parseFloat(scale),
                userDefined: true
            },
            wallHeight: parseFloat(wallHeight),
            status: 'processing'
        });

        await floorPlan.save();

        // Send to ML service for analysis
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath));
        formData.append('scale_ppm', scale.toString());
        formData.append('wall_height', wallHeight.toString());

        console.log(`[FloorPlan] Sending to ML service for analysis...`);

        const mlResponse = await axios.post(
            `${config.pythonServiceUrl}/calculate-quantities`,
            formData,
            {
                headers: { ...formData.getHeaders() },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 120000
            }
        );

        if (!mlResponse.data) {
            throw new Error('No response from ML service');
        }

        const mlData = mlResponse.data;
        console.log(`[FloorPlan] ML analysis completed successfully`);

        // Calculate costs
        const costs = calculateCosts({
            wall_net_surface_area_m2: mlData.wall_net_surface_area_m2 || 0,
            item_counts: mlData.item_counts || { doors: 0, windows: 0 }
        });

        // Update floor plan with ML results
        floorPlan.mlAnalysis = {
            isProcessed: true,
            processedAt: new Date(),
            isValidFloorPlan: !mlData.warning,
            validationConfidence: mlData.warning ? 0.5 : 0.95,
            walls: {
                detectedLength: 0,
                lengthMeters: mlData.wall_total_length_m || 0,
                surfaceArea: mlData.wall_gross_surface_area_m2 || 0,
                netSurfaceArea: mlData.wall_net_surface_area_m2 || 0
            },
            doors: {
                count: mlData.item_counts?.doors || 0,
                totalArea: mlData.deductions_area_m2 * 0.6 || 0
            },
            windows: {
                count: mlData.item_counts?.windows || 0,
                totalArea: mlData.deductions_area_m2 * 0.4 || 0
            },
            rooms: (mlData.room_detection?.rooms || []).map(room => ({
                id: `room_${room.room_id}`,
                type: 'unknown',
                area: room.area_m2,
                perimeter: 0
            })),
            processingTime: Date.now() - startTime
        };

        floorPlan.visualizations = {
            wallMask: null,
            detectionOverlay: mlData.detection_overlay_base64 || null,
            roomSegmentation: mlData.room_detection?.room_map_base64 || null
        };

        // Store cost estimates in database
        floorPlan.costEstimates = {
            basicFinish: costs.estimates?.basic_finish || 0,
            standardFinish: costs.estimates?.standard_finish || 0,
            premiumFinish: costs.estimates?.premium_finish || 0,
            breakdown: {
                wallPaint: costs.breakdown?.wall_paint_cost || 0,
                wallPlaster: costs.breakdown?.wall_plaster_cost || 0,
                wallTiling: costs.breakdown?.wall_tiling_cost || 0,
                doors: costs.breakdown?.doors_cost || 0,
                windows: costs.breakdown?.windows_cost || 0,
                flooring: (mlData.room_detection?.total_floor_area_m2 || 0) * 20000
            },
            currency: 'LKR',
            calculatedAt: new Date()
        };

        floorPlan.status = 'detected';
        await floorPlan.save();

        // Generate BOQ Report
        const boqItems = [];

        // Add wall-related items
        if (floorPlan.mlAnalysis.walls.netSurfaceArea > 0) {
            boqItems.push({
                section: 'finishes',
                category: 'walls',
                itemName: 'Wall Painting',
                description: 'Interior wall painting with primer and two coats',
                unit: 'm²',
                quantity: floorPlan.mlAnalysis.walls.netSurfaceArea,
                unitRate: config.costRates?.wallPaintRatePerSqm || 1500,
                totalCost: costs.breakdown?.wall_paint_cost || 0,
                source: 'ml-detected'
            });
            boqItems.push({
                section: 'finishes',
                category: 'walls',
                itemName: 'Wall Plastering',
                description: 'Cement plaster finishing',
                unit: 'm²',
                quantity: floorPlan.mlAnalysis.walls.netSurfaceArea,
                unitRate: config.costRates?.wallPlasterRatePerSqm || 2500,
                totalCost: costs.breakdown?.wall_plaster_cost || 0,
                source: 'ml-detected'
            });
        }

        // Add door items
        if (floorPlan.mlAnalysis.doors.count > 0) {
            boqItems.push({
                section: 'doors_windows',
                category: 'doors',
                itemName: 'Interior Doors',
                description: 'Standard wooden doors with frames and hardware',
                unit: 'nos',
                quantity: floorPlan.mlAnalysis.doors.count,
                unitRate: config.costRates?.doorUnitCost || 75000,
                totalCost: costs.breakdown?.doors_cost || 0,
                source: 'ml-detected'
            });
        }

        // Add window items
        if (floorPlan.mlAnalysis.windows.count > 0) {
            boqItems.push({
                section: 'doors_windows',
                category: 'windows',
                itemName: 'Windows',
                description: 'Aluminum sliding windows with glass',
                unit: 'nos',
                quantity: floorPlan.mlAnalysis.windows.count,
                unitRate: config.costRates?.windowUnitCost || 45000,
                totalCost: costs.breakdown?.windows_cost || 0,
                source: 'ml-detected'
            });
        }

        // Add flooring if rooms detected
        const totalFloorArea = mlData.room_detection?.total_floor_area_m2 || 0;
        if (totalFloorArea > 0) {
            boqItems.push({
                section: 'finishes',
                category: 'flooring',
                itemName: 'Floor Tiling',
                description: 'Ceramic floor tiles with installation',
                unit: 'm²',
                quantity: totalFloorArea,
                unitRate: 20000,
                totalCost: totalFloorArea * 20000,
                source: 'ml-detected'
            });
        }

        // Calculate summary
        const totalMLCost = boqItems.reduce((sum, item) => sum + item.totalCost, 0);
        const contingencyAmount = totalMLCost * 0.1;
        const overheadAmount = totalMLCost * 0.15;
        const profitAmount = totalMLCost * 0.1;
        const grandTotal = totalMLCost + contingencyAmount + overheadAmount + profitAmount;

        const boqReport = new BOQReport({
            project: projectId,
            floorPlan: floorPlan._id,
            generatedBy: req.userId,
            title: `BOQ - ${floorPlan.name}`,
            description: `Automatically generated Bill of Quantities from floor plan analysis`,
            items: boqItems,
            summary: {
                totalMLDetectedCost: totalMLCost,
                totalManualInputCost: 0,
                subtotal: totalMLCost,
                contingencyPercent: 10,
                contingencyAmount: contingencyAmount,
                overheadPercent: 15,
                overheadAmount: overheadAmount,
                profitPercent: 10,
                profitAmount: profitAmount,
                grandTotal: grandTotal,
                currency: 'LKR'
            },
            estimates: {
                basic: costs.estimates?.basic_finish || 0,
                standard: costs.estimates?.standard_finish || 0,
                premium: costs.estimates?.premium_finish || 0
            },
            finishType: 'standard',
            status: 'draft'
        });

        await boqReport.save();
        console.log(`[FloorPlan] BOQ Report generated: ${boqReport.reportNumber}`);

        // Add floor plan reference to project
        if (!project.floorPlans.includes(floorPlan._id)) {
            project.floorPlans.push(floorPlan._id);
        }

        // Add BOQ report reference to project
        if (!project.boqReports.includes(boqReport._id)) {
            project.boqReports.push(boqReport._id);
        }

        await project.save();

        // Note: Keep the uploaded file in uploads/ — it's referenced by floorPlan.filePath
        // and needed for reanalysis, serving to frontend, etc.

        const processingTime = Date.now() - startTime;
        console.log(`[FloorPlan] Complete in ${processingTime}ms`);

        res.status(201).json({
            success: true,
            message: 'Floor plan uploaded and analyzed successfully.',
            data: {
                floorPlan: {
                    _id: floorPlan._id,
                    name: floorPlan.name,
                    floorNumber: floorPlan.floorNumber,
                    status: floorPlan.status,
                    mlAnalysis: floorPlan.mlAnalysis,
                    visualizations: floorPlan.visualizations,
                    costEstimates: floorPlan.costEstimates
                },
                boqReport: {
                    _id: boqReport._id,
                    reportNumber: boqReport.reportNumber,
                    title: boqReport.title,
                    summary: boqReport.summary,
                    itemCount: boqReport.items.length
                },
                costs,
                processingTime
            }
        });
    } catch (error) {
        console.error('[FloorPlan] Upload error:', error);

        // Clean up temp file on error
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        // If we created a floor plan record, mark it as failed
        if (req.params.projectId) {
            try {
                await FloorPlan.findOneAndUpdate(
                    { project: req.params.projectId, status: 'processing' },
                    { status: 'failed', errorMessage: error.message }
                );
            } catch (updateError) {
                console.error('[FloorPlan] Failed to update status:', updateError);
            }
        }

        res.status(500).json({
            success: false,
            message: error.response?.data?.detail || error.message || 'Failed to process floor plan.'
        });
    }
};

/**
 * Get all floor plans for a project
 * GET /api/projects/:projectId/floorplans
 */
const getFloorPlans = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const floorPlans = await FloorPlan.find({ project: projectId })
            .select('-visualizations')
            .sort({ floorNumber: 1, createdAt: -1 });

        res.json({
            success: true,
            data: { floorPlans }
        });
    } catch (error) {
        console.error('[FloorPlan] Get all error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floor plans.'
        });
    }
};

/**
 * Get a single floor plan with full details
 * GET /api/projects/:projectId/floorplans/:id
 */
const getFloorPlan = async (req, res) => {
    try {
        const { projectId, id } = req.params;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const floorPlan = await FloorPlan.findOne({ _id: id, project: projectId });

        if (!floorPlan) {
            return res.status(404).json({
                success: false,
                message: 'Floor plan not found.'
            });
        }

        // Calculate costs if processed
        let costs = null;
        if (floorPlan.mlAnalysis?.isProcessed) {
            costs = calculateCosts({
                wall_net_surface_area_m2: floorPlan.mlAnalysis.walls?.netSurfaceArea || 0,
                item_counts: {
                    doors: floorPlan.mlAnalysis.doors?.count || 0,
                    windows: floorPlan.mlAnalysis.windows?.count || 0
                }
            });
        }

        res.json({
            success: true,
            data: { floorPlan, costs }
        });
    } catch (error) {
        console.error('[FloorPlan] Get one error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floor plan.'
        });
    }
};

/**
 * Update floor plan details (name, description, manual inputs)
 * PUT /api/projects/:projectId/floorplans/:id
 */
const updateFloorPlan = async (req, res) => {
    try {
        const { projectId, id } = req.params;
        const { name, description, floorNumber, manualInputs } = req.body;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const updates = {};
        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (floorNumber !== undefined) updates.floorNumber = parseInt(floorNumber);
        if (manualInputs) updates.manualInputs = manualInputs;

        const floorPlan = await FloorPlan.findOneAndUpdate(
            { _id: id, project: projectId },
            { $set: updates },
            { new: true }
        );

        if (!floorPlan) {
            return res.status(404).json({
                success: false,
                message: 'Floor plan not found.'
            });
        }

        res.json({
            success: true,
            message: 'Floor plan updated successfully.',
            data: { floorPlan }
        });
    } catch (error) {
        console.error('[FloorPlan] Update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update floor plan.'
        });
    }
};

/**
 * Delete a floor plan
 * DELETE /api/projects/:projectId/floorplans/:id
 */
const deleteFloorPlan = async (req, res) => {
    try {
        const { projectId, id } = req.params;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const floorPlan = await FloorPlan.findOne({ _id: id, project: projectId });

        if (!floorPlan) {
            return res.status(404).json({
                success: false,
                message: 'Floor plan not found.'
            });
        }

        // Remove from project's floorPlans array
        project.floorPlans = project.floorPlans.filter(
            fpId => fpId.toString() !== id
        );
        await project.save();

        // Delete floor plan
        await FloorPlan.findByIdAndDelete(id);

        // Delete stored file if exists
        if (floorPlan.filePath && fs.existsSync(floorPlan.filePath)) {
            fs.unlinkSync(floorPlan.filePath);
        }

        res.json({
            success: true,
            message: 'Floor plan deleted successfully.'
        });
    } catch (error) {
        console.error('[FloorPlan] Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete floor plan.'
        });
    }
};

/**
 * Re-analyze a floor plan with new parameters
 * POST /api/projects/:projectId/floorplans/:id/reanalyze
 */
const reanalyzeFloorPlan = async (req, res) => {
    try {
        const { projectId, id } = req.params;
        const { scale, wallHeight } = req.body;

        // Verify project exists and belongs to user
        const project = await Project.findOne({ _id: projectId, owner: req.userId });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const floorPlan = await FloorPlan.findOne({ _id: id, project: projectId });

        if (!floorPlan) {
            return res.status(404).json({
                success: false,
                message: 'Floor plan not found.'
            });
        }

        // Update parameters if provided
        if (scale) {
            floorPlan.scale.pixelsPerMeter = parseFloat(scale);
        }
        if (wallHeight) {
            floorPlan.wallHeight = parseFloat(wallHeight);
        }

        floorPlan.status = 'processing';
        await floorPlan.save();

        // Note: In a production environment, you'd re-run the ML analysis here
        // For now, we just recalculate costs with existing data and new parameters

        if (floorPlan.mlAnalysis?.isProcessed) {
            const costs = calculateCosts({
                wall_net_surface_area_m2: floorPlan.mlAnalysis.walls?.netSurfaceArea || 0,
                item_counts: {
                    doors: floorPlan.mlAnalysis.doors?.count || 0,
                    windows: floorPlan.mlAnalysis.windows?.count || 0
                }
            });

            floorPlan.status = 'detected';
            await floorPlan.save();

            res.json({
                success: true,
                message: 'Floor plan parameters updated and costs recalculated.',
                data: { floorPlan, costs }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Floor plan has not been analyzed yet.'
            });
        }
    } catch (error) {
        console.error('[FloorPlan] Reanalyze error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reanalyze floor plan.'
        });
    }
};

module.exports = {
    uploadFloorPlan,
    getFloorPlans,
    getFloorPlan,
    updateFloorPlan,
    deleteFloorPlan,
    reanalyzeFloorPlan
};
