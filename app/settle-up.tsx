import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { createSettlement } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';
import FriendPicker from '../components/FriendPicker';
import type { Profile } from '../types/database';

export default function SettleUpModal() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [selectedPayee, setSelectedPayee] = useState<Profile | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  const handleSettle = async () => {
    setError(null);
    if (!session?.user) { Alert.alert('Not signed in', 'Please sign in first.'); return; }
    if (!selectedPayee) { setError('Please select who you are paying.'); return; }
    if (!amount) { setError('Please enter an amount.'); return; }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) { setError('Please enter a valid amount greater than 0.'); return; }

    setLoading(true);
    const { error: settleError } = await createSettlement(session.user.id, selectedPayee.id, numericAmount);
    setLoading(false);

    if (settleError) {
      setError(settleError.message ?? 'Failed to record payment.');
    } else {
      router.back();
    }
  };

  const payeeName = selectedPayee?.full_name ?? selectedPayee?.email ?? 'Friend';

  return (
    <View className="flex-1 bg-background p-6">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-textSecondary text-lg">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Settle Up</Text>
        <TouchableOpacity onPress={handleSettle} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#22c55e" />
          ) : (
            <Text className="font-bold text-lg text-green-500">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Payee selector */}
        <View className="items-center mb-8 mt-4">
          <Text className="text-textSecondary mb-2">You are paying:</Text>
          <TouchableOpacity
            className="bg-surface px-6 py-3 rounded-full border border-accent flex-row items-center"
            onPress={() => setPickerVisible(true)}
          >
            {selectedPayee ? (
              <>
                <Ionicons name="person" size={16} color="#22c55e" />
                <Text className="text-white font-medium ml-2">{payeeName}</Text>
                <TouchableOpacity className="ml-3" onPress={() => setSelectedPayee(null)}>
                  <Ionicons name="close-circle" size={18} color="#A0A0AB" />
                </TouchableOpacity>
              </>
            ) : (
              <Text className="text-textSecondary font-medium">Select Friend</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View className="bg-surface rounded-2xl p-6 border border-accent">
          <Text className="text-textSecondary text-sm mb-2 uppercase tracking-wider font-bold">Amount</Text>
          <View className="flex-row items-center border-b border-accent pb-2">
            <Text className="text-green-500 text-4xl font-black mr-2">$</Text>
            <TextInput
              className="text-white text-4xl font-black flex-1"
              placeholder="0.00"
              placeholderTextColor="#333"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity
          className={`w-full rounded-xl py-4 items-center mt-10 ${amount && selectedPayee && !loading ? 'bg-green-500' : 'bg-green-500/40'}`}
          onPress={handleSettle}
          disabled={loading || !amount || !selectedPayee}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-lg font-bold">
              {selectedPayee ? `Pay ${payeeName}` : 'Record Payment'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {session?.user?.id && (
        <FriendPicker
          visible={pickerVisible}
          userId={session.user.id}
          onClose={() => setPickerVisible(false)}
          onSelectFriend={p => { setSelectedPayee(p); setError(null); }}
          title="Select Who You're Paying"
        />
      )}
    </View>
  );
}
