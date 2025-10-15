import axios from "axios";
import { getAccessToken, clearAccessToken } from "@/lib/auth";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    
    // Debug logging for LiveKit requests
    if (config.url && config.url.includes('/livekit/')) {
      console.log('🔑 LiveKit API Request Debug:');
      console.log('🔑 URL:', config.url);
      console.log('🔑 Method:', config.method);
      console.log('🔑 Headers:', config.headers);
      console.log('🔑 Token present:', !!token);
      console.log('🔑 Token length:', token.length);
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    // Debug logging for LiveKit responses
    if (res.config.url && res.config.url.includes('/livekit/')) {
      console.log('📥 LiveKit API Response Debug:');
      console.log('📥 URL:', res.config.url);
      console.log('📥 Status:', res.status);
      console.log('📥 Data:', res.data);
    }
    return res;
  },
  (error) => {
    // Debug logging for LiveKit errors
    if (error?.config?.url && error.config.url.includes('/livekit/')) {
      console.log('❌ LiveKit API Error Debug:');
      console.log('❌ URL:', error.config.url);
      console.log('❌ Status:', error.response?.status);
      console.log('❌ Status Text:', error.response?.statusText);
      console.log('❌ Response Data:', error.response?.data);
      console.log('❌ Request Headers:', error.config.headers);
    }
    
    if (error?.response?.status === 401) {
      const url: string | undefined = error?.config?.url;
      // For LiveKit endpoints, surface the error to the UI instead of redirecting
      if (url && url.startsWith("/livekit/")) {
        return Promise.reject(error);
      }
      clearAccessToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);


