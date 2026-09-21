import { Platform } from 'react-native';

// For physical devices on the same Wi-Fi network, use the computer's IP address
const LOCAL_API_URL = Platform.OS === 'android' 
  ? 'http://192.168.1.8:8000/api'
  : 'http://192.168.1.8:8000/api';

export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || LOCAL_API_URL,
};
