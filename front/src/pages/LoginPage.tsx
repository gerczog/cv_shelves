import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Tabs, message, Space, Typography, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { usePrediction } from '../context/PredictionContext';

const { Title, Text } = Typography;

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

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setAuthenticatedUser } = usePrediction();
  const [loginForm] = Form.useForm<LoginForm>();
  const [registerForm] = Form.useForm<RegisterForm>();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      navigate('/');
    }
  }, [state.isAuthenticated, navigate]);

  const handleLogin = async (values: LoginForm) => {
    setLoading(true);
    try {
      const response = await apiService.login(values.username, values.password);
      setAuthenticatedUser({
        id: response.user_id,
        username: response.username,
        email: response.email
      });
      message.success('Успішно ввійшли в систему!');
      navigate('/');
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
      setAuthenticatedUser({
        id: response.user_id,
        username: response.username,
        email: response.email
      });
      message.success('Успішно зареєстровані!');
      navigate('/');
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Помилка реєстрації');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'login',
      label: (
        <Space>
          <LoginOutlined />
          Вхід
        </Space>
      ),
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
              size="large"
            >
              Увійти
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'register',
      label: (
        <Space>
          <UserAddOutlined />
          Реєстрація
        </Space>
      ),
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
              size="large"
            >
              Зареєструватися
            </Button>
          </Form.Item>
        </Form>
      )
    }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Row justify="center" style={{ width: '100%', maxWidth: '1200px' }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={8}>
          <Card 
            style={{ 
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              borderRadius: '12px',
              border: 'none'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                CV Shelves ML
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                Система машинного навчання для детекції об'єктів
              </Text>
            </div>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              centered
              size="large"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LoginPage;
