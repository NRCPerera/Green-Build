/**
 * Green Build - Quantity Takeoff System
 * =====================================
 * Professional construction estimation interface
 * 
 * @author Senior Frontend Developer
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import {
  Layout,
  Card,
  Form,
  InputNumber,
  Button,
  Upload,
  Table,
  Spin,
  Typography,
  Row,
  Col,
  Statistic,
  Divider,
  Alert,
  Space,
  Tooltip,
  Tag,
  ConfigProvider,
  theme,
  message,
  Image,
  Progress,
  Empty
} from 'antd';
import {
  UploadOutlined,
  InboxOutlined,
  CalculatorOutlined,
  FileImageOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  BorderOutlined,
  AppstoreOutlined,
  DollarOutlined,
  AreaChartOutlined,
  BuildOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

// API Configuration
const API_BASE_URL = 'http://localhost:5000';

// Custom Theme
const customTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#00d9ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Card: {
      colorBgContainer: 'rgba(30, 41, 59, 0.8)',
      colorBorder: 'rgba(0, 217, 255, 0.2)',
    },
    Table: {
      colorBgContainer: 'rgba(30, 41, 59, 0.6)',
      headerBg: 'rgba(0, 217, 255, 0.1)',
    },
    Button: {
      primaryShadow: '0 4px 15px rgba(0, 217, 255, 0.3)',
    },
    Layout: {
      headerBg: 'rgba(15, 23, 42, 0.95)',
      bodyBg: 'transparent',
    }
  }
};

function App() {
  // Form state
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  // Loading & Results state
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // File upload handlers
  const handleFileChange = useCallback(({ fileList: newFileList }) => {
    // Only keep the latest file
    const latestFile = newFileList.slice(-1);
    setFileList(latestFile);

    // Generate preview
    if (latestFile.length > 0 && latestFile[0].originFileObj) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(latestFile[0].originFileObj);
    } else {
      setPreviewImage(null);
    }
  }, []);

  const beforeUpload = useCallback((file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return Upload.LIST_IGNORE;
    }
    const isLt50M = file.size / 1024 / 1024 < 50;
    if (!isLt50M) {
      message.error('Image must be smaller than 50MB!');
      return Upload.LIST_IGNORE;
    }
    return false; // Prevent auto upload
  }, []);

  // Form submission
  const handleSubmit = async (values) => {
    if (fileList.length === 0) {
      message.error('Please upload a floor plan image');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setLoadingProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append('image', fileList[0].originFileObj);
      formData.append('scale', values.scale);
      formData.append('wallHeight', values.wallHeight);

      const response = await axios.post(
        `${API_BASE_URL}/api/upload-plan`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000 // 2 minute timeout
        }
      );

      clearInterval(progressInterval);
      setLoadingProgress(100);

      if (response.data.success) {
        setResults(response.data.data);
        message.success('Quantity takeoff completed successfully!');
      } else {
        throw new Error(response.data.message || 'Unknown error occurred');
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('API Error:', err);

      let errorMessage = 'Failed to process the floor plan';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to the backend server. Please ensure it is running on port 5000.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The image may be too complex.';
      }

      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Generate BOQ table data
  const generateBOQData = () => {
    if (!results) return [];

    const { quantities, costs } = results;
    const rates = costs.rates_used;

    return [
      {
        key: '1',
        item: 'Wall Surface Area (Gross)',
        description: 'Total wall area before deductions',
        quantity: quantities.wall_gross_surface_area_m2,
        unit: 'm²',
        rate: '-',
        total: '-',
        type: 'measurement'
      },
      {
        key: '2',
        item: 'Doors & Windows (Deductions)',
        description: 'Openings to be subtracted',
        quantity: quantities.deductions_area_m2,
        unit: 'm²',
        rate: '-',
        total: '-',
        type: 'deduction'
      },
      {
        key: '3',
        item: 'Wall Surface Area (Net)',
        description: 'Final paintable/workable area',
        quantity: quantities.wall_net_surface_area_m2,
        unit: 'm²',
        rate: '-',
        total: '-',
        type: 'subtotal'
      },
      {
        key: '4',
        item: 'Wall Painting - Basic Finish',
        description: 'Standard emulsion paint, 2 coats',
        quantity: quantities.wall_net_surface_area_m2,
        unit: 'm²',
        rate: `$${rates.wall_paint_rate_per_m2.toFixed(2)}`,
        total: `$${costs.breakdown.wall_paint_cost.toFixed(2)}`,
        type: 'work'
      },
      {
        key: '5',
        item: 'Wall Plastering',
        description: 'Cement plaster, 12mm thick',
        quantity: quantities.wall_net_surface_area_m2,
        unit: 'm²',
        rate: `$${rates.wall_plaster_rate_per_m2.toFixed(2)}`,
        total: `$${costs.breakdown.wall_plaster_cost.toFixed(2)}`,
        type: 'work'
      },
      {
        key: '6',
        item: 'Wall Tiling - Premium',
        description: 'Ceramic tiles with grouting',
        quantity: quantities.wall_net_surface_area_m2,
        unit: 'm²',
        rate: `$${rates.wall_tiling_rate_per_m2.toFixed(2)}`,
        total: `$${costs.breakdown.wall_tiling_cost.toFixed(2)}`,
        type: 'work'
      },
      {
        key: '7',
        item: 'Doors',
        description: 'Standard interior doors with frames',
        quantity: quantities.item_counts.doors,
        unit: 'nos',
        rate: `$${rates.door_unit_cost.toFixed(2)}`,
        total: `$${costs.breakdown.doors_cost.toFixed(2)}`,
        type: 'item'
      },
      {
        key: '8',
        item: 'Windows',
        description: 'Standard aluminum windows with glass',
        quantity: quantities.item_counts.windows,
        unit: 'nos',
        rate: `$${rates.window_unit_cost.toFixed(2)}`,
        total: `$${costs.breakdown.windows_cost.toFixed(2)}`,
        type: 'item'
      }
    ];
  };

  // Table columns
  const columns = [
    {
      title: 'S.No',
      dataIndex: 'key',
      key: 'key',
      width: 60,
      align: 'center',
      render: (text, record) => (
        <span style={{
          color: record.type === 'subtotal' ? '#00d9ff' : 'inherit',
          fontWeight: record.type === 'subtotal' ? 600 : 400
        }}>
          {text}
        </span>
      )
    },
    {
      title: 'Item Description',
      dataIndex: 'item',
      key: 'item',
      render: (text, record) => (
        <div>
          <Text strong style={{
            color: record.type === 'subtotal' ? '#00d9ff' :
              record.type === 'deduction' ? '#ff6b6b' : 'inherit'
          }}>
            {text}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (val, record) => (
        <Text strong style={{
          color: record.type === 'deduction' ? '#ff6b6b' :
            record.type === 'subtotal' ? '#00d9ff' : '#52c41a'
        }}>
          {typeof val === 'number' ? val.toFixed(2) : val}
        </Text>
      )
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
      align: 'center'
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: 100,
      align: 'right'
    },
    {
      title: 'Amount',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (text) => (
        <Text strong style={{ color: text !== '-' ? '#52c41a' : 'inherit' }}>
          {text}
        </Text>
      )
    }
  ];

  return (
    <ConfigProvider theme={customTheme}>
      <Layout className="app-layout">
        {/* Header */}
        <Header className="app-header">
          <div className="header-content">
            <div className="logo">
              <BuildOutlined className="logo-icon" />
              <span className="logo-text">Green Build</span>
              <Tag color="cyan" className="beta-tag">BETA</Tag>
            </div>
            <div className="header-nav">
              <Text type="secondary">AI-Powered Quantity Takeoff System</Text>
            </div>
          </div>
        </Header>

        {/* Main Content */}
        <Content className="app-content">
          <div className="content-wrapper">
            <Row gutter={[24, 24]}>
              {/* Left Panel - Input Form */}
              <Col xs={24} lg={10} xl={8}>
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
                    onFinish={handleSubmit}
                    initialValues={{
                      scale: 100,
                      wallHeight: 2.7
                    }}
                  >
                    {/* File Upload */}
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
                        onChange={handleFileChange}
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

                    {/* Scale Input */}
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
                                  <li>Find a known dimension in your drawing (e.g., a 1m door is typically 0.9m wide)</li>
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

                    {/* Wall Height Input */}
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

                    {/* Submit Button */}
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
                        {loading ? 'Processing...' : 'Generate BOQ'}
                      </Button>
                    </Form.Item>

                    {/* Loading Progress */}
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


                  {/* Preview Image */}
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
              </Col>

              {/* Right Panel - Results */}
              <Col xs={24} lg={14} xl={16}>
                {/* Error Display */}
                {error && (
                  <Alert
                    message="Processing Error"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setError(null)}
                    style={{ marginBottom: '24px' }}
                  />
                )}

                {/* Loading State */}
                {loading && (
                  <Card className="results-card glass-card loading-card">
                    <div className="loading-container">
                      <Spin size="large" />
                      <Title level={4} style={{ marginTop: '24px', color: '#00d9ff' }}>
                        Processing Floor Plan
                      </Title>
                      <Paragraph type="secondary">
                        Our AI is analyzing walls, doors, and windows...
                      </Paragraph>
                    </div>
                  </Card>
                )}

                {/* Results Display */}
                {results && !loading && (
                  <>
                    {/* Summary Statistics */}
                    <Card className="summary-card glass-card" style={{ marginBottom: '24px' }}>
                      <Row gutter={[16, 16]}>
                        <Col xs={12} sm={6}>
                          <Statistic
                            title="Wall Length"
                            value={results.quantities.wall_total_length_m}
                            precision={2}
                            suffix="m"
                            prefix={<BorderOutlined />}
                            valueStyle={{ color: '#00d9ff' }}
                          />
                        </Col>
                        <Col xs={12} sm={6}>
                          <Statistic
                            title="Net Wall Area"
                            value={results.quantities.wall_net_surface_area_m2}
                            precision={2}
                            suffix="m²"
                            prefix={<AppstoreOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col xs={12} sm={6}>
                          <Statistic
                            title="Doors"
                            value={results.quantities.item_counts.doors}
                            prefix={<HomeOutlined />}
                            valueStyle={{ color: '#faad14' }}
                          />
                        </Col>
                        <Col xs={12} sm={6}>
                          <Statistic
                            title="Windows"
                            value={results.quantities.item_counts.windows}
                            prefix={<BorderOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                          />
                        </Col>
                      </Row>
                    </Card>

                    {/* BOQ Table */}
                    <Card
                      className="boq-card glass-card"
                      title={
                        <Space>
                          <AreaChartOutlined />
                          <span>Bill of Quantities (BOQ)</span>
                        </Space>
                      }
                      extra={
                        <Tag color="green" icon={<CheckCircleOutlined />}>
                          Analysis Complete
                        </Tag>
                      }
                    >
                      <Table
                        columns={columns}
                        dataSource={generateBOQData()}
                        pagination={false}
                        size="middle"
                        className="boq-table"
                        summary={() => (
                          <Table.Summary fixed>
                            <Table.Summary.Row className="summary-row">
                              <Table.Summary.Cell index={0} colSpan={5}>
                                <Text strong style={{ fontSize: '16px' }}>
                                  <DollarOutlined /> Estimated Project Costs
                                </Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={1}>
                                <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>

                                </Text>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          </Table.Summary>
                        )}
                      />

                      {/* Cost Estimates */}
                      <Divider />
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={8}>
                          <Card size="small" className="estimate-card basic">
                            <Statistic
                              title="Basic Finish"
                              value={results.costs.estimates.basic_finish}
                              precision={2}
                              prefix="$"
                              valueStyle={{ color: '#52c41a' }}
                            />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Painting + Doors/Windows
                            </Text>
                          </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Card size="small" className="estimate-card standard">
                            <Statistic
                              title="Standard Finish"
                              value={results.costs.estimates.standard_finish}
                              precision={2}
                              prefix="$"
                              valueStyle={{ color: '#1890ff' }}
                            />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Plastering + Doors/Windows
                            </Text>
                          </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Card size="small" className="estimate-card premium">
                            <Statistic
                              title="Premium Finish"
                              value={results.costs.estimates.premium_finish}
                              precision={2}
                              prefix="$"
                              valueStyle={{ color: '#faad14' }}
                            />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Tiling + Doors/Windows
                            </Text>
                          </Card>
                        </Col>
                      </Row>

                      {/* Processing Info */}
                      <Divider />
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Space>
                            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                            <Text type="secondary">
                              Processed in {results.input_parameters?.file_size_kb?.toFixed(1) || 'N/A'} KB •
                              Scale: {results.input_parameters?.scale_ppm} px/m •
                              Height: {results.input_parameters?.wall_height_m}m
                            </Text>
                          </Space>
                        </Col>
                        <Col>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {new Date().toLocaleString()}
                          </Text>
                        </Col>
                      </Row>
                    </Card>
                  </>
                )}

                {/* Empty State */}
                {!results && !loading && !error && (
                  <Card className="empty-card glass-card">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <div>
                          <Title level={4} style={{ color: '#64748b' }}>
                            Ready to Analyze
                          </Title>
                          <Paragraph type="secondary">
                            Upload a floor plan image and configure the parameters on the left to generate a Bill of Quantities.
                          </Paragraph>
                        </div>
                      }
                    />
                  </Card>
                )}
              </Col>
            </Row>
          </div>
        </Content>

        {/* Footer */}
        <Footer className="app-footer">
          <Text type="secondary">
            Green Build © {new Date().getFullYear()} • AI-Powered Construction Estimation
          </Text>
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
