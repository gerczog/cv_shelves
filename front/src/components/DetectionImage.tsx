import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Image as AntImage, Button } from 'antd';
import { NodeIndexOutlined, BorderOutlined } from '@ant-design/icons';


interface DetectionImageProps {
  imageUrl?: string;
  imageBase64?: string;
  detections?: any;
  model: 'rfdetr' | 'yolo' | 'both';
  showPolygons?: boolean;
  onTogglePolygons?: () => void;
}

const DetectionImage: React.FC<DetectionImageProps> = ({ 
  imageUrl, 
  imageBase64,
  detections, 
  model, 
  showPolygons = false, 
  onTogglePolygons 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Функция для проверки пересечения двух прямоугольников
  const boxesIntersect = useCallback((box1: number[], box2: number[]) => {
    const [x1_1, y1_1, x2_1, y2_1] = box1;
    const [x1_2, y1_2, x2_2, y2_2] = box2;
    
    return !(x2_1 < x1_2 || x2_2 < x1_1 || y2_1 < y1_2 || y2_2 < y1_1);
  }, []);

  // Функция для объединения пересекающихся боксов
  const mergeIntersectingBoxes = useCallback((boxes: number[][], confidences: number[]) => {
    const merged: { box: number[], confidence: number, count: number }[] = [];
    const used = new Set<number>();

    for (let i = 0; i < boxes.length; i++) {
      if (used.has(i)) continue;

      const currentBox = boxes[i];
      const currentConf = confidences[i] || 0;
      let mergedBox = [...currentBox];
      let totalConf = currentConf;
      let count = 1;
      const group = [i]; // Группа индексов для текущего полигона

      // Ищем все пересекающиеся боксы рекурсивно
      const findIntersecting = (boxToCheck: number[], startIndex: number) => {
        for (let j = startIndex; j < boxes.length; j++) {
          if (used.has(j) || group.includes(j)) continue;

          if (boxesIntersect(boxToCheck, boxes[j])) {
            group.push(j);
            const [x1_1, y1_1, x2_1, y2_1] = mergedBox;
            const [x1_2, y1_2, x2_2, y2_2] = boxes[j];
            
            // Объединяем боксы (расширяем границы)
            mergedBox = [
              Math.min(x1_1, x1_2),
              Math.min(y1_1, y1_2),
              Math.max(x2_1, x2_2),
              Math.max(y2_1, y2_2)
            ];
            
            totalConf += confidences[j] || 0;
            count++;
            
            // Рекурсивно ищем пересечения с новым объединенным боксом
            findIntersecting(mergedBox, j + 1);
          }
        }
      };

      // Запускаем поиск пересечений
      findIntersecting(currentBox, i + 1);

      // Помечаем все боксы в группе как использованные
      group.forEach(idx => used.add(idx));

      // Добавляем полигон только если есть пересечения (count > 1) или это одиночный бокс
      if (count > 1) {
        merged.push({
          box: mergedBox,
          confidence: totalConf / count, // Средняя уверенность
          count
        });
      } else {
        // Одиночный бокс - добавляем как обычный бокс
        merged.push({
          box: mergedBox,
          confidence: totalConf,
          count: 1
        });
      }
    }

    return merged;
  }, [boxesIntersect]);

  // Функция для рисования полигона
  const drawPolygon = (
    ctx: CanvasRenderingContext2D,
    box: number[],
    confidence: number,
    count: number,
    color: string
  ) => {
    const [x1, y1, x2, y2] = box;
    const width = x2 - x1;
    const height = y2 - y1;

    // Рисуем полигон с заливкой
    ctx.fillStyle = color + '40'; // Полупрозрачная заливка
    ctx.fillRect(x1, y1, width, height);

    // Рисуем контур
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, width, height);

    // Подпись для полигона
    const label = `Polygon: ${(confidence * 100).toFixed(1)}% (${count} boxes)`;
    ctx.font = 'bold 12px Arial';
    const textWidth = ctx.measureText(label).width;
    const textHeight = 16;
    
    ctx.fillStyle = color;
    ctx.fillRect(x1, y1 - textHeight, textWidth + 8, textHeight);
    ctx.fillStyle = 'white';
    ctx.fillText(label, x1 + 4, y1 - 4);
  };

  const drawDetections = useCallback((ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    if (!detections) return;

    // Отладочная информация
    console.log('DetectionImage - detections:', detections);
    console.log('DetectionImage - model:', model);

    const scaleX = canvasRef.current!.width / img.naturalWidth;
    const scaleY = canvasRef.current!.height / img.naturalHeight;

    // Цвета для разных моделей
    const colors = {
      rfdetr: '#1890ff',
      yolo: '#52c41a',
      both: '#722ed1'
    };

    const color = colors[model];
    let totalDetections = 0;

    // Нормализация данных в зависимости от модели
    let normalizedDetections = null;
    
    console.log('DetectionImage - detections:', detections);
    console.log('DetectionImage - model:', model);
    
    if (model === 'rfdetr' || model === 'yolo') {
      // Единый формат: { detections: [{ xyxy, confidence, class_id, class_name }], confidence: number, model: string }
      if (detections && detections.detections && Array.isArray(detections.detections)) {
        normalizedDetections = {
          [model]: detections.detections
        };
        console.log(`${model} normalization - normalizedDetections:`, normalizedDetections);
      } else {
        console.log(`${model} normalization - no detections data or not array`);
      }
    } else if (model === 'both') {
      // Комбинированный формат: { rfdetr: {...}, yolo: {...} }
      if (detections && detections.rfdetr && detections.yolo) {
        normalizedDetections = {
          rfdetr: detections.rfdetr.detections || [],
          yolo: detections.yolo.detections || []
        };
        console.log('Both models normalization - rfdetr:', normalizedDetections.rfdetr);
        console.log('Both models normalization - yolo:', normalizedDetections.yolo);
      }
    }

    if (!normalizedDetections) return;

    // Обработка результатов RFDETR (новый формат: [{xyxy: [x1,y1,x2,y2], confidence: conf, class_id: id, class_name: name}])
    if (normalizedDetections.rfdetr && Array.isArray(normalizedDetections.rfdetr)) {
      const detections = normalizedDetections.rfdetr;
      const rfdetrColor = model === 'both' ? '#1890ff' : color; // Синий для RFDETR
      
      console.log('RFDETR drawing - detections:', detections);
      console.log('RFDETR drawing - detections length:', detections.length);
      
      if (showPolygons) {
        // Объединяем пересекающиеся боксы в полигоны
        const boxes = detections.map((d: any) => d.xyxy);
        const confidences = detections.map((d: any) => d.confidence);
        const merged = mergeIntersectingBoxes(boxes, confidences);
        merged.forEach(({ box, confidence: conf, count }) => {
          const [x1, y1, x2, y2] = box;
          const width = x2 - x1;
          const height = y2 - y1;
          
          if (count > 1) {
            // Полигон для объединенных боксов
            drawPolygon(ctx, 
              [x1 * scaleX, y1 * scaleY, x2 * scaleX, y2 * scaleY], 
              conf, 
              count, 
              rfdetrColor
            );
          } else {
            // Одиночный бокс - рисуем как обычный бокс
            const label = `RFDETR: ${(conf * 100).toFixed(1)}%`;
            drawBox(ctx, x1 * scaleX, y1 * scaleY, width * scaleX, height * scaleY, conf, label, rfdetrColor);
          }
          totalDetections++;
        });
      } else {
        // Обычные боксы
        detections.forEach((detection: any) => {
          if (detection.xyxy && detection.xyxy.length >= 4) {
            const [x1, y1, x2, y2] = detection.xyxy;
            const width = x2 - x1;
            const height = y2 - y1;
            const conf = detection.confidence || 0;
            const label = `RFDETR: ${(conf * 100).toFixed(1)}%`;
            
            drawBox(ctx, x1 * scaleX, y1 * scaleY, width * scaleX, height * scaleY, conf, label, rfdetrColor);
            totalDetections++;
          }
        });
      }
    }

    // Обработка результатов YOLO (новый формат: [{xyxy: [x1,y1,x2,y2], confidence: conf, class_id: id, class_name: name}])
    if (normalizedDetections.yolo && Array.isArray(normalizedDetections.yolo)) {
      const detections = normalizedDetections.yolo;
      const yoloColor = model === 'both' ? '#52c41a' : color; // Зеленый для YOLO
      
      console.log('YOLO drawing - detections:', detections);
      console.log('YOLO drawing - detections length:', detections.length);
      
      if (showPolygons) {
        // Объединяем пересекающиеся боксы в полигоны
        const boxes = detections.map((d: any) => d.xyxy);
        const confidences = detections.map((d: any) => d.confidence);
        const merged = mergeIntersectingBoxes(boxes, confidences);
        merged.forEach(({ box, confidence: conf, count }) => {
          const [x1, y1, x2, y2] = box;
          const width = x2 - x1;
          const height = y2 - y1;
          
          if (count > 1) {
            // Полигон для объединенных боксов
            drawPolygon(ctx, 
              [x1 * scaleX, y1 * scaleY, x2 * scaleX, y2 * scaleY], 
              conf, 
              count, 
              yoloColor
            );
          } else {
            // Одиночный бокс - рисуем как обычный бокс
            const label = `YOLO: ${(conf * 100).toFixed(1)}%`;
            drawBox(ctx, x1 * scaleX, y1 * scaleY, width * scaleX, height * scaleY, conf, label, yoloColor);
          }
          totalDetections++;
        });
      } else {
        // Обычные боксы
        detections.forEach((detection: any) => {
          if (detection.xyxy && detection.xyxy.length >= 4) {
            const [x1, y1, x2, y2] = detection.xyxy;
            const width = x2 - x1;
            const height = y2 - y1;
            const conf = detection.confidence || 0;
            const label = `YOLO: ${(conf * 100).toFixed(1)}%`;
            
            drawBox(ctx, x1 * scaleX, y1 * scaleY, width * scaleX, height * scaleY, conf, label, yoloColor);
            totalDetections++;
          }
        });
      }
    }

    // Обработка прямых результатов (если не вложены в rfdetr/yolo)
    if (Array.isArray(detections)) {
      detections.forEach((detection: any, index: number) => {
        if (detection.bbox) {
          const [x, y, w, h] = detection.bbox;
          const confidence = detection.confidence || detection.score || 0;
          const label = detection.class || detection.label || `Detection ${index + 1}`;
          
          drawBox(ctx, x * scaleX, y * scaleY, w * scaleX, h * scaleY, confidence, label, color);
          totalDetections++;
        }
      });
    }

    // Обработка результатов в формате COCO (x, y, width, height)
    if (detections.detections && Array.isArray(detections.detections)) {
      detections.detections.forEach((detection: any, index: number) => {
        if (detection.bbox) {
          const [x, y, w, h] = detection.bbox;
          const confidence = detection.confidence || detection.score || 0;
          const label = detection.class || detection.label || `Detection ${index + 1}`;
          
          drawBox(ctx, x * scaleX, y * scaleY, w * scaleX, h * scaleY, confidence, label, color);
          totalDetections++;
        }
      });
    }

    // Обработка результатов в формате YOLO (x_center, y_center, width, height)
    if (detections.predictions && Array.isArray(detections.predictions)) {
      detections.predictions.forEach((detection: any, index: number) => {
        if (detection.bbox) {
          const [x_center, y_center, w, h] = detection.bbox;
          const x = x_center - w / 2;
          const y = y_center - h / 2;
          const confidence = detection.confidence || detection.score || 0;
          const label = detection.class || detection.label || `Detection ${index + 1}`;
          
          drawBox(ctx, x * scaleX, y * scaleY, w * scaleX, h * scaleY, confidence, label, color);
          totalDetections++;
        }
      });
    }

    // Обработка результатов в формате XYXY (x1, y1, x2, y2) - основной формат API
    if (detections.xyxy && Array.isArray(detections.xyxy)) {
      const xyxy = detections.xyxy;
      const confidence = detections.confidence || [];
      const classId = detections.class_id || [];
      
      xyxy.forEach((box: number[], index: number) => {
        if (box && box.length >= 4) {
          const [x1, y1, x2, y2] = box;
          const width = x2 - x1;
          const height = y2 - y1;
          const conf = confidence[index] || 0;
          const label = `Detection: ${(conf * 100).toFixed(1)}%`;
          
          drawBox(ctx, x1 * scaleX, y1 * scaleY, width * scaleX, height * scaleY, conf, label, color);
          totalDetections++;
        }
      });
    }

    // Обработка вложенных результатов RFDETR
    if (detections.rfdetr && detections.rfdetr.xyxy && Array.isArray(detections.rfdetr.xyxy)) {
      const xyxy = detections.rfdetr.xyxy;
      const confidence = detections.rfdetr.confidence || [];
      const classId = detections.rfdetr.class_id || [];
      
      xyxy.forEach((box: number[], index: number) => {
        if (box && box.length >= 4) {
          const [x1, y1, x2, y2] = box;
          const width = x2 - x1;
          const height = y2 - y1;
          const conf = confidence[index] || 0;
          const label = `RFDETR: ${(conf * 100).toFixed(1)}%`;
          
          drawBox(ctx, x1 * scaleX, y1 * scaleY, width * scaleX, height * scaleY, conf, label, color);
          totalDetections++;
        }
      });
    }

    // Обработка вложенных результатов YOLO
    if (detections.yolo && detections.yolo.xyxy && Array.isArray(detections.yolo.xyxy)) {
      const xyxy = detections.yolo.xyxy;
      const confidence = detections.yolo.confidence || [];
      const classId = detections.yolo.class_id || [];
      
      xyxy.forEach((box: number[], index: number) => {
        if (box && box.length >= 4) {
          const [x1, y1, x2, y2] = box;
          const width = x2 - x1;
          const height = y2 - y1;
          const conf = confidence[index] || 0;
          const label = `YOLO: ${(conf * 100).toFixed(1)}%`;
          
          drawBox(ctx, x1 * scaleX, y1 * scaleY, width * scaleX, height * scaleY, conf, label, '#52c41a');
          totalDetections++;
        }
      });
    }

    // Выводим отладочную информацию
    console.log(`DetectionImage - Total detections drawn: ${totalDetections}`);
  }, [detections, model, showPolygons, mergeIntersectingBoxes]);

  const drawBox = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    confidence: number, 
    label: string, 
    color: string
  ) => {
    // Рисуем только контур прямоугольника
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Рисуем фон для текста
    ctx.font = 'bold 12px Arial';
    const textWidth = ctx.measureText(label).width;
    const textHeight = 16;
    
    // Рисуем фон для текста
    ctx.fillStyle = color;
    ctx.fillRect(x, y - textHeight, textWidth + 8, textHeight);

    // Рисуем текст
    ctx.fillStyle = 'white';
    ctx.fillText(label, x + 4, y - 4);
  };

  // Функция для рисования закругленных прямоугольников (fallback для старых браузеров)
  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Устанавливаем размеры canvas
      const maxWidth = 600;
      const maxHeight = 400;
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      
      let canvasWidth = img.naturalWidth;
      let canvasHeight = img.naturalHeight;
      
      if (canvasWidth > maxWidth) {
        canvasWidth = maxWidth;
        canvasHeight = canvasWidth / aspectRatio;
      }
      
      if (canvasHeight > maxHeight) {
        canvasHeight = maxHeight;
        canvasWidth = canvasHeight * aspectRatio;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Рисуем изображение
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      
      // Рисуем детекции
      drawDetections(ctx, img);
      setImageLoaded(true);
    };

    // Use base64 if available, otherwise use URL
    const imageSource = imageBase64 || imageUrl;
    if (!imageSource) {
      console.error('No image source provided');
      return;
    }
    
    img.src = imageSource;
  }, [imageUrl, imageBase64, detections, model, drawDetections]);

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Кнопка переключения режима */}
      {onTogglePolygons && (
        <div style={{ marginBottom: '8px' }}>
          <Button
            type={showPolygons ? 'primary' : 'default'}
            icon={showPolygons ? <NodeIndexOutlined /> : <BorderOutlined />}
            onClick={onTogglePolygons}
            size="small"
          >
            {showPolygons ? 'Показати полігони' : 'Показати бокси'}
          </Button>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '400px',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          display: imageLoaded ? 'block' : 'none'
        }}
      />
      {!imageLoaded && (
        <AntImage
          src={imageBase64 || imageUrl}
          alt="Loading..."
          style={{ maxWidth: '100%', maxHeight: '400px' }}
        />
      )}
    </div>
  );
};

export default DetectionImage;
