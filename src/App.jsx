import './index.css';
import './index';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './app/router/AppRouter';
import ScrollToTop from './components/shared/ScrollToTop';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Toaster position="top-right" toastOptions={{ duration: 3500,
          style: { borderRadius: '12px', padding: '14px 18px', fontSize: '14px', fontWeight: 500 },
          success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
          error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
        }} />
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
