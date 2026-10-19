import { Platform } from 'react-native';

// For a real physical device: use the host machine's WiFi LAN IP so the phone can
// reach the Django backend on the same network.
// For Android emulator: use 10.0.2.2 (special alias to host machine's localhost).
// Override at build time via EXPO_PUBLIC_API_URL env variable.
const DEVICE_API_URL = 'http://192.168.1.8:8000/api';   // WiFi LAN — real device
const EMULATOR_API_URL = 'http://10.0.2.2:8000/api';     // Android emulator

const LOCAL_API_URL = Platform.OS === 'android'
  ? DEVICE_API_URL    // works for both emulator + real device on same WiFi
  : 'http://localhost:8000/api';

export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || LOCAL_API_URL,
};
