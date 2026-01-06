import { useState } from 'react';
import { Form, Input, Button, Alert, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import useAuthController from '../../controllers/useAuthController';

const { Title, Text, Link } = Typography;

const LoginView = ({ onSwitchToRegister, onLoginSuccess }) => {
    const [form] = Form.useForm();
    const { login, loading, error, clearError } = useAuthController();
    const [localError, setLocalError] = useState(null);

    const handleSubmit = async (values) => {
        setLocalError(null);
        clearError();

        const result = await login(values.email, values.password);

        if (result.success) {
            onLoginSuccess?.();
        } else {
            setLocalError(result.error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 p-4">
            <div className="w-full max-w-md">
                <div className="bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <span className="text-5xl mb-4 block">🌿</span>
                        <Title level={2} className="!text-white !mb-2">
                            Welcome Back
                        </Title>
                        <Text className="text-gray-400">
                            Sign in to Green Build Platform
                        </Text>
                    </div>

                    {(error || localError) && (
                        <Alert
                            message={error || localError}
                            type="error"
                            showIcon
                            closable
                            onClose={() => {
                                setLocalError(null);
                                clearError();
                            }}
                            className="mb-6"
                        />
                    )}

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        autoComplete="off"
                        requiredMark={false}
                    >
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Please enter your email' },
                                { type: 'email', message: 'Please enter a valid email' }
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined className="text-gray-500" />}
                                placeholder="Email address"
                                size="large"
                                className="!bg-dark-700 !border-white/10 !text-white placeholder:!text-gray-500"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: 'Please enter your password' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined className="text-gray-500" />}
                                placeholder="Password"
                                size="large"
                                className="!bg-dark-700 !border-white/10 !text-white placeholder:!text-gray-500"
                            />
                        </Form.Item>

                        <Form.Item className="mb-4">
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                size="large"
                                className="!h-12 !bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0 !font-semibold"
                            >
                                Sign In
                            </Button>
                        </Form.Item>
                    </Form>

                    <Divider className="!border-white/10">
                        <Text className="!text-gray-500 text-sm">or</Text>
                    </Divider>

                    <div className="text-center">
                        <Text className="text-gray-400">
                            Don't have an account?{' '}
                            <Link
                                onClick={onSwitchToRegister}
                                className="!text-primary-400 hover:!text-primary-300 cursor-pointer"
                            >
                                Create one
                            </Link>
                        </Text>
                    </div>
                </div>

                <div className="text-center mt-6">
                    <Text className="text-gray-500 text-xs">
                        🔒 Your data is encrypted and secure
                    </Text>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
