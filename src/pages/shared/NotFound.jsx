import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle size={48} className="text-red-500" />
      </div>
      <h1 className="text-6xl font-black text-gray-900 mb-2">404</h1>
      <h2 className="text-2xl font-bold text-gray-700 mb-6">Page Not Found</h2>
      <p className="text-gray-500 text-center max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved. Check the URL or go back to the home page.
      </p>
      <Link to="/" className="btn-primary flex items-center gap-2">
        <Home size={18} /> Back to Home
      </Link>
    </div>
  );
}
