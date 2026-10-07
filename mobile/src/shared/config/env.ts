import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach the host machine's localhost.
// Physical device with `adb reverse` uses localhost.
// iOS simulator shares the host's network so localhost works directly.
const LOCAL_API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/api'   // Android emulator → host machine
  : 'http://localhost:8000/api';  // iOS simulator

export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || LOCAL_API_URL,
};
