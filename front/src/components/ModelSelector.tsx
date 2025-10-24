import React from 'react';
import { Radio, Space, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ModelSelectorProps {
  value: 'rfdetr' | 'yolo' | 'both';
  onChange: (value: 'rfdetr' | 'yolo' | 'both') => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange, disabled = false }) => {
  const options = [
    {
      label: (
        <Space>
          <Text strong>RFDETR</Text>
          <Text type="secondary">(Детекція об'єктів)</Text>
        </Space>
      ),
      value: 'rfdetr',
    },
    {
      label: (
        <Space>
          <Text strong>YOLO</Text>
          <Text type="secondary">(Детекція в реальному часі)</Text>
        </Space>
      ),
      value: 'yolo',
    },
    {
      label: (
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <Text strong>Обидві моделі</Text>
          <Text type="secondary">(Порівняння результатів)</Text>
        </Space>
      ),
      value: 'both',
    },
  ];

  return (
    <Radio.Group
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ width: '100%' }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {options.map((option) => (
          <Radio key={option.value} value={option.value} style={{ width: '100%' }}>
            {option.label}
          </Radio>
        ))}
      </Space>
    </Radio.Group>
  );
};

export default ModelSelector;
