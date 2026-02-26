import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './app/theme/ThemeProvider';
import { RTLProvider } from './app/i18n/RTLProvider';
import RootNavigator from './app/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RTLProvider>
          <RootNavigator />
        </RTLProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
