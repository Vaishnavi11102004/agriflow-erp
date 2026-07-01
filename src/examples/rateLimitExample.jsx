/**
 * Example: Using Rate Limiting in Components
 * 
 * This file demonstrates how to integrate rate limiting into your React components.
 */

import React, { useState } from 'react';
import api from '../services/api/axios';
import { useRateLimit, requestWithRateLimit } from '../hooks/useRateLimit';
import toast from 'react-hot-toast';

// Example 1: Using the useRateLimit hook
export function LoginExample() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const { 
    isRateLimited, 
    rateLimitInfo, 
    executeWithRateLimitHandling 
  } = useRateLimit({
    showToast: true,
    autoRetry: false,
    maxRetries: 3
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    await executeWithRateLimitHandling(
      async () => {
        const response = await api.post('/auth/login', { phone, password });
        return response.data;
      },
      '/auth/login',
      'POST'
    );
  };

  if (isRateLimited) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">
          Too many login attempts. Please wait {rateLimitInfo?.retryAfter} seconds.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone number"
        className="w-full p-2 border rounded"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full p-2 border rounded"
      />
      <button 
        type="submit" 
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Login
      </button>
    </form>
  );
}

// Example 2: Using requestWithRateLimit directly
export function CropRegistrationExample() {
  const [formData, setFormData] = useState({
    crop_type: '',
    acres: '',
    sowing_date: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await requestWithRateLimit(
        () => api.post('/farmer/crops', formData),
        '/farmer/crops',
        'POST'
      );
      
      toast.success('Crop registered successfully!');
      console.log('Response:', response);
    } catch (error) {
      if (error.status === 429) {
        toast.error(`Please wait ${error.retryAfter} seconds before trying again.`);
      } else {
        toast.error('Registration failed. Please try again.');
      }
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={formData.crop_type}
        onChange={(e) => setFormData({...formData, crop_type: e.target.value})}
        placeholder="Crop type"
        className="w-full p-2 border rounded"
      />
      <input
        type="number"
        value={formData.acres}
        onChange={(e) => setFormData({...formData, acres: e.target.value})}
        placeholder="Acres"
        className="w-full p-2 border rounded"
      />
      <input
        type="date"
        value={formData.sowing_date}
        onChange={(e) => setFormData({...formData, sowing_date: e.target.value})}
        className="w-full p-2 border rounded"
      />
      <button 
        type="submit" 
        className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
      >
        Register Crop
      </button>
    </form>
  );
}

// Example 3: OTP request with automatic queuing
export function OTPRequestExample() {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendOTP = async () => {
    setIsLoading(true);
    
    try {
      // OTP requests are automatically queued if rate limited
      const response = await requestWithRateLimit(
        () => api.post('/auth/send-otp', { phone }),
        '/auth/send-otp',
        'POST'
      );
      
      toast.success('OTP sent successfully!');
      console.log('Response:', response);
    } catch (error) {
      if (error.status === 429) {
        toast.error(`Please wait ${error.retryAfter} seconds before requesting another OTP.`);
      } else {
        toast.error('Failed to send OTP. Please try again.');
      }
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Enter phone number"
        className="w-full p-2 border rounded"
        maxLength={10}
      />
      <button 
        onClick={sendOTP}
        disabled={isLoading || phone.length !== 10}
        className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
      >
        {isLoading ? 'Sending...' : 'Send OTP'}
      </button>
    </div>
  );
}

// Example 4: Using with React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function ReactQueryExample() {
  const queryClient = useQueryClient();

  // Fetch with rate limiting
  const { data: crops, isLoading } = useQuery({
    queryKey: ['crops'],
    queryFn: async () => {
      const response = await requestWithRateLimit(
        () => api.get('/farmer/crops'),
        '/farmer/crops',
        'GET'
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on rate limit errors
      if (error.status === 429) return false;
      return failureCount < 3;
    }
  });

  // Mutation with rate limiting
  const createCropMutation = useMutation({
    mutationFn: async (newCrop) => {
      const response = await requestWithRateLimit(
        () => api.post('/farmer/crops', newCrop),
        '/farmer/crops',
        'POST'
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crops']);
      toast.success('Crop created!');
    },
    onError: (error) => {
      if (error.status === 429) {
        toast.error(`Too many requests. Please wait ${error.retryAfter} seconds.`);
      } else {
        toast.error('Failed to create crop');
      }
    }
  });

  const handleCreateCrop = () => {
    createCropMutation.mutate({
      crop_type: 'Rice',
      acres: 5,
      sowing_date: new Date().toISOString().split('T')[0]
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button 
        onClick={handleCreateCrop}
        disabled={createCropMutation.isPending}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Add Crop
      </button>
      
      {crops?.map((crop) => (
        <div key={crop.id} className="border p-4 my-2 rounded">
          <h3>{crop.crop_type}</h3>
          <p>{crop.acres} acres</p>
        </div>
      ))}
    </div>
  );
}

// Example 5: Global error handler for rate limits
export function RateLimitErrorBoundary({ children }) {
  // This would be implemented as an error boundary in a real app
  // For now, we'll use a simple wrapper
  
  const handleError = (error) => {
    if (error.status === 429 || error.response?.status === 429) {
      const retryAfter = error.retryAfter || error.response?.headers?.['retry-after'] || 60;
      toast.error(
        <div>
          <strong>Rate Limit Exceeded</strong>
          <p>Please wait {retryAfter} seconds before continuing.</p>
        </div>,
        { duration: retryAfter * 1000, icon: '⚠️' }
      );
    }
  };

  // Wrap children with error handling
  return children;
}

export default {
  LoginExample,
  CropRegistrationExample,
  OTPRequestExample,
  ReactQueryExample,
  RateLimitErrorBoundary
};