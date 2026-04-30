import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Share,
} from 'react-native';
import { logger } from '../services/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    logger.log(
      `[ErrorBoundary] caught: ${error.message} | stack: ${error.stack?.substring(0, 300)}`,
    );
    if (errorInfo.componentStack) {
      logger.log(`[ErrorBoundary] componentStack: ${errorInfo.componentStack.substring(0, 300)}`);
    }
    logger.recordError(error, 'ErrorBoundary');
  }

  handleRetry = () => {
    logger.log('[ErrorBoundary] user pressed retry');
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleShare = async () => {
    const lines = [
      `Error: ${this.state.error?.message || 'unknown'}`,
      '',
      'Stack:',
      this.state.error?.stack || 'n/a',
      '',
      'Component Stack:',
      this.state.errorInfo?.componentStack || 'n/a',
      '',
      'Recent logs:',
      ...logger.getBuffer(),
    ].join('\n');

    try {
      await Share.share({ message: lines });
    } catch {}
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const errMessage = this.state.error?.message || 'Unknown error';

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Image
            source={require('../../assets/images/logo-color.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>An unexpected error occurred. Please try again.</Text>

          <View style={styles.errorBox}>
            <Text style={styles.errorLabel}>Error</Text>
            <Text style={styles.errorText} selectable>
              {errMessage}
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={this.handleShare}>
            <Text style={styles.linkText}>Share diagnostic report</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121935',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  logo: {
    width: 120,
    height: 48,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 24,
  },
  errorLabel: {
    fontSize: 12,
    color: '#7c63fd',
    fontWeight: '700',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#7c63fd',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 12,
  },
  linkText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
