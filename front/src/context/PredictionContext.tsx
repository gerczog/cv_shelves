import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Prediction } from '../types';

interface PredictionState {
  predictions: Prediction[];
  loading: boolean;
  error: string | null;
  currentUser: string;
  currentUserId: string | null;
  isAuthenticated: boolean;
  isDuplicate: boolean;
}

type PredictionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_PREDICTION'; payload: Prediction }
  | { type: 'UPDATE_PREDICTION'; payload: { id: string; comment: string } }
  | { type: 'LOAD_PREDICTIONS'; payload: Prediction[] }
  | { type: 'SET_USER'; payload: string }
  | { type: 'SET_AUTHENTICATED_USER'; payload: { id: string; username: string; email?: string } }
  | { type: 'LOGOUT' }
  | { type: 'CHECK_DUPLICATE'; payload: { 
      imageUrl: string; 
      results: any; 
      model: string; 
      imageHash?: string;
      rfdetrConfidence?: number;
      yoloConfidence?: number;
    } };

const initialState: PredictionState = {
  predictions: [],
  loading: false,
  error: null,
  currentUser: localStorage.getItem('cv_shelves_user') || 'Користувач',
  currentUserId: localStorage.getItem('cv_shelves_user_id') || null,
  isAuthenticated: !!localStorage.getItem('cv_shelves_user_id'),
  isDuplicate: false,
};

const predictionReducer = (state: PredictionState, action: PredictionAction): PredictionState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'ADD_PREDICTION':
      return { ...state, predictions: [action.payload, ...state.predictions] };
    case 'UPDATE_PREDICTION':
      return {
        ...state,
        predictions: state.predictions.map(pred =>
          pred.id === action.payload.id
            ? { ...pred, comment: action.payload.comment }
            : pred
        ),
      };
    case 'LOAD_PREDICTIONS':
      return { ...state, predictions: action.payload };
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_AUTHENTICATED_USER':
      localStorage.setItem('cv_shelves_user', action.payload.username);
      localStorage.setItem('cv_shelves_user_id', action.payload.id);
      return { 
        ...state, 
        currentUser: action.payload.username,
        currentUserId: action.payload.id,
        isAuthenticated: true
      };
    case 'LOGOUT':
      localStorage.removeItem('cv_shelves_user');
      localStorage.removeItem('cv_shelves_user_id');
      return { 
        ...state, 
        currentUser: 'Користувач',
        currentUserId: null,
        isAuthenticated: false
      };
    case 'CHECK_DUPLICATE':
      const { imageUrl, results, model, imageHash, rfdetrConfidence, yoloConfidence } = action.payload;
      const isDuplicate = state.predictions.some(pred => {
        // Проверяем по хешу изображения (если есть) или по URL
        const sameImage = imageHash ? 
          pred.imageHash === imageHash : 
          pred.imageUrl === imageUrl;
        
        // Проверяем параметры confidence
        const sameRfdetrConf = pred.rfdetrConfidence === rfdetrConfidence;
        const sameYoloConf = pred.yoloConfidence === yoloConfidence;
        
        return sameImage && 
               pred.model === model &&
               sameRfdetrConf &&
               sameYoloConf &&
               JSON.stringify(pred.results) === JSON.stringify(results);
      });
      return { ...state, isDuplicate };
    default:
      return state;
  }
};

interface PredictionContextType {
  state: PredictionState;
  dispatch: React.Dispatch<PredictionAction>;
  addPrediction: (prediction: Prediction) => void;
  updatePredictionComment: (id: string, comment: string) => void;
  loadPredictions: (predictions: Prediction[]) => void;
  setUser: (user: string) => void;
  setAuthenticatedUser: (user: { id: string; username: string; email?: string }) => void;
  logout: () => void;
  checkDuplicate: (
    imageUrl: string, 
    results: any, 
    model: string, 
    imageHash?: string,
    rfdetrConfidence?: number,
    yoloConfidence?: number
  ) => boolean;
}

const PredictionContext = createContext<PredictionContextType | undefined>(undefined);

export const PredictionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(predictionReducer, initialState);

  const addPrediction = (prediction: Prediction) => {
    dispatch({ type: 'ADD_PREDICTION', payload: prediction });
  };

  const updatePredictionComment = (id: string, comment: string) => {
    dispatch({ type: 'UPDATE_PREDICTION', payload: { id, comment } });
  };

  const loadPredictions = (predictions: Prediction[]) => {
    dispatch({ type: 'LOAD_PREDICTIONS', payload: predictions });
  };

  const setUser = (user: string) => {
    localStorage.setItem('cv_shelves_user', user);
    dispatch({ type: 'SET_USER', payload: user });
  };

  const setAuthenticatedUser = (user: { id: string; username: string; email?: string }) => {
    dispatch({ type: 'SET_AUTHENTICATED_USER', payload: user });
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const checkDuplicate = (
    imageUrl: string, 
    results: any, 
    model: string, 
    imageHash?: string,
    rfdetrConfidence?: number,
    yoloConfidence?: number
  ): boolean => {
    dispatch({ 
      type: 'CHECK_DUPLICATE', 
      payload: { 
        imageUrl, 
        results, 
        model, 
        imageHash, 
        rfdetrConfidence, 
        yoloConfidence 
      } 
    });
    return state.predictions.some(pred => {
      // Проверяем по хешу изображения (если есть) или по URL
      const sameImage = imageHash ? 
        pred.imageHash === imageHash : 
        pred.imageUrl === imageUrl;
      
      // Проверяем параметры confidence
      const sameRfdetrConf = pred.rfdetrConfidence === rfdetrConfidence;
      const sameYoloConf = pred.yoloConfidence === yoloConfidence;
      
      return sameImage && 
             pred.model === model &&
             sameRfdetrConf &&
             sameYoloConf &&
             JSON.stringify(pred.results) === JSON.stringify(results);
    });
  };

  return (
    <PredictionContext.Provider
      value={{
        state,
        dispatch,
        addPrediction,
        updatePredictionComment,
        loadPredictions,
        setUser,
        setAuthenticatedUser,
        logout,
        checkDuplicate,
      }}
    >
      {children}
    </PredictionContext.Provider>
  );
};

export const usePrediction = () => {
  const context = useContext(PredictionContext);
  if (context === undefined) {
    throw new Error('usePrediction must be used within a PredictionProvider');
  }
  return context;
};
