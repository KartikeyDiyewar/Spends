import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D12', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF4B4B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D12' }}>
      <View className="flex-1 p-6 justify-between">
        <View className="mt-10">
        <Text className="text-primary text-5xl font-extrabold tracking-tighter mb-2">Spends.</Text>
        <Text className="text-textSecondary text-lg font-medium">
          Settle up with a single tap.
        </Text>
      </View>

      <View className="w-full space-y-4 mb-10">
        <Link href="/(auth)/sign-up" asChild>
          <TouchableOpacity className="w-full bg-primary rounded-2xl py-4 items-center mb-4">
            <Text className="text-white text-lg font-bold">Get Started</Text>
          </TouchableOpacity>
        </Link>
        
        <Link href="/(auth)/sign-in" asChild>
          <TouchableOpacity className="w-full bg-surface rounded-2xl py-4 items-center border border-accent">
            <Text className="text-textPrimary text-lg font-bold">I already have an account</Text>
          </TouchableOpacity>
        </Link>
      </View>
      </View>
    </SafeAreaView>
  );
}
