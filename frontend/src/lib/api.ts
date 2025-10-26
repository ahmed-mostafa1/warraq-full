import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const apiClient = axios.create({
  baseURL,
  withCredentials: false,
  headers: {
    Accept: "application/json",
  },
});

console.log("[API] baseURL =", apiClient.defaults.baseURL);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 422) {
      console.warn("Validation error", error.response.data);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
