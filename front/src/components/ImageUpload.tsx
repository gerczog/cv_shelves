import React, { useState, useCallback, useEffect } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import { Upload as AntUpload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { apiService, AppConfig } from '../services/api';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, disabled = false }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Load configuration on component mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const appConfig = await apiService.getConfig();
        setConfig(appConfig);
      } catch (error) {
        console.error('Failed to load app config:', error);
        // Fallback to default config
        setConfig({
          upload: {
            max_file_size_mb: 50,
            max_file_size_bytes: 50 * 1024 * 1024,
            allowed_extensions: ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
          },
          models: {
            rfdetr: { default_confidence_threshold: 0.5 },
            yolo: { default_confidence_threshold: 0.4 }
          }
        });
      }
    };

    loadConfig();
  }, []);

  const handleChange: UploadProps['onChange'] = useCallback(({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList);
  }, []);

  const beforeUpload = useCallback((file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Ви можете завантажити тільки зображення!');
      return false;
    }

    // Use dynamic file size limit from config
    const maxSizeMB = config?.upload.max_file_size_mb || 50;
    const isWithinSizeLimit = file.size / 1024 / 1024 < maxSizeMB;
    if (!isWithinSizeLimit) {
      message.error(`Зображення повинно бути менше ${maxSizeMB}MB!`);
      return false;
    }

    onImageSelect(file);
    return false; // Prevent auto upload
  }, [onImageSelect, config]);

  const handleRemove = useCallback(() => {
    setFileList([]);
  }, []);

  return (
    <AntUpload
      name="image"
      listType="picture-card"
      fileList={fileList}
      onChange={handleChange}
      beforeUpload={beforeUpload}
      onRemove={handleRemove}
      disabled={disabled}
      accept="image/*"
      showUploadList={{
        showPreviewIcon: true,
        showRemoveIcon: true,
        showDownloadIcon: false,
      }}
    >
      {fileList.length >= 1 ? null : (
        <div>
          <InboxOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <div style={{ marginTop: 8 }}>Завантажити зображення</div>
        </div>
      )}
    </AntUpload>
  );
};

export default ImageUpload;
