import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getExpenseDetail } from '../../lib/api';

export default function ExpenseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getExpenseDetail>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getExpenseDetail(id).then(data => {
      if (!data) setError('Could not load expense.');
      else setDetail(data);
      setLoading(false);
    });
  }, [id]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-6 py-4 border-b border-accent">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#A0A0AB" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">Expense Detail</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF4B4B" size="large" />
          <Text className="text-textSecondary mt-3">Loading…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-400 text-center">{error}</Text>
        </View>
      ) : detail ? (
        <ScrollView className="flex-1 p-6">
          {/* Header */}
          <View className="bg-surface rounded-2xl p-6 border border-accent mb-4">
            <View className="w-16 h-16 bg-primary/20 rounded-full items-center justify-center mb-4 self-center">
              <Text className="text-3xl">🍽️</Text>
            </View>
            <Text className="text-white text-2xl font-bold text-center mb-1">{detail.expense.description}</Text>
            <Text className="text-primary text-4xl font-extrabold text-center mt-2">
              ${Number(detail.expense.amount).toFixed(2)}
            </Text>
            <Text className="text-textSecondary text-center mt-2">
              {new Date(detail.expense.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>

          {/* Splits */}
          <View className="bg-surface rounded-2xl p-6 border border-accent">
            <Text className="text-white font-bold text-lg mb-4">Split Breakdown</Text>
            {detail.splits.map((s, i) => (
              <View key={i} className="flex-row items-center justify-between py-3 border-b border-accent/40 last:border-b-0">
                <View className="flex-row items-center flex-1">
                  <View className="w-9 h-9 bg-primary/20 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person" size={16} color="#FF4B4B" />
                  </View>
                  <Text className="text-white font-medium">{s.profile.full_name ?? s.profile.email ?? s.profile.id}</Text>
                </View>
                <Text className="text-textSecondary font-bold">${Number(s.amount_owed).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
