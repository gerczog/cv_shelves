import React, { useState, useEffect, useCallback } from 'react';
import { Card, List, Typography, Space, Tag, Button, Empty, Input, Select, Slider, Row, Col, message, Spin, Modal } from 'antd';
import { SearchOutlined, FilterOutlined, UserOutlined, CommentOutlined, EditOutlined, SaveOutlined, ReloadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { usePrediction } from '../context/PredictionContext';
import { Prediction } from '../types';
import DetectionImage from '../components/DetectionImage';
import ApiStatus from '../components/ApiStatus';
import { apiService, HistoryFilters, StatisticsResponse, User } from '../services/api';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const HistoryPage: React.FC = () => {
  const { updatePredictionComment, state } = usePrediction();
  const [searchText, setSearchText] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchPredictionId, setSearchPredictionId] = useState('');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState(0);
  const [maxConfidence, setMaxConfidence] = useState(1);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [filteredPredictions, setFilteredPredictions] = useState<Prediction[]>([]);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Handle URL parameters for highlighting
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const highlightParam = urlParams.get('highlight');
    if (highlightParam) {
      setHighlightId(highlightParam);
      // Clear highlight after 5 seconds
      setTimeout(() => setHighlightId(null), 5000);
    }
  }, []);

  // Load data from API
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Сначала проверяем доступность API
      try {
        await apiService.healthCheck();
        console.log('API health check passed');
      } catch (healthError) {
        console.error('API health check failed:', healthError);
        message.error('API сервер недоступний. Перевірте, чи запущений бекенд.');
        // Устанавливаем пустые данные вместо ошибки
        setFilteredPredictions([]);
        setTotal(0);
        setStatistics(null);
        setUsers([]);
        return;
      }

      // Load predictions
      const filters: HistoryFilters = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
        model: filterModel !== 'all' ? filterModel : undefined,
        searchText: searchText || searchUser || searchPredictionId || undefined,
        minConfidence: minConfidence > 0 ? minConfidence : undefined,
        maxConfidence: maxConfidence < 1 ? maxConfidence : undefined,
      };

      console.log('Loading data with filters:', filters);
      console.log('API Base URL:', process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000');

      const [predictionsResponse, statisticsResponse, usersResponse] = await Promise.all([
        apiService.getPredictions(filters),
        apiService.getStatistics(),
        apiService.getUsers()
      ]);

      console.log('HistoryPage - loaded predictions:', predictionsResponse.predictions);
      console.log('HistoryPage - statistics:', statisticsResponse);
      console.log('HistoryPage - users:', usersResponse.users);
      
      predictionsResponse.predictions.forEach((pred, index) => {
        console.log(`HistoryPage - prediction ${index}:`, {
          model: pred.model,
          results: pred.results,
          hasImageBase64: !!pred.imageBase64
        });
      });
      
      // Проверяем, что данные корректны
      if (!predictionsResponse || !Array.isArray(predictionsResponse.predictions)) {
        console.warn('Invalid predictions response:', predictionsResponse);
        setFilteredPredictions([]);
        setTotal(0);
      } else {
        setFilteredPredictions(predictionsResponse.predictions);
        setTotal(predictionsResponse.total || 0);
      }
      
      if (!statisticsResponse) {
        console.warn('Invalid statistics response:', statisticsResponse);
        setStatistics(null);
      } else {
        setStatistics(statisticsResponse);
      }
      
      if (!usersResponse || !Array.isArray(usersResponse.users)) {
        console.warn('Invalid users response:', usersResponse);
        setUsers([]);
      } else {
        setUsers(usersResponse.users);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      console.error('Error details:', {
        message: (error as any)?.message,
        status: (error as any)?.response?.status,
        statusText: (error as any)?.response?.statusText,
        data: (error as any)?.response?.data,
        url: (error as any)?.config?.url,
        baseURL: (error as any)?.config?.baseURL
      });
      
      // Более детальное сообщение об ошибке
      const errorMessage = (error as any)?.response?.data?.detail || 
                          (error as any)?.response?.data?.message || 
                          (error as any)?.message || 
                          'Невідома помилка';
      
      message.error(`Помилка завантаження даних: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchText, searchUser, searchPredictionId, filterModel, minConfidence, maxConfidence]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditComment = (predictionId: string, currentComment: string) => {
    setEditingComment(predictionId);
    setCommentText(currentComment || '');
  };

  const handleSaveComment = async (predictionId: string) => {
    try {
      await apiService.updatePredictionComment(predictionId, commentText);
      updatePredictionComment(predictionId, commentText);
      setEditingComment(null);
      setCommentText('');
      message.success('Коментар збережено');
      // Reload data to get updated information
      loadData();
    } catch (error) {
      console.error('Error saving comment:', error);
      message.error('Помилка збереження коментаря');
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setCommentText('');
  };

  const handleExportHistory = async () => {
    try {
      setLoading(true);
      const blob = await apiService.exportHistory();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `history_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Історію експортовано успішно');
    } catch (error) {
      console.error('Error exporting history:', error);
      message.error('Помилка експорту історії');
    } finally {
      setLoading(false);
    }
  };

  // Check if current user can delete this prediction
  const canDeletePrediction = (prediction: Prediction): boolean => {
    // If user is not authenticated, they can only delete their own anonymous predictions
    if (!state.isAuthenticated) {
      return prediction.user === 'Анонімний користувач' || !prediction.user;
    }
    
    // If user is authenticated, they can delete their own predictions
    return prediction.user === state.currentUser;
  };

  const handleDeletePrediction = async (predictionId: string) => {
    console.log('Delete button clicked for prediction:', predictionId);
    
    // Find the prediction to check permissions
    const prediction = filteredPredictions.find(p => p.id === predictionId);
    if (!prediction) {
      message.error('Передбачення не знайдено');
      return;
    }
    
    // Check if user has permission to delete this prediction
    if (!canDeletePrediction(prediction)) {
      message.error('У вас немає прав для видалення цього передбачення');
      return;
    }
    
    Modal.confirm({
      title: 'Видалити передбачення',
      content: 'Ви впевнені, що хочете видалити це передбачення? Цю дію неможливо скасувати.',
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: async () => {
        try {
          console.log('Attempting to delete prediction:', predictionId);
          console.log('Current API base URL:', process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000');
          console.log('Full delete URL will be:', `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/v1/api/history/predictions/${predictionId}`);
          
          // First check if API is available
          try {
            await apiService.healthCheck();
            console.log('API health check passed');
          } catch (healthError) {
            console.error('API health check failed:', healthError);
            message.error('API сервер недоступний. Перевірте, чи запущений бекенд.');
            return;
          }
          
          const result = await apiService.deletePrediction(predictionId);
          console.log('Delete API call completed, result:', result);
          console.log('Prediction deleted successfully');
          
          message.success('Передбачення видалено');
          // Reload data to refresh the list
          await loadData();
          console.log('Data reloaded after delete');
        } catch (error) {
          console.error('Error deleting prediction:', error);
          console.error('Error type:', typeof error);
          console.error('Error details:', (error as any)?.response?.data);
          console.error('Error status:', (error as any)?.response?.status);
          console.error('Error statusText:', (error as any)?.response?.statusText);
          console.error('Full error object:', error);
          
          const errorMessage = (error as any)?.response?.data?.detail || (error as any)?.message || 'Невідома помилка';
          message.error(`Помилка видалення передбачення: ${errorMessage}`);
        }
      },
    });
  };


  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'default';
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'orange';
    return 'red';
  };


  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>Історія передбачень</Title>
      <Text type="secondary">
        Перегляд всіх виконаних аналізів зображень
      </Text>
      
      {/* API Status */}
      <ApiStatus />

      {/* Filters */}
      <Card style={{ marginTop: '24px', marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Title level={5}>
            <FilterOutlined /> Фільтри та пошук
          </Title>
          
          {/* Search Row */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong><CommentOutlined /> Пошук за коментарями:</Text>
                <Search
                  placeholder="Введіть частину коментаря..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  prefix={<SearchOutlined />}
                />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong><UserOutlined /> Пошук за користувачем:</Text>
                <Search
                  placeholder="Введіть ім'я користувача..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  prefix={<UserOutlined />}
                />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Пошук за номером передбачення:</Text>
                <Search
                  placeholder="Введіть номер передбачення..."
                  value={searchPredictionId}
                  onChange={(e) => setSearchPredictionId(e.target.value)}
                  prefix={<SearchOutlined />}
                />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Модель:</Text>
                <Select
                  value={filterModel}
                  onChange={setFilterModel}
                  style={{ width: '100%' }}
                >
                  <Option value="all">Всі моделі</Option>
                  <Option value="both">Обидві моделі</Option>
                  <Option value="rfdetr">RFDETR</Option>
                  <Option value="yolo">YOLO</Option>
                </Select>
              </Space>
            </Col>
          </Row>

          {/* Filter Row */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Користувач:</Text>
                <Select
                  value={filterUser}
                  onChange={setFilterUser}
                  style={{ width: '100%' }}
                >
                  <Option value="all">Всі користувачі</Option>
                  {users.map(user => (
                    <Option key={user.id} value={user.username}>{user.username}</Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={16}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Діапазон впевненості: {minConfidence.toFixed(1)} - {maxConfidence.toFixed(1)}</Text>
                <Slider
                  range
                  min={0}
                  max={1}
                  step={0.1}
                  value={[minConfidence, maxConfidence]}
                  onChange={(value) => {
                    setMinConfidence(value[0]);
                    setMaxConfidence(value[1]);
                  }}
                  marks={{
                    0: '0%',
                    0.5: '50%',
                    1: '100%'
                  }}
                />
              </Space>
            </Col>
          </Row>

          {/* Reset Button */}
          <Row>
            <Col span={24}>
              <Button 
                onClick={() => {
                  setSearchText('');
                  setSearchUser('');
                  setSearchPredictionId('');
                  setFilterModel('all');
                  setFilterUser('all');
                  setMinConfidence(0);
                  setMaxConfidence(1);
                  setCurrentPage(1);
                }}
                style={{ marginTop: '16px' }}
              >
                Скинути всі фільтри
              </Button>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Statistics */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={12} md={6}>
            <Text strong>Всього передбачень: {statistics?.total || 0}</Text>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>RFDETR: {statistics?.byModel.rfdetr || 0}</Text>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>YOLO: {statistics?.byModel.yolo || 0}</Text>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Обидві моделі: {statistics?.byModel.both || 0}</Text>
          </Col>
        </Row>
        <Row style={{ marginTop: '8px' }}>
          <Col span={24}>
            <Space>
              <Text type="secondary">
                Показано результатів: <Text strong>{filteredPredictions.length}</Text> з {total}
              </Text>
              <Button 
                icon={<ReloadOutlined />} 
                size="small" 
                onClick={loadData}
                loading={loading}
              >
                Оновити
              </Button>
              {state.isAuthenticated && (
                <Button 
                  icon={<DownloadOutlined />} 
                  size="small" 
                  onClick={handleExportHistory}
                  loading={loading}
                  type="primary"
                >
                  Експорт JSON
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Predictions List */}
      <Spin spinning={loading}>
        {filteredPredictions.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Empty
              description="Передбачення не знайдено"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
            <Button 
              type="primary" 
              onClick={loadData}
              icon={<ReloadOutlined />}
              style={{ marginTop: '16px' }}
            >
              Спробувати знову
            </Button>
          </div>
        ) : (
          <List
            dataSource={filteredPredictions}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} з ${total} записів`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size || 10);
              },
            }}
            renderItem={(prediction) => (
            <List.Item>
              <Card
                style={{ 
                  width: '100%',
                  border: highlightId === prediction.id ? '2px solid #ff4d4f' : undefined,
                  backgroundColor: highlightId === prediction.id ? '#fff2f0' : undefined,
                  boxShadow: highlightId === prediction.id ? '0 0 10px rgba(255, 77, 79, 0.3)' : undefined
                }}
                title={
                  <Space>
                    <Text strong>Передбачення #{prediction.id}</Text>
                    {getModelTag(prediction.model)}
                    {prediction.model === 'both' ? (
                      <>
                        {prediction.rfdetrThreshold && (
                          <Tag color={getConfidenceColor(prediction.rfdetrThreshold)}>
                            RFDETR: {(prediction.rfdetrThreshold * 100).toFixed(0)}%
                          </Tag>
                        )}
                        {prediction.yoloThreshold && (
                          <Tag color={getConfidenceColor(prediction.yoloThreshold)}>
                            YOLO: {(prediction.yoloThreshold * 100).toFixed(0)}%
                          </Tag>
                        )}
                      </>
                    ) : (
                      prediction.confidenceThreshold && (
                        <Tag color={getConfidenceColor(prediction.confidenceThreshold)}>
                          Поріг: {(prediction.confidenceThreshold * 100).toFixed(0)}%
                        </Tag>
                      )
                    )}
                  </Space>
                }
                extra={
                  <Space>
                    <Text type="secondary">{formatTimestamp(prediction.timestamp)}</Text>
                    {canDeletePrediction(prediction) && (
                      <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeletePrediction(prediction.id)}
                      >
                        Видалити
                      </Button>
                    )}
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {/* Image Preview with Detections */}
                  <div style={{ textAlign: 'center' }}>
                    <DetectionImage
                      imageUrl={prediction.imageUrl}
                      imageBase64={prediction.imageBase64}
                      detections={prediction.results}
                      model={prediction.model}
                      showPolygons={false}
                    />
                  </div>

                  {/* User and Comment */}
                  <div>
                    <Text strong>Користувач: </Text>
                    <Text>{prediction.user || 'Анонімний користувач'}</Text>
                    {!canDeletePrediction(prediction) && (
                      <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                        (Тільки власник може видалити)
                      </Text>
                    )}
                  </div>
                  
                  <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Text strong>Коментар:</Text>
                        {editingComment === prediction.id ? (
                          <Button 
                            type="link" 
                            size="small" 
                            icon={<SaveOutlined />}
                            onClick={() => handleSaveComment(prediction.id)}
                          >
                            Зберегти
                          </Button>
                        ) : (
                          <Button 
                            type="link" 
                            size="small" 
                            icon={<EditOutlined />}
                            onClick={() => handleEditComment(prediction.id, prediction.comment || '')}
                          >
                            Редагувати
                          </Button>
                        )}
                      </Space>
                      
                      {editingComment === prediction.id ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Input.TextArea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Введіть коментар..."
                            rows={2}
                          />
                          <Button 
                            size="small" 
                            onClick={handleCancelEdit}
                          >
                            Скасувати
                          </Button>
                        </Space>
                      ) : (
                        <Text>{prediction.comment || 'Не додано'}</Text>
                      )}
                    </Space>
                  </div>

                  {/* Results Summary */}
                  <div>
                    <Text strong>Результати:</Text>
                    <pre style={{
                      background: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      maxHeight: '100px',
                      overflow: 'auto',
                      marginTop: '8px',
                    }}>
                      {JSON.stringify(prediction.results, null, 2)}
                    </pre>
                  </div>
                </Space>
              </Card>
            </List.Item>
          )}
        />
        )}
      </Spin>
    </div>
  );
};

export default HistoryPage;
