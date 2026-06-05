import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { addExpense } from '../lib/api';

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENT';

export default function AddExpenseModal() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const handleSave = async () => {
    if (!description || !amount) {
      Alert.alert('Missing Info', 'Please enter a description and amount.');
      return;
    }
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    if (!session?.user) {
      Alert.alert('Simulated', `Saved expense for $${amount} locally (bypassed login)! Split: ${splitType}`);
      router.back();
      return;
    }

    setLoading(true);
    const numericAmount = parseFloat(amount);
    const mockFriendId = '00000000-0000-0000-0000-000000000000'; // Replace in real flow

    // Advanced splitting logic simulation based on type
    let splits = [];
    if (splitType === 'EQUAL') {
      splits = [
        { user_id: session.user.id, amount_owed: numericAmount / 2 },
        { user_id: mockFriendId, amount_owed: numericAmount / 2 }
      ];
    } else if (splitType === 'EXACT') {
      // Hardcode for now, assume friend owes $10 exactly
      splits = [
        { user_id: session.user.id, amount_owed: numericAmount - 10 },
        { user_id: mockFriendId, amount_owed: 10 }
      ];
    } else if (splitType === 'PERCENT') {
      // 60/40 split
      splits = [
        { user_id: session.user.id, amount_owed: numericAmount * 0.6 },
        { user_id: mockFriendId, amount_owed: numericAmount * 0.4 }
      ];
    }

    const { error } = await addExpense(session.user.id, numericAmount, description, splits);

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.back();
    }
  };

  return (
    <View className="flex-1 bg-background p-6">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-textSecondary text-lg">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Add Expense</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text className={`font-bold text-lg ${loading ? 'text-textSecondary' : 'text-primary'}`}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-8 mt-4">
          <Text className="text-textSecondary mb-2">With you and:</Text>
          <TouchableOpacity className="bg-surface px-6 py-3 rounded-full border border-accent">
            <Text className="text-white font-medium">Select Friend or Group</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-surface rounded-2xl p-6 border border-accent space-y-6">
          <View>
            <Text className="text-textSecondary text-sm mb-2 uppercase tracking-wider font-bold">Description</Text>
            <TextInput
              className="text-white text-2xl font-bold border-b border-accent pb-2"
              placeholder="Enter a description"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View>
            <Text className="text-textSecondary text-sm mb-2 uppercase tracking-wider font-bold">Amount</Text>
            <View className="flex-row items-center border-b border-accent pb-2">
              <Text className="text-primary text-4xl font-black mr-2">$</Text>
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
        <View className="mt-8">
          <Text className="text-white font-bold text-lg mb-4">How to split?</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity 
              className={`flex-1 py-3 items-center rounded-xl mx-1 border ${splitType === 'EQUAL' ? 'bg-primary border-primary' : 'bg-surface border-accent'}`}
              onPress={() => setSplitType('EQUAL')}
            >
              <Text className={`font-bold ${splitType === 'EQUAL' ? 'text-white' : 'text-textSecondary'}`}>Equally (=)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className={`flex-1 py-3 items-center rounded-xl mx-1 border ${splitType === 'EXACT' ? 'bg-primary border-primary' : 'bg-surface border-accent'}`}
              onPress={() => setSplitType('EXACT')}
            >
              <Text className={`font-bold ${splitType === 'EXACT' ? 'text-white' : 'text-textSecondary'}`}>Exact ($)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className={`flex-1 py-3 items-center rounded-xl mx-1 border ${splitType === 'PERCENT' ? 'bg-primary border-primary' : 'bg-surface border-accent'}`}
              onPress={() => setSplitType('PERCENT')}
            >
              <Text className={`font-bold ${splitType === 'PERCENT' ? 'text-white' : 'text-textSecondary'}`}>Percent (%)</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-surface/50 p-4 rounded-xl mt-4 border border-accent/50">
            <Text className="text-textSecondary text-center">
              {splitType === 'EQUAL' && 'Everyone pays the exact same share.'}
              {splitType === 'EXACT' && 'Enter the exact dollar amount each person owes.'}
              {splitType === 'PERCENT' && 'Enter the percentage each person owes.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
