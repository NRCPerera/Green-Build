import { Form } from 'antd';
import { Layout, ConfigProvider, Row, Col, message } from 'antd';
import customTheme from './views/theme';
import { Header, Footer, UploadForm, ResultsPanel } from './views/components';
import { useFloorPlanUpload, useFileUpload } from './controllers';

const { Content } = Layout;

function App() {
  const [form] = Form.useForm();

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

  const handleSubmit = async (values) => {
    if (!hasFile) {
      message.error('Please upload a floor plan image');
      return;
    }
    const imageFile = getFile();
    await processFloorPlan(imageFile, values.scale, values.wallHeight);
  };

  return (
    <ConfigProvider theme={customTheme}>
      <Layout className="app-layout">
        <Header />
        <Content className="app-content">
          <div className="content-wrapper">
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
              </Col>
              <Col xs={24} lg={14} xl={16}>
                <ResultsPanel
                  results={results}
                  loading={loading}
                  error={error}
                  onErrorClose={clearError}
                />
              </Col>
            </Row>
          </div>
        </Content>
        <Footer />
      </Layout>
    </ConfigProvider>
  );
}

export default App;
