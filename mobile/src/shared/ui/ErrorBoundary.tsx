import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <AlertTriangle size={36} color="#F87171" />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected display issue occurred. Tap below to reload this view.
            </Text>
            {__DEV__ && this.state.error && (
              <Text style={styles.errorDetails} numberOfLines={3}>
                {this.state.error.message}
              </Text>
            )}
            <TouchableOpacity
              style={styles.btn}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color="#FFFFFF" />
              <Text style={styles.btnText}>Reload View</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060B18',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(12, 26, 53, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 187, 255, 0.16)',
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#EEF2FF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(199, 213, 255, 0.72)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorDetails: {
    color: '#F87171',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    padding: 8,
    borderRadius: 8,
    width: '100%',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F8EF7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
