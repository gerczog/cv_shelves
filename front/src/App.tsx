import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ukUA from 'antd/locale/uk_UA';
import { PredictionProvider, usePrediction } from './context/PredictionContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DetectionPage from './pages/DetectionPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import './App.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = usePrediction();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!state.isAuthenticated && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [state.isAuthenticated, navigate, location.pathname]);

  if (!state.isAuthenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
};

function App() {
  return (
    <ConfigProvider locale={ukUA}>
      <PredictionProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/detection" element={<DetectionPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </PredictionProvider>
    </ConfigProvider>
  );
}

export default App;
