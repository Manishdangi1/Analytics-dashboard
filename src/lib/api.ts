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
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
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


