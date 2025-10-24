import React from 'react';
import { Layout as AntLayout, Menu, Typography, Space, Button, Dropdown } from 'antd';
import { CameraOutlined, HistoryOutlined, HomeOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePrediction } from '../context/PredictionContext';

const { Header, Content, Sider } = AntLayout;
const { Title } = Typography;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, logout } = usePrediction();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: 'Головна',
    },
    {
      key: '/detection',
      icon: <CameraOutlined />,
      label: 'Детекція',
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: 'Історія',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Вийти',
      onClick: handleLogout,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px'
      }}>
        <Space>
          <CameraOutlined style={{ fontSize: '24px', color: '#fff' }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            CV Shelves ML
          </Title>
        </Space>
        
        {state.isAuthenticated && (
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Button type="text" style={{ color: '#fff' }}>
              <Space>
                <UserOutlined />
                {state.currentUser}
              </Space>
            </Button>
          </Dropdown>
        )}
      </Header>
      
      <AntLayout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        
        <AntLayout style={{ padding: '0 24px 24px' }}>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              margin: 0,
              minHeight: 280,
            }}
          >
            {children}
          </Content>
        </AntLayout>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
