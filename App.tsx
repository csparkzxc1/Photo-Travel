import 'react-native-gesture-handler';
// Side-effect import: defines the background-fetch task at JS root so the OS
// can wake the app on schedule. See features/sync/backgroundSync.ts.
import '@features/sync/backgroundSync';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@design/ThemeProvider';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useAppStore } from '@data/store';
import { getPurchases } from '@features/purchases';

export default function App() {
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const svc = getPurchases();
        await svc.configure('demo_user');
        const e = await svc.getEntitlements();
        if (!cancelled) useAppStore.getState().setEntitlements(e);
      } catch {
        // Stub fallback already gives sane defaults; swallow real-store errors.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
