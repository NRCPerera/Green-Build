import { Form, Row, Col, message, Steps, Button, Card, Space, Typography, Divider, Alert } from 'antd';
import { UploadForm, ResultsPanel, FloorPlan3DViewer } from '../../components';
import { useFloorPlanUpload, useFileUpload } from '../../../controllers';
import useProjectStore from '../../../models/useProjectStore';
import { useEffect, useState, useCallback } from 'react';
import { generate3DGeometry, confirmDetections as apiConfirmDetections, generateBOQ as apiGenerateBOQ, parseApiError } from '../../../services/apiService';
import {
    UploadOutlined,
    EyeOutlined,
    EditOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    LoadingOutlined,
} from '@ant-design/icons';
import DetectionReviewPanel from './DetectionReviewPanel';
import ManualInputStep from './ManualInputStep';
import BOQResultView from './BOQResultView';

const { Title, Text, Paragraph } = Typography;

/**
 * Quantity Takeoff View — Stepped Wizard Workflow
 *
 *  Step 0: Upload floor plan + set scale/height
 *  Step 1: ML processes → shows detected elements for review
 *  Step 2: User provides manual inputs (earthworks, MEP, overrides)
 *  Step 3: Full BOQ (A–F) + 3D model displayed
 */
const QuantityTakeoffView = () => {
    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);

    // 3D Geometry state
    const [geometry3D, setGeometry3D] = useState(null);
    const [loading3D, setLoading3D] = useState(false);

    // Manual inputs for BOQ generation (collected in step 2)
    const [manualInputs, setManualInputs] = useState({});

    // User-edited detections from the Review panel (step 1)
    const [editedDetections, setEditedDetections] = useState(null);

    // Confirmed detections (output of step 1 review)
    const [confirmedDetections, setConfirmedDetections] = useState(null);

    // Material selections from step 2
    const [materialSelections, setMaterialSelections] = useState({});

    // Backend-generated BOQ data
    const [boqData, setBoqData] = useState(null);
    const [loadingBOQ, setLoadingBOQ] = useState(false);

    // Uploaded file params (persisted across steps)
    const [uploadParams, setUploadParams] = useState({ scale: 100, wallHeight: 2.7 });

    // Use existing controllers
    const {
        loading,
        loadingProgress,
        results,
        error,
        processFloorPlan,
        clearError,
        reset: resetUpload
    } = useFloorPlanUpload();

    const {
        fileList,
        previewImage,
        hasFile,
        handleFileChange,
        beforeUpload,
        getFile,
        clearFile
    } = useFileUpload();

    // Store actions for saving to global state
    const setQuantityResult = useProjectStore((state) => state.setQuantityResult);

    // When results are received, save to global store
    useEffect(() => {
        if (results) {
            setQuantityResult(results);
        }
    }, [results, setQuantityResult]);

    // Auto-advance to step 1 when ML results arrive
    useEffect(() => {
        if (results && currentStep === 0) {
            setCurrentStep(1);
        }
    }, [results, currentStep]);

    // ── Step 0: Upload & Process ─────────────────────────────────

    const handleUploadSubmit = async (values) => {
        if (!hasFile) {
            message.error('Please upload a floor plan image');
            return;
        }
        const imageFile = getFile();
        setUploadParams({ scale: values.scale, wallHeight: values.wallHeight });

        // Process floor plan for quantities via ML
        await processFloorPlan(imageFile, values.scale, values.wallHeight);
    };

    // ── Step 1 → Step 2: Confirm detections ─────────────────────

    const handleConfirmDetections = useCallback(async () => {
        if (!results) return;

        // Use user-edited detections from the Review panel (if available)
        // Otherwise build from raw ML results
        const detections = editedDetections || {
            walls: {
                totalLengthM: results.quantities?.wall_total_length_m || results.detections?.walls?.totalLengthM || 0,
                grossAreaM2: results.quantities?.wall_gross_surface_area_m2 || results.detections?.walls?.grossAreaM2 || 0,
                netAreaM2: results.quantities?.wall_net_surface_area_m2 || results.detections?.walls?.netAreaM2 || 0,
                heightM: uploadParams.wallHeight
            },
            doors: Array.from(
                { length: results.quantities?.item_counts?.doors || results.detections?.doors || 0 },
                (_, i) => ({ id: `d${i + 1}`, type: 'wooden', materialType: 'standard', status: 'approved' })
            ),
            windows: Array.from(
                { length: results.quantities?.item_counts?.windows || results.detections?.windows || 0 },
                (_, i) => ({ id: `w${i + 1}`, type: 'aluminium', materialType: 'standard', status: 'approved' })
            ),
            rooms: (results.room_detection?.rooms || results.detections?.rooms?.rooms || []).map((r, i) => ({
                id: `r${i + 1}`,
                type: 'unknown',
                area: r.area_m2 || r.area || 0,
                flooringMaterial: 'ceramic_tile',
                ceilingType: 'plain'
            })),
            additionalInputs: manualInputs
        };

        try {
            const resp = await apiConfirmDetections(detections);
            if (resp.success) {
                setConfirmedDetections(resp.data.confirmedDetections);
                message.success('Detections confirmed!');
            }
        } catch (err) {
            // Still allow proceeding even if backend save fails (use local data)
            setConfirmedDetections(detections);
            console.warn('Could not save detections to backend:', err);
        }

        setCurrentStep(2);
    }, [results, editedDetections, manualInputs, uploadParams]);

    // ── Step 2 → Step 3: Generate BOQ & 3D ──────────────────────

    const handleGenerateBOQ = useCallback(async () => {
        setCurrentStep(3);
        setLoadingBOQ(true);

        // Merge manual inputs + material selections into confirmed detections
        const detectionsForBOQ = {
            ...(confirmedDetections || {}),
            additionalInputs: {
                ...(confirmedDetections?.additionalInputs || {}),
                ...manualInputs
            }
        };

        // Build material selections from both the manual step dropdowns and manualInputs
        const mats = {
            ...materialSelections,
            masonryType: manualInputs.masonryType || materialSelections.masonryType,
            doorType: manualInputs.doorType || materialSelections.doorType,
            windowType: manualInputs.windowType || materialSelections.windowType,
        };

        // Generate BOQ via backend Rate Engine
        try {
            const boqResp = await apiGenerateBOQ(detectionsForBOQ, mats);
            if (boqResp.success) {
                setBoqData(boqResp.data.boqReport);
                message.success('BOQ generated with dynamic rates!');
            } else {
                throw new Error(boqResp.message || 'BOQ generation failed');
            }
        } catch (err) {
            console.error('BOQ Generation Error:', err);
            message.warning('Backend BOQ generation failed — using local calculation: ' + parseApiError(err));
            setBoqData(null); // Falls back to local generateFullBOQ in BOQResultView
        } finally {
            setLoadingBOQ(false);
        }

        // Generate 3D geometry in parallel
        const imageFile = getFile();
        if (imageFile) {
            setLoading3D(true);
            try {
                const response = await generate3DGeometry(imageFile, uploadParams.scale, uploadParams.wallHeight);
                if (response.success) {
                    setGeometry3D(response.data);
                    message.success('3D visualization generated!');
                } else {
                    throw new Error(response.message || 'Failed to generate 3D view');
                }
            } catch (err) {
                console.error('3D Geometry Error:', err);
                message.warning('Could not generate 3D view: ' + parseApiError(err));
                setGeometry3D(null);
            } finally {
                setLoading3D(false);
            }
        }
    }, [confirmedDetections, manualInputs, getFile, uploadParams]);

    // ── Navigation ───────────────────────────────────────────────

    const canGoNext = () => {
        switch (currentStep) {
            case 0: return !!results;
            case 1: return !!results;
            case 2: return true;
            case 3: return false;
            default: return false;
        }
    };

    const handleNext = () => {
        if (currentStep === 1) {
            handleConfirmDetections();
        } else if (currentStep === 2) {
            handleGenerateBOQ();
        } else {
            setCurrentStep(prev => Math.min(prev + 1, 3));
        }
    };

    const handlePrev = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const handleStartOver = () => {
        setCurrentStep(0);
        resetUpload();
        clearFile();
        setGeometry3D(null);
        setManualInputs({});
        setEditedDetections(null);
        setConfirmedDetections(null);
        setMaterialSelections({});
        setBoqData(null);
        form.resetFields();
    };

    // ── Step definitions ────────────────────────────────────────

    const steps = [
        {
            title: 'Upload',
            icon: <UploadOutlined />,
            description: 'Upload floor plan'
        },
        {
            title: 'Review',
            icon: results && currentStep >= 1 ? <CheckCircleOutlined /> : <EyeOutlined />,
            description: 'Review detections'
        },
        {
            title: 'Inputs',
            icon: <EditOutlined />,
            description: 'Additional inputs'
        },
        {
            title: 'BOQ & 3D',
            icon: <FileTextOutlined />,
            description: 'View results'
        }
    ];

    // ── Step content ────────────────────────────────────────────

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={14} xl={12}>
                            <UploadForm
                                form={form}
                                fileList={fileList}
                                previewImage={previewImage}
                                loading={loading}
                                loadingProgress={loadingProgress}
                                onFileChange={handleFileChange}
                                beforeUpload={beforeUpload}
                                onSubmit={handleUploadSubmit}
                            />
                        </Col>
                        <Col xs={24} lg={10} xl={12}>
                            <Card className="glass-card" style={{ minHeight: 300 }}>
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <UploadOutlined style={{ fontSize: 64, color: '#00d9ff', opacity: 0.3 }} />
                                    <Title level={4} style={{ color: '#64748b', marginTop: 24 }}>
                                        Upload Your Floor Plan
                                    </Title>
                                    <Paragraph type="secondary" style={{ maxWidth: 400, margin: '0 auto' }}>
                                        Upload a floor plan image, set the scale and wall height,
                                        then click <strong>"Analyze Floor Plan"</strong> to start AI detection.
                                    </Paragraph>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                );

            case 1:
                return (
                    <DetectionReviewPanel
                        results={results}
                        previewImage={previewImage}
                        loading={loading}
                        error={error}
                        onErrorClose={clearError}
                        onDetectionsUpdate={setEditedDetections}
                    />
                );

            case 2:
                return (
                    <ManualInputStep
                        mlResults={results}
                        manualInputs={manualInputs}
                        onUpdate={(field, value) => {
                            setManualInputs(prev => ({ ...prev, [field]: value }));
                        }}
                        materialSelections={materialSelections}
                        onMaterialUpdate={(key, value) => {
                            setMaterialSelections(prev => ({ ...prev, [key]: value }));
                            setManualInputs(prev => ({ ...prev, [key]: value }));
                        }}
                    />
                );

            case 3:
                return (
                    <BOQResultView
                        mlResults={results}
                        manualInputs={manualInputs}
                        geometry3D={geometry3D}
                        loading3D={loading3D}
                        loadingBOQ={loadingBOQ}
                        boqData={boqData}
                        previewImage={previewImage}
                        onStartOver={handleStartOver}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="quantity-takeoff-module">
            {/* Steps Header */}
            <Card className="glass-card" style={{ marginBottom: 24 }}>
                <Steps
                    current={currentStep}
                    items={steps.map((s, i) => ({
                        ...s,
                        status: i < currentStep ? 'finish' : i === currentStep ? 'process' : 'wait',
                        icon: loading && i === 0 && currentStep === 0 ? <LoadingOutlined /> : s.icon
                    }))}
                    style={{ maxWidth: 800, margin: '0 auto' }}
                />
            </Card>

            {/* Step Content */}
            {renderStepContent()}

            {/* Navigation Footer — hidden on step 3 (BOQ has its own toolbar) */}
            {currentStep < 3 && (
                <Card className="glass-card" style={{ marginTop: 24 }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            {currentStep > 0 && (
                                <Button
                                    icon={<ArrowLeftOutlined />}
                                    onClick={handlePrev}
                                    size="large"
                                >
                                    Previous
                                </Button>
                            )}
                        </Col>
                        <Col>
                            <Text type="secondary">
                                Step {currentStep + 1} of {steps.length}
                            </Text>
                        </Col>
                        <Col>
                            {currentStep < 3 && (
                                <Button
                                    type="primary"
                                    onClick={handleNext}
                                    disabled={!canGoNext()}
                                    size="large"
                                    className="submit-button"
                                >
                                    {currentStep === 2 ? 'Generate BOQ & 3D' : 'Next'}
                                    <ArrowRightOutlined />
                                </Button>
                            )}
                        </Col>
                    </Row>
                </Card>
            )}
        </div>
    );
};

export default QuantityTakeoffView;
