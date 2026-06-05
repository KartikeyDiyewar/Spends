import { useState, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { getActivityForUser } from '../../lib/api';
import { useFocusEffect } from 'expo-router';

export default function Activity() {
  const [activities, setActivities] = useState<any[]>([]);

  const fetchActivities = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    
    const realActivities = await getActivityForUser(session.user.id);
    setActivities(realActivities);
  };

  useFocusEffect(
    useCallback(() => {
      fetchActivities();
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <Text className="text-white text-3xl font-bold mt-4 mb-6">Activity</Text>
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {activities.length === 0 && (
          <View className="items-center opacity-50 mt-10">
            <Text className="text-textSecondary text-lg mb-2">No recent activity.</Text>
          </View>
        )}
        {activities.map((activity, index) => (
          <View key={index} className="flex-row items-center bg-surface p-4 rounded-xl border border-accent mb-3">
            <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${activity.type === 'expense' ? 'bg-primary/20' : 'bg-green-500/20'}`}>
              <Text className="text-2xl">{activity.type === 'expense' ? '🍽️' : '💸'}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{activity.text}</Text>
              <Text className="text-textSecondary text-xs mt-1">{activity.date}</Text>
            </View>
            <Text className={`font-bold ${activity.type === 'expense' ? 'text-white' : 'text-green-500'}`}>
              {activity.amount}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
