import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        Alert.alert('Email Not Confirmed', 'Please check your email to confirm your account, or disable "Confirm Email" in the Supabase Dashboard.');
      } else {
        Alert.alert('Sign In Failed', error.message);
      }
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <View className="mt-10 mb-10">
        <Text className="text-white text-3xl font-bold tracking-tight mb-2">Welcome Back</Text>
        <Text className="text-textSecondary text-base">Sign in to your Spends account.</Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-textSecondary mb-2 font-medium">Email</Text>
          <TextInput
            className="bg-surface text-white p-4 rounded-xl border border-accent focus:border-primary"
            placeholder="you@example.com"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-textSecondary mb-2 font-medium">Password</Text>
          <TextInput
            className="bg-surface text-white p-4 rounded-xl border border-accent focus:border-primary"
            placeholder="••••••••"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
      </View>

      <TouchableOpacity
        className="w-full bg-primary rounded-xl py-4 items-center mt-8 opacity-90"
        onPress={signInWithEmail}
        disabled={loading}
      >
        <Text className="text-white text-lg font-bold">{loading ? 'Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>

      <View className="flex-row justify-center mt-6">
        <Text className="text-textSecondary">Don't have an account? </Text>
        <Link href="/(auth)/sign-up" asChild>
          <TouchableOpacity>
            <Text className="text-primary font-bold">Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
