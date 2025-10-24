export interface Prediction {
  id: string;
  imageUrl?: string;
  imageBase64?: string;
  model: 'rfdetr' | 'yolo' | 'both';
  results: any;
  timestamp: Date;
  comment?: string;
  confidence?: number;
  user?: string;
  rfdetrConfidence?: number;
  yoloConfidence?: number;
  confidenceThreshold?: number;
  rfdetrThreshold?: number;
  yoloThreshold?: number;
  imageHash?: string;
}

export interface ModelInfo {
  rfdetr: {
    loaded: boolean;
    info?: any;
  };
  yolo: {
    loaded: boolean;
    info?: any;
  };
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface AuthResponse {
  user_id: string;
  username: string;
  email?: string;
  message: string;
}
