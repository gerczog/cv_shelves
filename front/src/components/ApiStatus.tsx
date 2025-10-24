import React, { useState, useEffect } from 'react';
import { Alert, Button, Space } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';

interface ApiStatusProps {
  onStatusChange?: (isOnline: boolean) => void;
}

const ApiStatus: React.FC<ApiStatusProps> = ({ onStatusChange }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkApiStatus = async () => {
    setIsChecking(true);
    try {
      await apiService.healthCheck();
      setIsOnline(true);
      onStatusChange?.(true);
    } catch (error) {
      console.error('API health check failed:', error);
      setIsOnline(false);
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkApiStatus();
  }, []);

  if (isOnline === null) {
    return null; // Не показываем ничего пока проверяем
  }

  if (isOnline) {
    return (
      <Alert
        message="API сервер доступний"
        type="success"
        icon={<CheckCircleOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />
    );
  }

  return (
    <Alert
      message="API сервер недоступний"
      description={
        <Space>
          <span>Перевірте, чи запущений бекенд сервер</span>
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            loading={isChecking}
            onClick={checkApiStatus}
          >
            Перевірити знову
          </Button>
        </Space>
      }
      type="error"
      icon={<ExclamationCircleOutlined />}
      showIcon
      style={{ marginBottom: 16 }}
    />
  );
};

export default ApiStatus;
