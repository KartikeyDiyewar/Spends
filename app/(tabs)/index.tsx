import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { simplifyDebts, Debt } from '../../lib/debt-engine';
import { getAllDebtsForUser } from '../../lib/api';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function Dashboard() {
  const router = useRouter();
  const [netBalance, setNetBalance] = useState(0);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const fetchDebts = async () => {
    if (!session?.user?.id) return;
    const currentUserId = session.user.id;
    
    // Fetch REAL data from Supabase
    const rawDebts = await getAllDebtsForUser(currentUserId);
    
    // Simplify debts using the Debt Engine
    const simplified = simplifyDebts(rawDebts);
    setDebts(simplified);

    let balance = 0;
    simplified.forEach(d => {
      if (d.creditor === currentUserId) balance += d.amount;
      if (d.debtor === currentUserId) balance -= d.amount;
    });
    setNetBalance(balance);
  };

  useFocusEffect(
    useCallback(() => {
      fetchDebts();
    }, [session])
  );

  const myDebts = debts.filter(d => d.debtor === (session?.user?.id || 'me'));
  const myCredits = debts.filter(d => d.creditor === (session?.user?.id || 'me'));

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <View className="flex-row justify-between items-center mt-4">
        <Text className="text-white text-3xl font-bold">Dashboard</Text>
        {!session && (
          <TouchableOpacity onPress={() => router.replace('/')} className="bg-surface px-4 py-2 rounded-lg border border-accent">
            <Text className="text-primary font-bold text-xs">Exit Demo</Text>
          </TouchableOpacity>
        )}
      </View>

      <Animated.View 
        entering={FadeInDown.duration(600).springify()}
        className="mt-8 bg-surface p-6 rounded-2xl border border-accent shadow-lg relative"
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

      <ScrollView className="mt-8 flex-1" showsVerticalScrollIndicator={false}>
        {myCredits.length > 0 && (
          <View className="mb-6">
            <Text className="text-white font-bold text-lg mb-3">You are owed</Text>
            {myCredits.map((c, i) => (
              <View key={i} className="flex-row justify-between items-center bg-surface p-4 rounded-xl border border-accent mb-2">
                <Text className="text-white font-medium">From {c.debtor}</Text>
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
                <Text className="text-white font-medium">To {d.creditor}</Text>
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
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 bg-primary w-16 h-16 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push('/add-expense')}
      >
        <Text className="text-white text-3xl font-light leading-none mb-1">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
