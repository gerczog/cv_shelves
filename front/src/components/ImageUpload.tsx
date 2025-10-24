import React, { useState, useCallback } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import { Upload as AntUpload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, disabled = false }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleChange: UploadProps['onChange'] = useCallback(({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList);
  }, []);

  const beforeUpload = useCallback((file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Ви можете завантажити тільки зображення!');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('Зображення повинно бути менше 10MB!');
      return false;
    }

    onImageSelect(file);
    return false; // Prevent auto upload
  }, [onImageSelect]);

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
