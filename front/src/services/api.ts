import axios from 'axios';
import { ModelInfo, Prediction, AuthResponse } from '../types';

export interface HistoryFilters {
  skip?: number;
  limit?: number;
  userId?: string;
  users?: string[];
  model?: string;
  searchText?: string;
  minConfidence?: number;
  maxConfidence?: number;
}

export interface HistoryResponse {
  predictions: Prediction[];
  total: number;
  skip: number;
  limit: number;
}

export interface StatisticsResponse {
  total: number;
  byModel: {
    rfdetr: number;
    yolo: number;
    both: number;
  };
}

export interface AppConfig {
  upload: {
    max_file_size_mb: number;
    max_file_size_bytes: number;
    allowed_extensions: string[];
  };
  models: {
    rfdetr: {
      default_confidence_threshold: number;
    };
    yolo: {
      default_confidence_threshold: number;
    };
  };
}

export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
  isActive: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for ML predictions
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem('cv_shelves_user_id');
  if (userId) {
    config.headers.Authorization = `Bearer ${userId}`;
  }
  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      baseURL: error.config?.baseURL
    });
    return Promise.reject(error);
  }
);

export const apiService = {
  // Get model information
  getModelInfo: async (): Promise<ModelInfo> => {
    const response = await api.get('/v1/api/ml/models/info');
    return response.data;
  },

  // Get application configuration
  getConfig: async (): Promise<AppConfig> => {
    const response = await api.get('/v1/api/ml/config');
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // RFDETR prediction
  predictRfdetr: async (image: File, confidenceThreshold: number = 0.1) => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('confidence_threshold', confidenceThreshold.toString());
    
    const response = await api.post('/v1/api/ml/predict/rfdetr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // YOLO prediction
  predictYolo: async (image: File, confidenceThreshold: number = 0.4) => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('confidence_threshold', confidenceThreshold.toString());
    formData.append('save', 'false');
    formData.append('show', 'false');
    
    const response = await api.post('/v1/api/ml/predict/yolo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Combined prediction (both models)
  predictBoth: async (image: File, rfdetrConfidenceThreshold: number = 0.1, yoloConfidenceThreshold: number = 0.4) => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('rfdetr_confidence_threshold', rfdetrConfidenceThreshold.toString());
    formData.append('yolo_confidence_threshold', yoloConfidenceThreshold.toString());
    
    const response = await api.post('/v1/api/ml/predict/both', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Check for duplicates
  checkDuplicate: async (imageHash: string, model: string, rfdetrThreshold?: number, yoloThreshold?: number) => {
    const params = new URLSearchParams();
    params.append('image_hash', imageHash);
    params.append('model', model);
    if (rfdetrThreshold !== undefined) {
      params.append('rfdetr_threshold', rfdetrThreshold.toString());
    }
    if (yoloThreshold !== undefined) {
      params.append('yolo_threshold', yoloThreshold.toString());
    }
    
    const response = await api.get(`/v1/api/history/check-duplicate?${params.toString()}`);
    return response.data;
  },

  // History API methods
  getPredictions: async (filters: HistoryFilters = {}): Promise<HistoryResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Convert camelCase to snake_case for API
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        params.append(snakeKey, value.toString());
      }
    });
    
    const response = await api.get(`/v1/api/history/predictions?${params.toString()}`);
    return response.data;
  },

  getPredictionById: async (predictionId: string): Promise<Prediction> => {
    const response = await api.get(`/v1/api/history/predictions/${predictionId}`);
    return response.data;
  },

  updatePredictionComment: async (predictionId: string, comment: string): Promise<Prediction> => {
    const formData = new FormData();
    formData.append('comment', comment);
    
    const response = await api.put(`/v1/api/history/predictions/${predictionId}/comment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deletePrediction: async (predictionId: string): Promise<void> => {
    console.log('API: Deleting prediction with ID:', predictionId);
    console.log('API: Base URL:', API_BASE_URL);
    console.log('API: Full URL will be:', `${API_BASE_URL}/v1/api/history/predictions/${predictionId}`);
    
    try {
      const response = await api.delete(`/v1/api/history/predictions/${predictionId}`);
      console.log('API: Delete response status:', response.status);
      console.log('API: Delete response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Delete error:', error);
      console.error('API: Error response:', (error as any)?.response);
      console.error('API: Error status:', (error as any)?.response?.status);
      console.error('API: Error data:', (error as any)?.response?.data);
      throw error;
    }
  },


  getStatistics: async (): Promise<StatisticsResponse> => {
    const response = await api.get('/v1/api/history/statistics');
    return response.data;
  },

  getUsers: async (): Promise<{ users: User[] }> => {
    const response = await api.get('/v1/api/history/users');
    return response.data;
  },

  createUser: async (username: string, email?: string): Promise<User> => {
    const formData = new FormData();
    formData.append('username', username);
    if (email) {
      formData.append('email', email);
    }
    
    const response = await api.post('/v1/api/history/users', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Authentication methods
  register: async (username: string, password: string, email?: string): Promise<AuthResponse> => {
    const response = await api.post('/v1/api/auth/register', {
      username,
      password,
      email
    });
    return response.data;
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/v1/api/auth/login', {
      username,
      password
    });
    return response.data;
  },

  getUserInfo: async (userId: string): Promise<User> => {
    const response = await api.get(`/v1/api/auth/users/${userId}`);
    return response.data;
  },

  // Export history as JSON
  exportHistory: async (): Promise<Blob> => {
    const response = await api.get('/export/history', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;
