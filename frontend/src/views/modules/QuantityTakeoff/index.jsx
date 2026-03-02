import { Form, Row, Col, message, Tabs } from 'antd';
import { UploadForm, ResultsPanel, ManualInputPanel, FloorPlan3DViewer } from '../../components';
import { useFloorPlanUpload, useFileUpload, useManualInput } from '../../../controllers';
import useProjectStore from '../../../models/useProjectStore';
import { useEffect, useState, useCallback } from 'react';
import { generate3DGeometry, parseApiError } from '../../../services/apiService';
import { EyeOutlined, TableOutlined } from '@ant-design/icons';

/**
 * Quantity Takeoff View Component
 * Now includes 3D floor plan visualization
 */
const QuantityTakeoffView = () => {
    const [form] = Form.useForm();

    // 3D Geometry state
    const [geometry3D, setGeometry3D] = useState(null);
    const [loading3D, setLoading3D] = useState(false);

    // Use existing controllers
    const {
        loading,
        loadingProgress,
        results,
        error,
        processFloorPlan,
        clearError
    } = useFloorPlanUpload();

    const {
        fileList,
        previewImage,
        hasFile,
        handleFileChange,
        beforeUpload,
        getFile
    } = useFileUpload();

    const {
        inputs: manualInputs,
        updateInput: updateManualInput,
        costs: manualCosts,
        hasInputs: hasManualInputs
    } = useManualInput();

    // Store actions for saving to global state
    const setQuantityResult = useProjectStore((state) => state.setQuantityResult);

    // When results are received, save to global store for other modules
    useEffect(() => {
        if (results) {
            setQuantityResult(results);
            console.log('[QuantityTakeoff] Results saved to global store for other modules');
        }
    }, [results, setQuantityResult]);

    // Generate 3D geometry after successful quantity takeoff
    const generate3DView = useCallback(async (imageFile, scale, wallHeight) => {
        setLoading3D(true);
        try {
            const response = await generate3DGeometry(imageFile, scale, wallHeight);
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
    }, []);

    const handleSubmit = async (values) => {
        if (!hasFile) {
            message.error('Please upload a floor plan image');
            return;
        }
        const imageFile = getFile();

        // Process floor plan for quantities
        await processFloorPlan(imageFile, values.scale, values.wallHeight);

        // Also generate 3D geometry (in parallel or after)
        // We need a fresh file reference since the first one may be consumed
        const imageFileFor3D = getFile();
        generate3DView(imageFileFor3D, values.scale, values.wallHeight);
    };

    const tabItems = [
        {
            key: 'results',
            label: (
                <span>
                    <TableOutlined />
                    Analysis Results
                </span>
            ),
            children: (
                <ResultsPanel
                    results={results}
                    loading={loading}
                    error={error}
                    onErrorClose={clearError}
                    manualInputs={manualInputs}
                    manualCosts={manualCosts}
                    hasManualInputs={hasManualInputs}
                    previewImage={previewImage}
                />
            )
        },
        {
            key: '3d',
            label: (
                <span>
                    <EyeOutlined />
                    3D View
                </span>
            ),
            children: (
                <FloorPlan3DViewer
                    floorplanData={geometry3D}
                    loading={loading3D}
                />
            )
        }
    ];

    return (
        <div className="quantity-takeoff-module">
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={10} xl={8}>
                    <UploadForm
                        form={form}
                        fileList={fileList}
                        previewImage={previewImage}
                        loading={loading || loading3D}
                        loadingProgress={loadingProgress}
                        onFileChange={handleFileChange}
                        beforeUpload={beforeUpload}
                        onSubmit={handleSubmit}
                    />
                    <ManualInputPanel
                        inputs={manualInputs}
                        onUpdate={updateManualInput}
                        costs={manualCosts}
                    />
                </Col>
                <Col xs={24} lg={14} xl={16}>
                    <Tabs
                        defaultActiveKey="results"
                        type="card"
                        items={tabItems}
                        className="quantity-takeoff-tabs"
                    />
                </Col>
            </Row>
        </div>
    );
};

export default QuantityTakeoffView;
