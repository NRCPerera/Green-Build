/**
 * Footer Component
 * 
 * Displays the application footer with copyright information.
 */

import { Layout, Typography } from 'antd';

const { Footer } = Layout;
const { Text } = Typography;

/**
 * Application footer component with copyright text.
 */
const AppFooter = () => {
    return (
        <Footer className="app-footer">
            <Text type="secondary">
                Green Build - {new Date().getFullYear()} - AI-Powered Construction Estimation
            </Text>
        </Footer>
    );
};

export default AppFooter;
