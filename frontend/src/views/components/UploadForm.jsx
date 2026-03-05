/**
 * Upload Form Component
 * 
 * Renders the input form for floor plan uploads and parameters.
 * Includes file upload, scale input, and wall height configuration.
 */

import {
    Card,
    Form,
    InputNumber,
    Button,
    Upload,
    Divider,
    Typography,
    Space,
    Tooltip,
    Progress,
    Image,
    Spin
} from 'antd';
import {
    CalculatorOutlined,
    FileImageOutlined,
    InboxOutlined,
    InfoCircleOutlined,
    BorderOutlined
} from '@ant-design/icons';
import { defaultFormValues } from '../../models/boqModel';

const { Text } = Typography;
const { Dragger } = Upload;

/**
 * Form component for uploading floor plans and configuring parameters.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.form - Ant Design form instance
 * @param {Array} props.fileList - List of uploaded files
 * @param {string|null} props.previewImage - Preview URL for uploaded image
 * @param {boolean} props.loading - Whether processing is in progress
 * @param {number} props.loadingProgress - Current progress percentage
 * @param {Function} props.onFileChange - Handler for file selection changes
 * @param {Function} props.beforeUpload - Handler for file validation
 * @param {Function} props.onSubmit - Handler for form submission
 */
const UploadForm = ({
    form,
    fileList,
    previewImage,
    loading,
    loadingProgress,
    onFileChange,
    beforeUpload,
    onSubmit
}) => {
    return (
        <Card
            className="input-card glass-card"
            title={
                <Space>
                    <CalculatorOutlined />
                    <span>Project Input</span>
                </Space>
            }
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={onSubmit}
                initialValues={defaultFormValues}
            >
                {/* File upload section */}
                <Form.Item
                    label={
                        <Space>
                            <FileImageOutlined />
                            <span>Floor Plan Image</span>
                        </Space>
                    }
                    required
                >
                    <Dragger
                        name="file"
                        fileList={fileList}
                        onChange={onFileChange}
                        beforeUpload={beforeUpload}
                        accept="image/*"
                        maxCount={1}
                        className="upload-dragger"
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ color: '#00d9ff', fontSize: '48px' }} />
                        </p>
                        <p className="ant-upload-text">
                            Click or drag floor plan to upload
                        </p>
                        <p className="ant-upload-hint">
                            Supports PNG, JPG, TIFF (Max 50MB)
                        </p>
                    </Dragger>
                </Form.Item>

                {/* Scale input with help tooltip */}
                <Form.Item
                    name="scale"
                    label={
                        <Space>
                            <span>Scale (Pixels per Meter)</span>
                            <Tooltip
                                title={
                                    <div>
                                        <p><strong>How to calculate:</strong></p>
                                        <ol style={{ paddingLeft: '16px', margin: 0 }}>
                                            <li>Find a known dimension in your drawing (for example, a 1m door is typically 0.9m wide)</li>
                                            <li>Measure its width in pixels using any image editor</li>
                                            <li>Divide pixels by meters</li>
                                        </ol>
                                        <p style={{ marginTop: '8px' }}><strong>Example:</strong> If 0.9m = 90px, then PPM = 90/0.9 = 100</p>
                                    </div>
                                }
                                placement="right"
                                overlayStyle={{ maxWidth: '350px' }}
                            >
                                <InfoCircleOutlined style={{ color: '#00d9ff', cursor: 'pointer' }} />
                            </Tooltip>
                        </Space>
                    }
                    rules={[
                        { required: true, message: 'Please enter scale' },
                        { type: 'number', min: 1, message: 'Scale must be positive' }
                    ]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        placeholder="e.g., 100"
                        min={1}
                        max={1000}
                        addonAfter="px/m"
                    />
                </Form.Item>

                {/* Wall height input */}
                <Form.Item
                    name="wallHeight"
                    label={
                        <Space>
                            <BorderOutlined />
                            <span>Wall Height</span>
                        </Space>
                    }
                    rules={[
                        { required: true, message: 'Please enter wall height' },
                        { type: 'number', min: 0.1, message: 'Height must be positive' }
                    ]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        placeholder="e.g., 2.7"
                        min={0.1}
                        max={20}
                        step={0.1}
                        precision={2}
                        addonAfter="meters"
                    />
                </Form.Item>

                {/* Submit button */}
                <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        icon={<CalculatorOutlined />}
                        size="large"
                        block
                        className="submit-button"
                    >
                        {loading ? 'Processing...' : 'Analyze Floor Plan'}
                    </Button>
                </Form.Item>

                {/* Progress indicator during processing */}
                {loading && (
                    <div style={{ marginTop: '16px' }}>
                        <Progress
                            percent={Math.round(loadingProgress)}
                            strokeColor={{
                                '0%': '#00d9ff',
                                '100%': '#52c41a',
                            }}
                            status="active"
                        />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            Analyzing floor plan with AI models...
                        </Text>
                    </div>
                )}
            </Form>

            {/* Preview of uploaded image */}
            {previewImage && (
                <>
                    <Divider />
                    <div className="preview-section">
                        <Text type="secondary" style={{ marginBottom: '8px', display: 'block' }}>
                            <FileImageOutlined /> Uploaded Image Preview
                        </Text>
                        <Image
                            src={previewImage}
                            alt="Floor Plan Preview"
                            className="preview-image"
                            placeholder={<Spin />}
                        />
                    </div>
                </>
            )}
        </Card>
    );
};

export default UploadForm;
