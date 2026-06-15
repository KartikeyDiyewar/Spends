import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { simplifyDebts, Debt } from '../../lib/debt-engine';
import { getAllDebtsForUser, getProfilesByIds } from '../../lib/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function Dashboard() {
  const router = useRouter();
  const [netBalance, setNetBalance] = useState(0);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const fetchDebts = useCallback(async () => {
    if (!session?.user?.id) return;
    const currentUserId = session.user.id;
    setLoading(true);
    setError(null);

    const rawDebts = await getAllDebtsForUser(currentUserId);

    if (rawDebts.length === 0 && !rawDebts) {
      setError('Failed to load balances.');
      setLoading(false);
      return;
    }

    const simplified = simplifyDebts(rawDebts);
    setDebts(simplified);

    // Batch-fetch names for all unique IDs (excluding the current user)
    const ids = Array.from(
      new Set(simplified.flatMap(d => [d.debtor, d.creditor]).filter(id => id !== currentUserId))
    );
    const profiles = await getProfilesByIds(ids);
    const nameMap: Record<string, string> = {};
    profiles.forEach(p => { nameMap[p.id] = p.full_name ?? p.id; });
    setNames(nameMap);

    let balance = 0;
    simplified.forEach(d => {
      if (d.creditor === currentUserId) balance += d.amount;
      if (d.debtor === currentUserId) balance -= d.amount;
    });
    setNetBalance(balance);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      fetchDebts();
    }, [fetchDebts])
  );

  const currentUserId = session?.user?.id ?? '';
  const myDebts = debts.filter(d => d.debtor === currentUserId);
  const myCredits = debts.filter(d => d.creditor === currentUserId);

  const resolveName = (id: string) => names[id] ?? id.slice(0, 8) + '…';

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <View className="flex-row justify-between items-center mt-4">
        <Text className="text-white text-3xl font-bold">Dashboard</Text>
      </View>

      <Animated.View
        entering={FadeInDown.duration(600).springify()}
        className="mt-8 bg-surface p-6 rounded-2xl border border-accent shadow-lg"
      >
        <Text className="text-textSecondary font-medium mb-1">Total Balance</Text>
        <Text className={`text-4xl font-extrabold ${netBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
          {netBalance >= 0 ? '+' : '-'}${Math.abs(netBalance).toFixed(2)}
        </Text>
        <Text className="text-textSecondary mt-2 mb-4">
          {netBalance === 0 ? 'You are all settled up!' : netBalance > 0 ? 'You are owed money.' : 'You owe money.'}
        </Text>

        <TouchableOpacity
          className="bg-green-500 py-3 px-6 rounded-xl items-center"
          onPress={() => router.push('/settle-up')}
        >
          <Text className="text-white font-bold text-lg">Settle Up</Text>
        </TouchableOpacity>
      </Animated.View>

      {error && (
        <View className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <Text className="text-red-400 text-sm text-center">{error}</Text>
        </View>
      )}

      <ScrollView className="mt-8 flex-1" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="items-center mt-10">
            <ActivityIndicator color="#FF4B4B" size="large" />
            <Text className="text-textSecondary mt-3">Loading balances…</Text>
          </View>
        ) : (
          <>
            {myCredits.length > 0 && (
              <View className="mb-6">
                <Text className="text-white font-bold text-lg mb-3">You are owed</Text>
                {myCredits.map((c, i) => (
                  <View key={i} className="flex-row justify-between items-center bg-surface p-4 rounded-xl border border-accent mb-2">
                    <Text className="text-white font-medium">From {resolveName(c.debtor)}</Text>
                    <Text className="text-primary font-bold">+${c.amount.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            {myDebts.length > 0 && (
              <View className="mb-6">
                <Text className="text-white font-bold text-lg mb-3">You owe</Text>
                {myDebts.map((d, i) => (
                  <View key={i} className="flex-row justify-between items-center bg-surface p-4 rounded-xl border border-accent mb-2">
                    <Text className="text-white font-medium">To {resolveName(d.creditor)}</Text>
                    <Text className="text-red-500 font-bold">-${d.amount.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            {myCredits.length === 0 && myDebts.length === 0 && (
              <View className="items-center opacity-50 mt-10">
                <Text className="text-textSecondary mb-2">No active balances</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-primary w-16 h-16 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push('/add-expense')}
      >
        <Text className="text-white text-3xl font-light leading-none mb-1">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
