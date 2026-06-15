import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { getActivityForUser } from '../../lib/api';
import { useFocusEffect, useRouter } from 'expo-router';

export default function Activity() {
  const router = useRouter();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) { setLoading(false); return; }

    const items = await getActivityForUser(session.user.id);
    if (!items) {
      setError('Failed to load activity.');
    } else {
      setActivities(items);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchActivities(); }, [fetchActivities]));

  const handleRowPress = (activity: any) => {
    if (activity.type === 'expense' && activity.expenseId) {
      router.push(`/expense/${activity.expenseId}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <Text className="text-white text-3xl font-bold mt-4 mb-6">Activity</Text>

      {error && (
        <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
          <Text className="text-red-400 text-sm text-center">{error}</Text>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF4B4B" size="large" />
          <Text className="text-textSecondary mt-3">Loading activity…</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {activities.length === 0 ? (
            <View className="items-center opacity-50 mt-10">
              <Text className="text-4xl mb-3">📋</Text>
              <Text className="text-textSecondary text-lg mb-1">No recent activity.</Text>
              <Text className="text-textSecondary text-sm">Add an expense to get started.</Text>
            </View>
          ) : (
            activities.map((activity, index) => (
              <TouchableOpacity
                key={index}
                className="flex-row items-center bg-surface p-4 rounded-xl border border-accent mb-3"
                onPress={() => handleRowPress(activity)}
                activeOpacity={activity.type === 'expense' ? 0.7 : 1}
              >
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${activity.type === 'expense' ? 'bg-primary/20' : 'bg-green-500/20'}`}>
                  <Text className="text-2xl">{activity.type === 'expense' ? '🍽️' : '💸'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">{activity.text}</Text>
                  <Text className="text-textSecondary text-xs mt-1">{activity.date}</Text>
                </View>
                <View className="items-end">
                  <Text className={`font-bold ${activity.type === 'expense' ? 'text-white' : 'text-green-500'}`}>
                    {activity.amount}
                  </Text>
                  {activity.type === 'expense' && (
                    <Text className="text-textSecondary text-xs mt-1">tap for details</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
