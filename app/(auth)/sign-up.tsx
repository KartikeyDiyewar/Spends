import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else if (!session) {
      // This happens if "Confirm Email" is accidentally left ON in Supabase
      Alert.alert('Check Email', 'Please check your inbox for email verification!');
    } else {
      // Since Confirm Email is OFF, session will be returned instantly!
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <View className="mt-10 mb-10">
        <Text className="text-white text-3xl font-bold tracking-tight mb-2">Create Account</Text>
        <Text className="text-textSecondary text-base">Join Spends and settle up easily.</Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-textSecondary mb-2 font-medium">Full Name</Text>
          <TextInput
            className="bg-surface text-white p-4 rounded-xl border border-accent focus:border-primary"
            placeholder="John Doe"
            placeholderTextColor="#666"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

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
        onPress={signUpWithEmail}
        disabled={loading}
      >
        <Text className="text-white text-lg font-bold">{loading ? 'Creating account...' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <View className="flex-row justify-center mt-6">
        <Text className="text-textSecondary">Already have an account? </Text>
        <Link href="/(auth)/sign-in" asChild>
          <TouchableOpacity>
            <Text className="text-primary font-bold">Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
