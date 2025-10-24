import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Statistic, Alert, Spin } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import { ModelInfo } from '../types';
import { usePrediction } from '../context/PredictionContext';

const { Title, Text } = Typography;

const HomePage: React.FC = () => {
  const { state } = usePrediction();
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        setLoading(true);
        // Додаємо таймаут для швидкої відповіді
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
        
        const info = await apiService.getModelInfo();
        clearTimeout(timeoutId);
        setModelInfo(info);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Таймаут підключення до API. Моделі можуть бути не готові.');
        } else {
          setError('Не вдалося підключитися до API. Переконайтеся, що бекенд запущений.');
        }
        console.error('Failed to fetch model info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModelInfo();
  }, []);


  const getModelStatus = (loaded: boolean) => {
    if (loaded) {
      return (
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <Text style={{ color: '#52c41a' }}>Завантажена</Text>
        </Space>
      );
    }
    return (
      <Space>
        <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
        <Text style={{ color: '#ff4d4f' }}>Не завантажена</Text>
      </Space>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>Завантаження інформації про моделі...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>Ласкаво просимо до CV Shelves ML</Title>
      <Text type="secondary" style={{ fontSize: '16px' }}>
        Система машинного навчання для детекції об'єктів на зображеннях
      </Text>


      {error && (
        <Alert
          message="Помилка підключення"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: '24px' }}
        />
      )}

      <Row gutter={[24, 24]} style={{ marginTop: '32px' }}>
        {/* Model Status */}
        <Col xs={24} lg={12}>
          <Card title="Статус моделей" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>RFDETR (Object Detection)</Text>
                <br />
                {modelInfo ? getModelStatus(modelInfo.rfdetr.loaded) : <LoadingOutlined />}
              </div>
              <div>
                <Text strong>YOLO (Real-time Detection)</Text>
                <br />
                {modelInfo ? getModelStatus(modelInfo.yolo.loaded) : <LoadingOutlined />}
              </div>
            </Space>
          </Card>
        </Col>

        {/* Quick Stats */}
        <Col xs={24} lg={12}>
          <Card title="Швидка статистика" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Доступні моделі"
                  value={modelInfo ? 
                    (modelInfo.rfdetr.loaded ? 1 : 0) + (modelInfo.yolo.loaded ? 1 : 0) 
                    : 0
                  }
                  suffix="/ 2"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Статус API"
                  value={error ? "Помилка" : "Працює"}
                  valueStyle={{ color: error ? '#ff4d4f' : '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Features */}
      <Row gutter={[24, 24]} style={{ marginTop: '32px' }}>
        <Col xs={24} md={8}>
          <Card title="🔍 Детекція об'єктів" size="small">
            <Text>
              Завантажуйте зображення та отримуйте точні результати детекції об'єктів 
              за допомогою сучасних моделей машинного навчання.
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="🤖 Множинні моделі" size="small">
            <Text>
              Використовуйте RFDETR, YOLO або обидві моделі одночасно для порівняння 
              результатів та вибору найкращого підходу.
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="📝 Історія та коментарі" size="small">
            <Text>
              Зберігайте результати аналізу, додавайте коментарі та переглядайте 
              повну історію всіх виконаних передбачень.
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Getting Started */}
      <Card title="🚀 Початок роботи" style={{ marginTop: '32px' }}>
        <Space direction="vertical" size="middle">
          <Text>1. Перейдіть на вкладку "Детекція"</Text>
          <Text>2. Завантажте зображення для аналізу</Text>
          <Text>3. Оберіть модель (RFDETR, YOLO або обидві)</Text>
          <Text>4. Налаштуйте поріг впевненості</Text>
          <Text>5. Запустіть аналіз та отримайте результати</Text>
          <Text>6. Додайте коментар до результату</Text>
          <Text>7. Переглядайте історію на вкладці "Історія"</Text>
        </Space>
      </Card>
    </div>
  );
};

export default HomePage;
