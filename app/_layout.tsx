import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import '../global.css';

cssInterop(SafeAreaView, { className: 'style' });

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1A1A24' },
          headerTintColor: '#FFFFFF',
          contentStyle: { backgroundColor: '#0D0D12' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-expense" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="settle-up" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="expense/[id]" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
