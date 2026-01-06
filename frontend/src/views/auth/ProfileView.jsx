import { useState } from 'react';
import { Form, Input, Button, Alert, Typography, Card, Divider, Tag, message } from 'antd';
import {
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    BankOutlined,
    LockOutlined,
    EditOutlined,
    SaveOutlined,
    CloseOutlined
} from '@ant-design/icons';
import useAuthController from '../../controllers/useAuthController';
import useAuthStore from '../../models/useAuthStore';

const { Title, Text } = Typography;

const ProfileView = () => {
    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const { user } = useAuthStore();
    const { updateProfile, changePassword, loading, error, clearError } = useAuthController();

    const [isEditing, setIsEditing] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [localError, setLocalError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const handleProfileSubmit = async (values) => {
        setLocalError(null);
        setSuccessMessage(null);

        const result = await updateProfile({
            name: values.name,
            company: values.company || '',
            phone: values.phone || ''
        });

        if (result.success) {
            setSuccessMessage('Profile updated successfully!');
            setIsEditing(false);
            message.success('Profile updated successfully!');
        } else {
            setLocalError(result.error);
        }
    };

    const handlePasswordSubmit = async (values) => {
        setLocalError(null);
        setSuccessMessage(null);

        if (values.newPassword !== values.confirmNewPassword) {
            setLocalError('New passwords do not match');
            return;
        }

        const result = await changePassword(values.currentPassword, values.newPassword);

        if (result.success) {
            setSuccessMessage('Password changed successfully!');
            setShowPasswordForm(false);
            passwordForm.resetFields();
            message.success('Password changed successfully!');
        } else {
            setLocalError(result.error);
        }
    };

    const getRoleColor = (role) => {
        const colors = {
            admin: 'red',
            contractor: 'blue',
            estimator: 'green',
            user: 'default'
        };
        return colors[role] || 'default';
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <Text className="text-gray-500">Please login to view your profile</Text>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-4xl text-white font-bold mx-auto mb-4 shadow-lg">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <Title level={2} className="!text-white !mb-1">{user.name}</Title>
                <Text className="text-gray-400">{user.email}</Text>
                <div className="mt-2">
                    <Tag color={getRoleColor(user.role)} className="!text-sm">
                        {user.role?.toUpperCase()}
                    </Tag>
                </div>
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
                />
            )}

            {successMessage && (
                <Alert
                    message={successMessage}
                    type="success"
                    showIcon
                    closable
                    onClose={() => setSuccessMessage(null)}
                />
            )}

            <Card
                className="!bg-dark-800/80 !border-white/10"
                title={
                    <div className="flex justify-between items-center">
                        <Text className="!text-white font-semibold">Profile Information</Text>
                        {!isEditing && (
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => {
                                    profileForm.setFieldsValue({
                                        name: user.name,
                                        company: user.company || '',
                                        phone: user.phone || ''
                                    });
                                    setIsEditing(true);
                                }}
                                className="!text-primary-400"
                            >
                                Edit
                            </Button>
                        )}
                    </div>
                }
            >
                {isEditing ? (
                    <Form
                        form={profileForm}
                        layout="vertical"
                        onFinish={handleProfileSubmit}
                        initialValues={{
                            name: user.name,
                            company: user.company || '',
                            phone: user.phone || ''
                        }}
                    >
                        <Form.Item
                            name="name"
                            label={<Text className="!text-gray-400">Full Name</Text>}
                            rules={[{ required: true, message: 'Name is required' }]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                size="large"
                                className="!bg-dark-700 !border-white/10 !text-white"
                            />
                        </Form.Item>

                        <Form.Item
                            name="company"
                            label={<Text className="!text-gray-400">Company</Text>}
                        >
                            <Input
                                prefix={<BankOutlined />}
                                size="large"
                                className="!bg-dark-700 !border-white/10 !text-white"
                            />
                        </Form.Item>

                        <Form.Item
                            name="phone"
                            label={<Text className="!text-gray-400">Phone</Text>}
                        >
                            <Input
                                prefix={<PhoneOutlined />}
                                size="large"
                                className="!bg-dark-700 !border-white/10 !text-white"
                            />
                        </Form.Item>

                        <div className="flex gap-3 justify-end">
                            <Button
                                icon={<CloseOutlined />}
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                htmlType="submit"
                                loading={loading}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </Form>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <UserOutlined className="text-gray-500" />
                            <div>
                                <Text className="text-gray-500 text-sm block">Full Name</Text>
                                <Text className="text-white">{user.name}</Text>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <MailOutlined className="text-gray-500" />
                            <div>
                                <Text className="text-gray-500 text-sm block">Email</Text>
                                <Text className="text-white">{user.email}</Text>
                            </div>
                        </div>
                        {user.company && (
                            <div className="flex items-center gap-3">
                                <BankOutlined className="text-gray-500" />
                                <div>
                                    <Text className="text-gray-500 text-sm block">Company</Text>
                                    <Text className="text-white">{user.company}</Text>
                                </div>
                            </div>
                        )}
                        {user.phone && (
                            <div className="flex items-center gap-3">
                                <PhoneOutlined className="text-gray-500" />
                                <div>
                                    <Text className="text-gray-500 text-sm block">Phone</Text>
                                    <Text className="text-white">{user.phone}</Text>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <Card
                className="!bg-dark-800/80 !border-white/10"
                title={
                    <Text className="!text-white font-semibold">Security</Text>
                }
            >
                {showPasswordForm ? (
                    <Form
                        form={passwordForm}
                        layout="vertical"
                        onFinish={handlePasswordSubmit}
                    >
                        <Form.Item
                            name="currentPassword"
                            label={<Text className="!text-gray-400">Current Password</Text>}
                            rules={[{ required: true, message: 'Current password is required' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                size="large"
                                className="!bg-dark-700 !border-white/10 !text-white"
                            />
                        </Form.Item>

                        <Form.Item
                            name="newPassword"
                            label={<Text className="!text-gray-400">New Password</Text>}
                            rules={[
                                { required: true, message: 'New password is required' },
                                { min: 6, message: 'Password must be at least 6 characters' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                size="large"
                                className="!bg-dark-700 !border-white/10 !text-white"
                            />
                        </Form.Item>

                        <Form.Item
                            name="confirmNewPassword"
                            label={<Text className="!text-gray-400">Confirm New Password</Text>}
                            rules={[{ required: true, message: 'Please confirm your new password' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                size="large"
                                className="!bg-dark-700 !border-white/10 !text-white"
                            />
                        </Form.Item>

                        <div className="flex gap-3 justify-end">
                            <Button
                                icon={<CloseOutlined />}
                                onClick={() => {
                                    setShowPasswordForm(false);
                                    passwordForm.resetFields();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                htmlType="submit"
                                loading={loading}
                            >
                                Change Password
                            </Button>
                        </div>
                    </Form>
                ) : (
                    <div>
                        <Text className="text-gray-400 block mb-4">
                            Keep your account secure by using a strong password.
                        </Text>
                        <Button
                            icon={<LockOutlined />}
                            onClick={() => setShowPasswordForm(true)}
                        >
                            Change Password
                        </Button>
                    </div>
                )}
            </Card>

            <Card
                className="!bg-dark-800/80 !border-white/10"
                title={
                    <Text className="!text-white font-semibold">Account Details</Text>
                }
            >
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <Text className="text-gray-500">Account ID</Text>
                        <Text className="text-white font-mono text-sm">{user._id}</Text>
                    </div>
                    <Divider className="!my-2 !border-white/5" />
                    <div className="flex justify-between">
                        <Text className="text-gray-500">Created</Text>
                        <Text className="text-white">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </Text>
                    </div>
                    <Divider className="!my-2 !border-white/5" />
                    <div className="flex justify-between">
                        <Text className="text-gray-500">Last Login</Text>
                        <Text className="text-white">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                        </Text>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ProfileView;
