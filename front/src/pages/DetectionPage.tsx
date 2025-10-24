import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Typography, message, Spin, Row, Col, Slider, Alert } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import ImageUpload from '../components/ImageUpload';
import ModelSelector from '../components/ModelSelector';
import PredictionDisplay from '../components/PredictionDisplay';
import { usePrediction } from '../context/PredictionContext';
import { apiService } from '../services/api';
import { Prediction } from '../types';
import { getImageHash } from '../utils/imageHash';

const { Title, Text } = Typography;

const DetectionPage: React.FC = () => {
  const { state, addPrediction, updatePredictionComment, checkDuplicate } = usePrediction();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<'rfdetr' | 'yolo' | 'both'>('both');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [rfdetrConfidence, setRfdetrConfidence] = useState(0.1);
  const [yoloConfidence, setYoloConfidence] = useState(0.1);
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [currentImageHash, setCurrentImageHash] = useState<string | null>(null);

  const handleImageSelect = useCallback(async (file: File) => {
    setSelectedImage(file);
    setCurrentPrediction(null);
    setIsDuplicate(false);
    
    // Вычисляем хеш изображения
    try {
      const hash = await getImageHash(file);
      setCurrentImageHash(hash);
    } catch (error) {
      console.warn('Failed to calculate image hash:', error);
      setCurrentImageHash(null);
    }
  }, []);


  const handleModelChange = useCallback((model: 'rfdetr' | 'yolo' | 'both') => {
    setSelectedModel(model);
  }, []);

  const generatePredictionId = () => {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const createImageUrl = (file: File) => {
    return URL.createObjectURL(file);
  };

  const runPrediction = async () => {
    if (!selectedImage) {
      message.error('Будь ласка, оберіть зображення');
      return;
    }

    setLoading(true);
    try {
      const predictionId = generatePredictionId();
      const imageUrl = createImageUrl(selectedImage);
      let results: any = {};

      if (selectedModel === 'both') {
        // Використовуємо новий API для комбінованих передбачень
        try {
          results = await apiService.predictBoth(selectedImage, rfdetrConfidence, yoloConfidence);
        } catch (error: any) {
          console.error('Combined prediction failed:', error);
          console.log('Error response:', error.response?.data);
          if (error.response?.data?.is_duplicate) {
            console.log('Дублікат виявлено, завантажуємо з бази даних');
            const duplicateId = error.response?.data?.duplicate_id;
            
            // Отримуємо результати дубліката з бази
            try {
              const duplicateResults = await apiService.getPredictionById(duplicateId);
              results = duplicateResults.results;
              console.log('Using duplicate results for display:', results);
              
              // Створюємо об'єкт prediction для відображення
              const duplicatePrediction: Prediction = {
                id: duplicateResults.id,
                imageUrl: duplicateResults.imageUrl,
                imageBase64: duplicateResults.imageBase64,
                model: duplicateResults.model,
                results: duplicateResults.results,
                timestamp: new Date(duplicateResults.timestamp),
                confidence: duplicateResults.confidence,
                rfdetrConfidence: duplicateResults.rfdetrConfidence,
                yoloConfidence: duplicateResults.yoloConfidence,
                confidenceThreshold: duplicateResults.confidenceThreshold,
                rfdetrThreshold: duplicateResults.rfdetrThreshold,
                yoloThreshold: duplicateResults.yoloThreshold,
                user: duplicateResults.user,
                imageHash: duplicateResults.imageHash,
                comment: duplicateResults.comment
              };
              
              setCurrentPrediction(duplicatePrediction);
              console.log('Duplicate prediction set:', duplicatePrediction);
            } catch (err) {
              console.error('Failed to get duplicate results:', err);
              results = { error: 'Failed to load duplicate results' };
            }
            return;
          }
          results = { error: 'Combined prediction failed' };
        }
      } else if (selectedModel === 'rfdetr') {
        try {
          results = await apiService.predictRfdetr(selectedImage, rfdetrConfidence);
        } catch (error: any) {
          console.error('RFDETR prediction failed:', error);
          if (error.response?.data?.is_duplicate) {
            console.log('Дублікат виявлено, завантажуємо з бази даних');
            const duplicateId = error.response?.data?.duplicate_id;
            
            // Отримуємо результати дубліката з бази
            try {
              const duplicateResults = await apiService.getPredictionById(duplicateId);
              results = duplicateResults.results;
              console.log('Using duplicate results for display:', results);
              
              // Створюємо об'єкт prediction для відображення
              const duplicatePrediction: Prediction = {
                id: duplicateResults.id,
                imageUrl: duplicateResults.imageUrl,
                imageBase64: duplicateResults.imageBase64,
                model: duplicateResults.model,
                results: duplicateResults.results,
                timestamp: new Date(duplicateResults.timestamp),
                confidence: duplicateResults.confidence,
                rfdetrConfidence: duplicateResults.rfdetrConfidence,
                yoloConfidence: duplicateResults.yoloConfidence,
                confidenceThreshold: duplicateResults.confidenceThreshold,
                rfdetrThreshold: duplicateResults.rfdetrThreshold,
                yoloThreshold: duplicateResults.yoloThreshold,
                user: duplicateResults.user,
                imageHash: duplicateResults.imageHash,
                comment: duplicateResults.comment
              };
              
              setCurrentPrediction(duplicatePrediction);
              console.log('Duplicate prediction set:', duplicatePrediction);
            } catch (err) {
              console.error('Failed to get duplicate results:', err);
              results = { error: 'Failed to load duplicate results' };
            }
            return;
          }
          results = { error: 'RFDETR prediction failed' };
        }
      } else if (selectedModel === 'yolo') {
        try {
          results = await apiService.predictYolo(selectedImage, yoloConfidence);
        } catch (error: any) {
          console.error('YOLO prediction failed:', error);
          if (error.response?.data?.is_duplicate) {
            console.log('Дублікат виявлено, завантажуємо з бази даних');
            const duplicateId = error.response?.data?.duplicate_id;
            
            // Отримуємо результати дубліката з бази
            try {
              const duplicateResults = await apiService.getPredictionById(duplicateId);
              results = duplicateResults.results;
              console.log('Using duplicate results for display:', results);
              
              // Створюємо об'єкт prediction для відображення
              const duplicatePrediction: Prediction = {
                id: duplicateResults.id,
                imageUrl: duplicateResults.imageUrl,
                imageBase64: duplicateResults.imageBase64,
                model: duplicateResults.model,
                results: duplicateResults.results,
                timestamp: new Date(duplicateResults.timestamp),
                confidence: duplicateResults.confidence,
                rfdetrConfidence: duplicateResults.rfdetrConfidence,
                yoloConfidence: duplicateResults.yoloConfidence,
                confidenceThreshold: duplicateResults.confidenceThreshold,
                rfdetrThreshold: duplicateResults.rfdetrThreshold,
                yoloThreshold: duplicateResults.yoloThreshold,
                user: duplicateResults.user,
                imageHash: duplicateResults.imageHash,
                comment: duplicateResults.comment
              };
              
              setCurrentPrediction(duplicatePrediction);
              console.log('Duplicate prediction set:', duplicatePrediction);
            } catch (err) {
              console.error('Failed to get duplicate results:', err);
              results = { error: 'Failed to load duplicate results' };
            }
            return;
          }
          results = { error: 'YOLO prediction failed' };
        }
      }

      // Витягуємо впевненості для комбінованих результатів
      let rfdetrConf = undefined;
      let yoloConf = undefined;
      let singleConf = undefined;

      if (selectedModel === 'both') {
        rfdetrConf = results.rfdetr?.confidence || 0;
        yoloConf = results.yolo?.confidence || 0;
      } else if (selectedModel === 'rfdetr') {
        singleConf = results.confidence || 0;
        rfdetrConf = singleConf;
      } else if (selectedModel === 'yolo') {
        singleConf = results.confidence || 0;
        yoloConf = singleConf;
      }
      
      // Для перевірки дублікатів використовуємо користувацькі пороги зі стану компонента
      const rfdetrThreshold = selectedModel === 'both' ? rfdetrConfidence : (selectedModel === 'rfdetr' ? rfdetrConfidence : undefined);
      const yoloThreshold = selectedModel === 'both' ? yoloConfidence : (selectedModel === 'yolo' ? yoloConfidence : undefined);

      const prediction: Prediction = {
        id: predictionId,
        imageUrl,
        imageBase64: results.image_base64,
        model: selectedModel,
        results,
        timestamp: new Date(),
        confidence: singleConf,
        rfdetrConfidence: rfdetrConf,
        yoloConfidence: yoloConf,
        user: state.currentUser,
        imageHash: currentImageHash || undefined,
      };

      setCurrentPrediction(prediction);
      
      // Спочатку перевіряємо базу даних на дублікати
      console.log('Checking database for duplicates...');
      console.log('Image hash:', currentImageHash);
      console.log('Model:', selectedModel);
      console.log('RFDETR threshold from state:', rfdetrConfidence);
      console.log('YOLO threshold from state:', yoloConfidence);
      console.log('RFDETR threshold for API:', rfdetrThreshold);
      console.log('YOLO threshold for API:', yoloThreshold);
      
      try {
        const duplicateResults = await apiService.checkDuplicate(
          currentImageHash || '',
          selectedModel,
          rfdetrThreshold,
          yoloThreshold
        );
        
        console.log('Database duplicate check result:', duplicateResults);
        
        if (duplicateResults.is_duplicate) {
          // Отримуємо повні дані дубліката з бази
          const existingPrediction = await apiService.getPredictionById(duplicateResults.duplicate_id);
          
          // Оновлюємо currentPrediction з даними з бази
          const duplicatePrediction: Prediction = {
            id: existingPrediction.id,
            imageUrl: existingPrediction.imageUrl,
            imageBase64: existingPrediction.imageBase64,
            model: existingPrediction.model,
            results: existingPrediction.results,
            timestamp: new Date(existingPrediction.timestamp),
            confidence: existingPrediction.confidence,
            rfdetrConfidence: existingPrediction.rfdetrConfidence,
            yoloConfidence: existingPrediction.yoloConfidence,
            confidenceThreshold: existingPrediction.confidenceThreshold,
            rfdetrThreshold: existingPrediction.rfdetrThreshold,
            yoloThreshold: existingPrediction.yoloThreshold,
            user: existingPrediction.user,
            imageHash: existingPrediction.imageHash,
            comment: existingPrediction.comment
          };
          
          setCurrentPrediction(duplicatePrediction);
          setIsDuplicate(true);
          console.log('Duplicate loaded from database:', duplicatePrediction);
          console.log('Current prediction set to:', duplicatePrediction);
          console.log('Results for drawing:', duplicatePrediction.results);
          
          const paramsText = selectedModel === 'both' 
            ? `RFDETR: ${((rfdetrConfidence || 0) * 100).toFixed(1)}%, YOLO: ${((yoloConfidence || 0) * 100).toFixed(1)}%`
            : selectedModel === 'rfdetr' 
            ? `RFDETR: ${((rfdetrConfidence || 0) * 100).toFixed(1)}%`
            : `YOLO: ${((yoloConfidence || 0) * 100).toFixed(1)}%`;

          // НЕ додаємо до історії, але відображаємо бокси
        } else {
          // Дублікат не знайдено, додаємо нове передбачення
          addPrediction(prediction);
          setIsDuplicate(false);
          message.success('Передбачення виконано успішно!');
        }
      } catch (error) {
        console.error('Failed to check duplicate in database:', error);
        // У разі помилки додаємо передбачення
        addPrediction(prediction);
        setIsDuplicate(false);
        message.success('Предсказание выполнено успешно!');
      }
    } catch (error) {
      console.error('Prediction failed:', error);
      message.error('Помилка при виконанні передбачення');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComment = useCallback(async (id: string, comment: string) => {
    try {
      // Сохраняем комментарий в базу данных через API
      await apiService.updatePredictionComment(id, comment);
      
      // Оновлюємо глобальний стан
      updatePredictionComment(id, comment);
      
      // Оновлюємо локальний стан
      if (currentPrediction && currentPrediction.id === id) {
        setCurrentPrediction({ ...currentPrediction, comment });
      }
      
      message.success('Коментар збережено успішно');
    } catch (error) {
      console.error('Error saving comment:', error);
      message.error('Помилка збереження коментаря');
    }
  }, [currentPrediction, updatePredictionComment]);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>Детекція об'єктів</Title>
      <Text type="secondary">
        Завантажте зображення та оберіть модель для аналізу
      </Text>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        {/* Left Column - Controls */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Image Upload */}
            <Card title="1. Завантаження зображення" size="small">
              <ImageUpload
                onImageSelect={handleImageSelect}
                disabled={loading}
              />
            </Card>

            {/* Model Selection */}
            <Card title="2. Вибір моделі" size="small">
              <ModelSelector
                value={selectedModel}
                onChange={handleModelChange}
                disabled={loading}
              />
            </Card>

            {/* Confidence Threshold */}
            <Card title="3. Налаштування" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {selectedModel === 'both' ? (
                  <>
                    <div>
                      <Text strong>RFDETR поріг впевненості: {rfdetrConfidence}</Text>
                      <Slider
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={rfdetrConfidence}
                        onChange={setRfdetrConfidence}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Text strong>YOLO поріг впевненості: {yoloConfidence}</Text>
                      <Slider
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={yoloConfidence}
                        onChange={setYoloConfidence}
                        disabled={loading}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <Text strong>Поріг впевненості: {selectedModel === 'rfdetr' ? rfdetrConfidence : yoloConfidence}</Text>
                    <Slider
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      value={selectedModel === 'rfdetr' ? rfdetrConfidence : yoloConfidence}
                      onChange={selectedModel === 'rfdetr' ? setRfdetrConfidence : setYoloConfidence}
                      disabled={loading}
                    />
                  </div>
                )}
              </Space>
            </Card>

            {/* Run Prediction Button */}
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={runPrediction}
              loading={loading}
              disabled={!selectedImage}
              style={{ width: '100%' }}
            >
              {loading ? 'Виконується аналіз...' : 'Запустити аналіз'}
            </Button>
          </Space>
        </Col>

        {/* Right Column - Results */}
        <Col xs={24} lg={16}>
          {currentPrediction ? (
            <div>
              {isDuplicate && (
                <Alert
                  message="Дані в БД"
                  description={
                    <div>
                      <div>Параметри передбачення:</div>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                        • Передбачення: #{currentPrediction.id.substring(0, 8)}...<br/>
                        • Зображення: {selectedImage?.name || 'завантажено'}<br/>
                        • Модель: {selectedModel.toUpperCase()}<br/>
                        {selectedModel === 'both' && (
                          <>• RFDETR confidence: {(rfdetrConfidence * 100).toFixed(1)}%<br/>
                          • YOLO confidence: {(yoloConfidence * 100).toFixed(1)}%</>
                        )}
                        {selectedModel === 'rfdetr' && (
                          <>• RFDETR confidence: {(rfdetrConfidence * 100).toFixed(1)}%</>
                        )}
                        {selectedModel === 'yolo' && (
                          <>• YOLO confidence: {(yoloConfidence * 100).toFixed(1)}%</>
                        )}
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        Змініть параметри для нового аналізу.
                      </div>
                    </div>
                  }
                  type="warning"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
              )}
              <PredictionDisplay
                prediction={currentPrediction}
                onSaveComment={handleSaveComment}
                loading={loading}
              />
            </div>
          ) : (
            <Card style={{ textAlign: 'center', padding: '48px' }}>
              <ReloadOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
              <Title level={4} type="secondary" style={{ marginTop: '16px' }}>
                Результати з'являться тут після аналізу
              </Title>
              <Text type="secondary">
                Завантажте зображення та натисніть "Запустити аналіз"
              </Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default DetectionPage;
