import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function SettleUpModal() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSettle = () => {
    setLoading(true);
    setTimeout(() => {
      Alert.alert('Success', 'You successfully settled up!');
      setLoading(false);
      router.back();
    }, 1000);
  };

  return (
    <View className="flex-1 bg-background p-6">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-textSecondary text-lg">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Settle Up</Text>
        <TouchableOpacity onPress={handleSettle} disabled={loading}>
          <Text className={`font-bold text-lg ${loading ? 'text-textSecondary' : 'text-green-500'}`}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-8 mt-4">
          <Text className="text-textSecondary mb-2">You are paying:</Text>
          <TouchableOpacity className="bg-surface px-6 py-3 rounded-full border border-accent">
            <Text className="text-white font-medium">Select Friend</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-surface rounded-2xl p-6 border border-accent space-y-6">
          <View>
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
        </View>

        <TouchableOpacity 
          className="w-full bg-green-500 rounded-xl py-4 items-center mt-10"
          onPress={handleSettle}
          disabled={loading || !amount}
        >
          <Text className="text-white text-lg font-bold">Record Payment</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
