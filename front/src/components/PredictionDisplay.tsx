import React, { useState } from 'react';
import { Card, Image, Button, Input, Space, Typography, Divider, Tag, Spin } from 'antd';
import { CommentOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons';
import { Prediction } from '../types';
import DetectionImage from './DetectionImage';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface PredictionDisplayProps {
  prediction: Prediction;
  onSaveComment: (id: string, comment: string) => Promise<void>;
  loading?: boolean;
}

const PredictionDisplay: React.FC<PredictionDisplayProps> = ({
  prediction,
  onSaveComment,
  loading = false,
}) => {
  const [comment, setComment] = useState(prediction.comment || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showPolygons, setShowPolygons] = useState(false);

  const handleSaveComment = async () => {
    try {
      await onSaveComment(prediction.id, comment);
      setIsEditing(false);
    } catch (error) {
      // Ошибка уже обработана в родительском компоненте
      console.error('Error saving comment:', error);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  const getModelTag = (model: string) => {
    const colors = {
      rfdetr: 'blue',
      yolo: 'green',
      both: 'purple',
    };
    return <Tag color={colors[model as keyof typeof colors]}>{model.toUpperCase()}</Tag>;
  };

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Результат детекції
          </Title>
          {getModelTag(prediction.model)}
        </Space>
      }
      extra={
        <Space>
          <Text type="secondary">{formatTimestamp(prediction.timestamp)}</Text>
          <Text type="secondary">ID: {prediction.id}</Text>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Spin spinning={loading}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Image Display with Detections */}
          <div style={{ textAlign: 'center' }}>
            <DetectionImage
              imageUrl={prediction.imageUrl}
              imageBase64={prediction.imageBase64}
              detections={prediction.results}
              model={prediction.model}
              showPolygons={showPolygons}
              onTogglePolygons={() => setShowPolygons(!showPolygons)}
            />
          </div>

          <Divider />

          {/* Results Summary */}
          <div>
            <Title level={5}>Результати детекції:</Title>
            
            {/* Детальная статистика для обеих моделей */}
            {prediction.model === 'both' && prediction.results && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {/* RFDETR результаты */}
                  {prediction.results.rfdetr && prediction.results.rfdetr.detections && (
                    <Card size="small" title="RFDETR" style={{ flex: 1, minWidth: '200px' }}>
                      <div>
                        <Text strong>Знайдено об'єктів: </Text>
                        <Text>{prediction.results.rfdetr.detections.length}</Text>
                      </div>
                      <div>
                        <Text strong>Середня впевненість: </Text>
                        <Text>
                          {((prediction.results.rfdetr.confidence || 0) * 100).toFixed(1)}%
                        </Text>
                      </div>
                      {prediction.results.rfdetr.detections.length > 0 && (
                        <div>
                          <Text strong>Впевненість: </Text>
                          <Text>{prediction.results.rfdetr.detections.map((item: any) => `${((item.confidence || 0) * 100).toFixed(1)}%`).join(', ')}</Text>
                        </div>
                      )}
                    </Card>
                  )}
                  
                  {/* YOLO результаты */}
                  {prediction.results.yolo && prediction.results.yolo.detections && (
                    <Card size="small" title="YOLO" style={{ flex: 1, minWidth: '200px' }}>
                      <div>
                        <Text strong>Знайдено об'єктів: </Text>
                        <Text>{prediction.results.yolo.detections.length}</Text>
                      </div>
                      <div>
                        <Text strong>Середня впевненість: </Text>
                        <Text>
                          {((prediction.results.yolo.confidence || 0) * 100).toFixed(1)}%
                        </Text>
                      </div>
                      {prediction.results.yolo.detections.length > 0 && (
                        <div>
                          <Text strong>Впевненість: </Text>
                          <Text>{prediction.results.yolo.detections.map((item: any) => `${((item.confidence || 0) * 100).toFixed(1)}%`).join(', ')}</Text>
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              </div>
            )}
            
            {/* Статистика для одной модели */}
            {prediction.model !== 'both' && prediction.results && (
              <Card size="small" title={`Статистика ${prediction.model.toUpperCase()}`} style={{ marginBottom: '16px' }}>
                {prediction.results.detections && Array.isArray(prediction.results.detections) && (
                  <div>
                    <div>
                      <Text strong>Найдено объектов: </Text>
                      <Text>{prediction.results.detections.length}</Text>
                    </div>
                    <div>
                      <Text strong>Средняя уверенность: </Text>
                      <Text>
                        {((prediction.results.confidence || 0) * 100).toFixed(1)}%
                      </Text>
                    </div>
                    {prediction.results.detections.length > 0 && (
                      <div>
                        <Text strong>Уверенность: </Text>
                        <Text>{prediction.results.detections.map((item: any) => `${((item.confidence || 0) * 100).toFixed(1)}%`).join(', ')}</Text>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}
            
            {/* Сравнение моделей */}
            {prediction.model === 'both' && prediction.results && (
              <Card size="small" title="Порівняння моделей" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>RFDETR: </Text>
                    <Text>{prediction.results.rfdetr?.detections?.length || 0} об'єктів</Text>
                  </div>
                  <div>
                    <Text strong>YOLO: </Text>
                    <Text>{prediction.results.yolo?.detections?.length || 0} об'єктів</Text>
                  </div>
                  <div>
                    <Text strong>Різниця: </Text>
                    <Text style={{ 
                      color: (prediction.results.rfdetr?.detections?.length || 0) > (prediction.results.yolo?.detections?.length || 0) ? '#52c41a' : '#ff4d4f' 
                    }}>
                      {(prediction.results.rfdetr?.detections?.length || 0) - (prediction.results.yolo?.detections?.length || 0)}
                    </Text>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Полные результаты JSON */}
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {JSON.stringify(prediction.results, null, 2)}
            </pre>
          </div>

          <Divider />

          {/* Comment Section */}
          <div>
            <Title level={5}>
              <CommentOutlined /> Коментар до передбачення:
            </Title>
            {isEditing ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <TextArea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Додайте коментар до результату детекції..."
                  rows={3}
                />
                <Space>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveComment}>
                    Зберегти
                  </Button>
                  <Button onClick={() => setIsEditing(false)}>Скасувати</Button>
                </Space>
              </Space>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {prediction.comment ? (
                  <Text>{prediction.comment}</Text>
                ) : (
                  <Text type="secondary">Коментар не додано</Text>
                )}
                <Button 
                  type="dashed" 
                  onClick={() => setIsEditing(true)}
                  icon={<CommentOutlined />}
                >
                  {prediction.comment ? 'Змінити коментар' : 'Додати коментар'}
                </Button>
              </Space>
            )}
          </div>
        </Space>
      </Spin>
    </Card>
  );
};

export default PredictionDisplay;
