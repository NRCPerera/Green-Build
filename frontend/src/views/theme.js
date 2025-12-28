/**
 * Application Theme Configuration
 * 
 * Defines the visual theme for the Ant Design component library.
 * Uses a dark theme with cyan accent colors for a modern appearance.
 */

import { theme } from 'antd';

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

export default customTheme;
