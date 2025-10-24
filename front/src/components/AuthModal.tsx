import React, { useState } from 'react';
import { Modal, Form, Input, Button, Tabs, message, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: (user: { id: string; username: string; email?: string }) => void;
}

interface LoginForm {
  username: string;
  password: string;
}

interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
  email?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onLogin }) => {
  const [loginForm] = Form.useForm<LoginForm>();
  const [registerForm] = Form.useForm<RegisterForm>();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const handleLogin = async (values: LoginForm) => {
    setLoading(true);
    try {
      const response = await apiService.login(values.username, values.password);
      onLogin({
        id: response.user_id,
        username: response.username,
        email: response.email
      });
      message.success('Успішно ввійшли в систему!');
      onClose();
      loginForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Помилка входу');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: RegisterForm) => {
    if (values.password !== values.confirmPassword) {
      message.error('Паролі не співпадають');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.register(
        values.username,
        values.password,
        values.email
      );
      onLogin({
        id: response.user_id,
        username: response.username,
        email: response.email
      });
      message.success('Успішно зареєстровані!');
      onClose();
      registerForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Помилка реєстрації');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
    loginForm.resetFields();
    registerForm.resetFields();
  };

  const tabItems = [
    {
      key: 'login',
      label: 'Вхід',
      children: (
        <Form
          form={loginForm}
          onFinish={handleLogin}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Введіть ім\'я користувача' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Ім'я користувача"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Введіть пароль' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Пароль"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%' }}
            >
              Увійти
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'register',
      label: 'Реєстрація',
      children: (
        <Form
          form={registerForm}
          onFinish={handleRegister}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Введіть ім\'я користувача' },
              { min: 3, message: 'Мінімум 3 символи' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Ім'я користувача"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { type: 'email', message: 'Невірний формат email' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email (необов'язково)"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Введіть пароль' },
              { min: 6, message: 'Мінімум 6 символів' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Пароль"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            rules={[
              { required: true, message: 'Підтвердіть пароль' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Підтвердження пароля"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%' }}
            >
              Зареєструватися
            </Button>
          </Form.Item>
        </Form>
      )
    }
  ];

  return (
    <Modal
      title="Авторизація"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={400}
      centered
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        centered
      />
    </Modal>
  );
};

export default AuthModal;
