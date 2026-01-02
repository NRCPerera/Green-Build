import { Form, Row, Col, message } from 'antd';
import { UploadForm, ResultsPanel, ManualInputPanel } from '../../components';
import { useFloorPlanUpload, useFileUpload, useManualInput } from '../../../controllers';
import useProjectStore from '../../../models/useProjectStore';
import { useEffect } from 'react';

/**
 * Quantity Takeoff View Component
 */
const QuantityTakeoffView = () => {
    const [form] = Form.useForm();

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

    const handleSubmit = async (values) => {
        if (!hasFile) {
            message.error('Please upload a floor plan image');
            return;
        }
        const imageFile = getFile();
        await processFloorPlan(imageFile, values.scale, values.wallHeight);
    };

    return (
        <div className="quantity-takeoff-module">
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={10} xl={8}>
                    <UploadForm
                        form={form}
                        fileList={fileList}
                        previewImage={previewImage}
                        loading={loading}
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
                </Col>
            </Row>
        </div>
    );
};

export default QuantityTakeoffView;
