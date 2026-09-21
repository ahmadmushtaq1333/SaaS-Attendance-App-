import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// 1. Auth Stack Types
export type AuthStackParamList = {
  Login: undefined;
  // ForgotPassword: { email?: string }; // Future expansion
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

// 2. Main Stack Types
export type MainStackParamList = {
  Dashboard: undefined;
  // Scanner: undefined; // Future expansion
};

export type MainNavigationProp = NativeStackNavigationProp<MainStackParamList>;

// 3. Global types to override React Navigation's root param list for strict typing
declare global {
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList, MainStackParamList {}
  }
}
