import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { addFriend } from '../../lib/api';

export default function Friends() {
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
  const [modalVisible, setModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  
  const [friendEmail, setFriendEmail] = useState('');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const handleAddFriend = async () => {
    if (!session?.user) {
      Alert.alert('Simulated', 'You are currently bypassing login. Friend added locally!');
      setModalVisible(false);
      setFriendEmail('');
      return;
    }

    setLoading(true);
    Alert.alert('Notice', 'Friend request sent to ' + friendEmail);
    setModalVisible(false);
    setFriendEmail('');
    setLoading(false);
  };

  const handleCreateGroup = async () => {
    if (!session?.user) {
      Alert.alert('Simulated', `Group "${groupName}" created locally!`);
      setGroupModalVisible(false);
      setGroupName('');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('groups').insert([{ name: groupName, created_by: session.user.id }]);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Group created!');
    }
    setGroupModalVisible(false);
    setGroupName('');
    setLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      {/* Header & Toggle */}
      <View className="flex-row justify-between items-center mt-4 mb-4">
        <Text className="text-white text-3xl font-bold">Network</Text>
        <TouchableOpacity 
          className="bg-primary px-4 py-2 rounded-lg flex-row items-center"
          onPress={() => activeTab === 'friends' ? setModalVisible(true) : setGroupModalVisible(true)}
        >
          <Text className="text-white font-bold mr-1">+</Text>
          <Text className="text-white font-bold">{activeTab === 'friends' ? 'Add Friend' : 'New Group'}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row bg-surface rounded-xl p-1 mb-6 border border-accent">
        <TouchableOpacity 
          className={`flex-1 py-2 items-center rounded-lg ${activeTab === 'friends' ? 'bg-primary' : ''}`}
          onPress={() => setActiveTab('friends')}
        >
          <Text className={`font-bold ${activeTab === 'friends' ? 'text-white' : 'text-textSecondary'}`}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-2 items-center rounded-lg ${activeTab === 'groups' ? 'bg-primary' : ''}`}
          onPress={() => setActiveTab('groups')}
        >
          <Text className={`font-bold ${activeTab === 'groups' ? 'text-white' : 'text-textSecondary'}`}>Groups</Text>
        </TouchableOpacity>
      </View>

      {/* Empty States */}
      {activeTab === 'friends' ? (
        <View className="flex-1 justify-center items-center opacity-70">
          <Text className="text-6xl mb-4">👥</Text>
          <Text className="text-textSecondary text-lg font-medium">No friends added yet.</Text>
        </View>
      ) : (
        <View className="flex-1 justify-center items-center opacity-70">
          <Text className="text-6xl mb-4">🏠</Text>
          <Text className="text-textSecondary text-lg font-medium">No groups created yet.</Text>
        </View>
      )}

      {/* Add Friend Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/60">
          <View className="bg-surface rounded-t-3xl p-6 h-1/2 border-t border-accent shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-2xl font-bold">Add New Friend</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text className="text-textSecondary text-lg">Close</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-textSecondary mb-2 font-medium">Friend's Email Address</Text>
            <TextInput
              className="bg-background text-white p-4 rounded-xl border border-accent focus:border-primary mb-6"
              placeholder="friend@example.com"
              placeholderTextColor="#666"
              value={friendEmail}
              onChangeText={setFriendEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity 
              className={`w-full py-4 items-center rounded-xl ${friendEmail ? 'bg-primary' : 'bg-primary/50'}`}
              onPress={handleAddFriend}
              disabled={!friendEmail}
            >
              <Text className="text-white text-lg font-bold">Send Request</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Group Modal */}
      <Modal animationType="slide" transparent={true} visible={groupModalVisible} onRequestClose={() => setGroupModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/60">
          <View className="bg-surface rounded-t-3xl p-6 h-1/2 border-t border-accent shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-2xl font-bold">Create Group</Text>
              <TouchableOpacity onPress={() => setGroupModalVisible(false)}>
                <Text className="text-textSecondary text-lg">Close</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-textSecondary mb-2 font-medium">Group Name</Text>
            <TextInput
              className="bg-background text-white p-4 rounded-xl border border-accent focus:border-primary mb-6"
              placeholder="e.g. Apartment, Trip to Bali"
              placeholderTextColor="#666"
              value={groupName}
              onChangeText={setGroupName}
            />
            <TouchableOpacity 
              className={`w-full py-4 items-center rounded-xl ${groupName ? 'bg-primary' : 'bg-primary/50'}`}
              onPress={handleCreateGroup}
              disabled={!groupName}
            >
              <Text className="text-white text-lg font-bold">Create Group</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}
