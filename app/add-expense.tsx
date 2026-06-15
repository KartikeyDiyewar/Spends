import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { addExpense, getGroupMembers } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';
import FriendPicker from '../components/FriendPicker';
import type { Profile, Group } from '../types/database';

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENT';

export default function AddExpenseModal() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Selected participant(s)
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<Profile[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Per-participant exact/percent inputs (keyed by user_id)
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentAmounts, setPercentAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  // When a group is selected, load its members
  useEffect(() => {
    if (!selectedGroup) { setGroupMembers([]); return; }
    getGroupMembers(selectedGroup.id).then(setGroupMembers);
  }, [selectedGroup]);

  const participants: Profile[] = selectedGroup
    ? groupMembers.filter(m => m.id !== session?.user?.id)
    : selectedFriend
      ? [selectedFriend]
      : [];

  const participantCount = participants.length + 1; // +1 for the payer

  const handleSelectFriend = (profile: Profile) => {
    setSelectedFriend(profile);
    setSelectedGroup(null);
    setGroupMembers([]);
    setExactAmounts({});
    setPercentAmounts({});
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setSelectedFriend(null);
    setExactAmounts({});
    setPercentAmounts({});
  };

  const buildSplits = (numericAmount: number): Array<{ user_id: string; amount_owed: number }> | null => {
    const payer = session.user.id;

    if (participants.length === 0) {
      // If no participant selected, entire amount is on the payer
      return [{ user_id: payer, amount_owed: numericAmount }];
    }

    if (splitType === 'EQUAL') {
      const perPerson = numericAmount / participantCount;
      // Distribute rounding remainder to payer
      const othersTotal = parseFloat((perPerson * participants.length).toFixed(2));
      const payerShare = parseFloat((numericAmount - othersTotal).toFixed(2));

      const splits = [
        { user_id: payer, amount_owed: payerShare },
        ...participants.map(p => ({ user_id: p.id, amount_owed: parseFloat(perPerson.toFixed(2)) })),
      ];
      return splits;
    }

    if (splitType === 'EXACT') {
      const othersTotal = participants.reduce((sum, p) => {
        const val = parseFloat(exactAmounts[p.id] ?? '0');
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
      const payerShare = parseFloat((numericAmount - othersTotal).toFixed(2));
      if (payerShare < 0 || Math.abs(othersTotal - numericAmount) > 0.01 && payerShare <= 0) {
        setError("Exact amounts don't add up to the total. Adjust the values.");
        return null;
      }
      return [
        { user_id: payer, amount_owed: payerShare },
        ...participants.map(p => ({ user_id: p.id, amount_owed: parseFloat(parseFloat(exactAmounts[p.id] ?? '0').toFixed(2)) })),
      ];
    }

    if (splitType === 'PERCENT') {
      const othersPercent = participants.reduce((sum, p) => {
        const val = parseFloat(percentAmounts[p.id] ?? '0');
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
      const payerPercent = 100 - othersPercent;
      if (payerPercent < 0 || Math.abs(othersPercent + payerPercent - 100) > 0.01) {
        setError("Percentages must add up to 100%.");
        return null;
      }
      return [
        { user_id: payer, amount_owed: parseFloat((numericAmount * payerPercent / 100).toFixed(2)) },
        ...participants.map(p => ({
          user_id: p.id,
          amount_owed: parseFloat((numericAmount * (parseFloat(percentAmounts[p.id] ?? '0') / 100)).toFixed(2)),
        })),
      ];
    }

    return null;
  };

  const handleSave = async () => {
    setError(null);
    if (!description.trim()) { setError('Please enter a description.'); return; }
    if (!amount) { setError('Please enter an amount.'); return; }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) { setError('Please enter a valid amount greater than 0.'); return; }

    if (!session?.user) { Alert.alert('Not signed in', 'Please sign in first.'); return; }

    const splits = buildSplits(numericAmount);
    if (!splits) return; // error already set

    setLoading(true);
    const { error: saveError } = await addExpense(
      session.user.id,
      numericAmount,
      description.trim(),
      splits,
      selectedGroup?.id ?? null
    );
    setLoading(false);

    if (saveError) {
      setError(saveError.message ?? 'Failed to save expense.');
    } else {
      router.back();
    }
  };

  const selectionLabel = selectedGroup
    ? selectedGroup.name
    : selectedFriend
      ? (selectedFriend.full_name ?? selectedFriend.email ?? 'Selected Friend')
      : null;

  const numericAmount = parseFloat(amount) || 0;

  return (
    <View className="flex-1 bg-background p-6">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-textSecondary text-lg">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Add Expense</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FF4B4B" />
          ) : (
            <Text className="font-bold text-lg text-primary">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Friend / Group selector */}
        <View className="items-center mb-8 mt-4">
          <Text className="text-textSecondary mb-2">With you and:</Text>
          <TouchableOpacity
            className="bg-surface px-6 py-3 rounded-full border border-accent flex-row items-center"
            onPress={() => setPickerVisible(true)}
          >
            {selectionLabel ? (
              <>
                <Ionicons name={selectedGroup ? 'people' : 'person'} size={16} color="#FF4B4B" />
                <Text className="text-white font-medium ml-2">{selectionLabel}</Text>
                <TouchableOpacity
                  className="ml-3"
                  onPress={() => { setSelectedFriend(null); setSelectedGroup(null); }}
                >
                  <Ionicons name="close-circle" size={18} color="#A0A0AB" />
                </TouchableOpacity>
              </>
            ) : (
              <Text className="text-textSecondary font-medium">Select Friend or Group</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Description & Amount */}
        <View className="bg-surface rounded-2xl p-6 border border-accent">
          <View className="mb-6">
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

        {/* Split type */}
        <View className="mt-8">
          <Text className="text-white font-bold text-lg mb-4">How to split?</Text>
          <View className="flex-row justify-between">
            {(['EQUAL', 'EXACT', 'PERCENT'] as SplitType[]).map(type => (
              <TouchableOpacity
                key={type}
                className={`flex-1 py-3 items-center rounded-xl mx-1 border ${splitType === type ? 'bg-primary border-primary' : 'bg-surface border-accent'}`}
                onPress={() => { setSplitType(type); setError(null); }}
              >
                <Text className={`font-bold text-xs ${splitType === type ? 'text-white' : 'text-textSecondary'}`}>
                  {type === 'EQUAL' ? 'Equally (=)' : type === 'EXACT' ? 'Exact ($)' : 'Percent (%)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Per-participant inputs for EXACT and PERCENT */}
          {participants.length > 0 && (splitType === 'EXACT' || splitType === 'PERCENT') && (
            <View className="mt-4 bg-surface rounded-xl border border-accent p-4">
              <Text className="text-textSecondary text-sm mb-3 font-medium">
                {splitType === 'EXACT' ? 'Enter amount for each person (rest goes to you)' : 'Enter % for each person (rest goes to you)'}
              </Text>

              {participants.map(p => {
                const name = p.full_name ?? p.email ?? p.id.slice(0, 8);
                const val = splitType === 'EXACT' ? (exactAmounts[p.id] ?? '') : (percentAmounts[p.id] ?? '');
                const setter = splitType === 'EXACT'
                  ? (v: string) => setExactAmounts(prev => ({ ...prev, [p.id]: v }))
                  : (v: string) => setPercentAmounts(prev => ({ ...prev, [p.id]: v }));

                return (
                  <View key={p.id} className="flex-row items-center mb-2">
                    <Ionicons name="person" size={16} color="#A0A0AB" />
                    <Text className="text-white ml-2 flex-1">{name}</Text>
                    <View className="flex-row items-center bg-background rounded-lg border border-accent px-3 py-2">
                      <Text className="text-textSecondary mr-1">{splitType === 'EXACT' ? '$' : ''}</Text>
                      <TextInput
                        className="text-white w-16 text-right"
                        placeholder="0"
                        placeholderTextColor="#666"
                        value={val}
                        onChangeText={setter}
                        keyboardType="numeric"
                      />
                      {splitType === 'PERCENT' && <Text className="text-textSecondary ml-1">%</Text>}
                    </View>
                  </View>
                );
              })}

              {/* Show payer remainder */}
              {numericAmount > 0 && (
                <View className="mt-2 pt-2 border-t border-accent/50">
                  <View className="flex-row items-center">
                    <Ionicons name="person-circle" size={16} color="#FF4B4B" />
                    <Text className="text-white ml-2 flex-1">You</Text>
                    <Text className="text-primary font-bold">
                      {splitType === 'EXACT'
                        ? `$${Math.max(0, numericAmount - participants.reduce((s, p) => s + (parseFloat(exactAmounts[p.id] ?? '0') || 0), 0)).toFixed(2)}`
                        : `${Math.max(0, 100 - participants.reduce((s, p) => s + (parseFloat(percentAmounts[p.id] ?? '0') || 0), 0)).toFixed(1)}%`
                      }
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {splitType === 'EQUAL' && participants.length > 0 && numericAmount > 0 && (
            <View className="bg-surface/50 p-4 rounded-xl mt-4 border border-accent/50">
              <Text className="text-textSecondary text-center text-sm">
                Each person pays ${(numericAmount / participantCount).toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {session?.user?.id && (
        <FriendPicker
          visible={pickerVisible}
          userId={session.user.id}
          onClose={() => setPickerVisible(false)}
          onSelectFriend={handleSelectFriend}
          onSelectGroup={handleSelectGroup}
          mode="both"
          title="Select Friend or Group"
        />
      )}
    </View>
  );
}
