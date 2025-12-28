/**
 * Header Component
 * 
 * Displays the application header with logo and navigation.
 */

import { Layout, Tag, Typography, Space } from 'antd';
import { BuildOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Text } = Typography;

/**
 * Application header component with branding and navigation elements.
 */
const AppHeader = () => {
    return (
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
    );
};

export default AppHeader;
