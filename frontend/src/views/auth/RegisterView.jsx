import { useState } from 'react';
import { Form, Input, Button, Alert, Typography, Divider, Select } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, BankOutlined } from '@ant-design/icons';
import useAuthController from '../../controllers/useAuthController';

const { Title, Text, Link } = Typography;
const { Option } = Select;

const RegisterView = ({ onSwitchToLogin, onRegisterSuccess }) => {
    const [form] = Form.useForm();
    const { register, loading, error, clearError } = useAuthController();
    const [localError, setLocalError] = useState(null);

    const handleSubmit = async (values) => {
        setLocalError(null);
        clearError();

        if (values.password !== values.confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        const userData = {
            name: values.name,
            email: values.email,
            password: values.password,
            company: values.company || '',
            phone: values.phone || '',
            role: values.role || 'user'
        };

        const result = await register(userData);

        if (result.success) {
            onRegisterSuccess?.();
        } else {
            setLocalError(result.error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 p-4">
            <div className="w-full max-w-md">
                <div className="bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                    <div className="text-center mb-6">
                        <span className="text-5xl mb-4 block">🌿</span>
                        <Title level={2} className="!text-white !mb-2">
                            Create Account
                        </Title>
                        <Text className="text-gray-400">
                            Join Green Build Platform
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
                            name="name"
                            rules={[
                                { required: true, message: 'Please enter your name' },
                                { min: 2, message: 'Name must be at least 2 characters' }
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined className="text-gray-500" />}
                                placeholder="Full name"
                                size="large"
                                className="!bg-dark-700 !border-white/10 !text-white placeholder:!text-gray-500"
                            />
                        </Form.Item>

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

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="company">
                                <Input
                                    prefix={<BankOutlined className="text-gray-500" />}
                                    placeholder="Company (optional)"
                                    size="large"
                                    className="!bg-dark-700 !border-white/10 !text-white placeholder:!text-gray-500"
                                />
                            </Form.Item>

                            <Form.Item name="phone">
                                <Input
                                    prefix={<PhoneOutlined className="text-gray-500" />}
                                    placeholder="Phone (optional)"
                                    size="large"
                                    className="!bg-dark-700 !border-white/10 !text-white placeholder:!text-gray-500"
                                />
                            </Form.Item>
                        </div>

                        <Form.Item name="role" initialValue="user">
                            <Select
                                size="large"
                                className="!w-full"
                                popupClassName="!bg-dark-700"
                            >
                                <Option value="user">User</Option>
                                <Option value="contractor">Contractor</Option>
                                <Option value="estimator">Estimator</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: 'Please enter a password' },
                                { min: 6, message: 'Password must be at least 6 characters' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined className="text-gray-500" />}
                                placeholder="Password"
                                size="large"
                                className="!bg-dark-700 !border-white/10 !text-white placeholder:!text-gray-500"
                            />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            rules={[
                                { required: true, message: 'Please confirm your password' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined className="text-gray-500" />}
                                placeholder="Confirm password"
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
                                Create Account
                            </Button>
                        </Form.Item>
                    </Form>

                    <Divider className="!border-white/10">
                        <Text className="!text-gray-500 text-sm">or</Text>
                    </Divider>

                    <div className="text-center">
                        <Text className="text-gray-400">
                            Already have an account?{' '}
                            <Link
                                onClick={onSwitchToLogin}
                                className="!text-primary-400 hover:!text-primary-300 cursor-pointer"
                            >
                                Sign in
                            </Link>
                        </Text>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterView;
