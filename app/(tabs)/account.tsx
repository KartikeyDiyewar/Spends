import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Account() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.user_metadata?.full_name) {
        setFullName(session.user.user_metadata.full_name);
      }
    });
  }, []);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/');
    }
  }

  async function handleUpdateProfile() {
    if (!session) {
      Alert.alert('Simulated', 'Profile updated locally (Bypass mode)!');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Also update public.profiles if necessary via API or relying on the database trigger (if we create an update trigger, but currently only insert trigger exists. We would need an update RPC, but updating auth.user_metadata is a good start)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', session.user.id);
        
      Alert.alert('Success', 'Profile updated successfully!');
    }
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <View className="flex-row justify-between items-center mt-4 mb-8">
        <Text className="text-white text-3xl font-bold">Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-surface rounded-full items-center justify-center border-2 border-primary mb-4">
            <Ionicons name="person" size={48} color="#FF4B4B" />
          </View>
          <Text className="text-white text-xl font-bold">{fullName || 'Spends User'}</Text>
          <Text className="text-textSecondary mt-1">{session?.user?.email || 'Bypass Mode'}</Text>
        </View>

        {/* Profile Settings */}
        <View className="bg-surface p-6 rounded-2xl border border-accent mb-6">
          <Text className="text-white font-bold text-lg mb-4">Profile Settings</Text>
          
          <Text className="text-textSecondary mb-2 font-medium">Full Name</Text>
          <TextInput
            className="bg-background text-white p-4 rounded-xl border border-accent focus:border-primary mb-6"
            placeholder="Your Name"
            placeholderTextColor="#666"
            value={fullName}
            onChangeText={setFullName}
          />

          <TouchableOpacity 
            className="w-full bg-primary rounded-xl py-4 items-center"
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            <Text className="text-white font-bold text-lg">{loading ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View className="bg-surface p-6 rounded-2xl border border-accent mb-6">
          <Text className="text-white font-bold text-lg mb-4">Preferences</Text>
          
          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-accent/50">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={24} color="#A0A0AB" />
              <Text className="text-white font-medium ml-3">Push Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A0A0AB" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
              <Ionicons name="moon-outline" size={24} color="#A0A0AB" />
              <Text className="text-white font-medium ml-3">Dark Mode</Text>
            </View>
            <Text className="text-primary font-medium">On</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <TouchableOpacity 
          className="w-full bg-red-500/10 rounded-xl py-4 items-center border border-red-500/20 mb-8"
          onPress={handleSignOut}
        >
          <Text className="text-red-500 font-bold text-lg">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
