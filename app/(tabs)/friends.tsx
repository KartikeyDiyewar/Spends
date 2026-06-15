import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getFriends, getGroups, searchProfilesByEmail, sendFriendRequest,
  getPendingRequests, acceptFriendRequest, createGroup,
} from '../../lib/api';
import type { Profile, Group } from '../../types/database';
import FriendPicker from '../../components/FriendPicker';

export default function Friends() {
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
  const [addFriendVisible, setAddFriendVisible] = useState(false);
  const [addGroupVisible, setAddGroupVisible] = useState(false);
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);

  const [friendEmail, setFriendEmail] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Profile[]>([]);

  const [friends, setFriends] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Array<{ requester: Profile; user_id_1: string; user_id_2: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s);
    if (!s?.user?.id) { setDataLoading(false); return; }

    setDataLoading(true);
    setError(null);
    const [f, g, p] = await Promise.all([
      getFriends(s.user.id),
      getGroups(s.user.id),
      getPendingRequests(s.user.id),
    ]);
    setFriends(f);
    setGroups(g);
    setPendingRequests(p);
    setDataLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleAddFriend = async () => {
    if (!session?.user) return;
    if (!friendEmail.trim()) return;

    setLoading(true);
    setError(null);
    const profile = await searchProfilesByEmail(friendEmail.trim());
    if (!profile) {
      setError('No user found with that email. Make sure they have an account.');
      setLoading(false);
      return;
    }
    if (profile.id === session.user.id) {
      setError("You can't add yourself as a friend.");
      setLoading(false);
      return;
    }

    const { error: reqError } = await sendFriendRequest(session.user.id, profile.id);
    setLoading(false);
    if (reqError) {
      setError(reqError.message ?? 'Failed to send request. They may already be your friend.');
    } else {
      Alert.alert('Request Sent', `Friend request sent to ${profile.full_name ?? profile.email}!`);
      setAddFriendVisible(false);
      setFriendEmail('');
      loadData();
    }
  };

  const handleAccept = async (req: typeof pendingRequests[0]) => {
    const ok = await acceptFriendRequest(req.user_id_1, req.user_id_2);
    if (ok) {
      loadData();
    } else {
      Alert.alert('Error', 'Could not accept request. Try again.');
    }
  };

  const handleCreateGroup = async () => {
    if (!session?.user) return;
    if (!groupName.trim()) return;

    setLoading(true);
    setError(null);
    const memberIds = selectedGroupMembers.map(m => m.id);
    const group = await createGroup(groupName.trim(), session.user.id, memberIds);
    setLoading(false);

    if (!group) {
      setError('Failed to create group.');
    } else {
      setAddGroupVisible(false);
      setGroupName('');
      setSelectedGroupMembers([]);
      loadData();
    }
  };

  const toggleGroupMember = (profile: Profile) => {
    setSelectedGroupMembers(prev =>
      prev.some(m => m.id === profile.id)
        ? prev.filter(m => m.id !== profile.id)
        : [...prev, profile]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <View className="flex-row justify-between items-center mt-4 mb-4">
        <Text className="text-white text-3xl font-bold">Network</Text>
        <TouchableOpacity
          className="bg-primary px-4 py-2 rounded-lg flex-row items-center"
          onPress={() => activeTab === 'friends' ? setAddFriendVisible(true) : setAddGroupVisible(true)}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text className="text-white font-bold ml-1">{activeTab === 'friends' ? 'Add Friend' : 'New Group'}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row bg-surface rounded-xl p-1 mb-4 border border-accent">
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

      {dataLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF4B4B" size="large" />
          <Text className="text-textSecondary mt-3">Loading…</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {activeTab === 'friends' ? (
            <>
              {pendingRequests.length > 0 && (
                <View className="mb-4">
                  <Text className="text-white font-bold text-base mb-2">Pending Requests</Text>
                  {pendingRequests.map(req => (
                    <View key={req.user_id_1} className="flex-row items-center bg-surface p-4 rounded-xl border border-accent mb-2">
                      <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mr-3">
                        <Ionicons name="person" size={20} color="#FF4B4B" />
                      </View>
                      <Text className="text-white font-medium flex-1">
                        {req.requester.full_name ?? req.requester.email ?? req.requester.id}
                      </Text>
                      <TouchableOpacity
                        className="bg-primary px-3 py-1 rounded-lg mr-2"
                        onPress={() => handleAccept(req)}
                      >
                        <Text className="text-white font-bold text-xs">Accept</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {friends.length === 0 ? (
                <View className="flex-1 justify-center items-center opacity-70 mt-16">
                  <Text className="text-6xl mb-4">👥</Text>
                  <Text className="text-textSecondary text-lg font-medium">No friends added yet.</Text>
                  <Text className="text-textSecondary text-sm mt-1">Tap "Add Friend" to get started.</Text>
                </View>
              ) : (
                <>
                  <Text className="text-white font-bold text-base mb-2">Friends ({friends.length})</Text>
                  {friends.map(friend => (
                    <View key={friend.id} className="flex-row items-center bg-surface p-4 rounded-xl border border-accent mb-2">
                      <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mr-3">
                        <Ionicons name="person" size={20} color="#FF4B4B" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-medium">{friend.full_name ?? 'Unknown'}</Text>
                        {friend.email && <Text className="text-textSecondary text-xs mt-0.5">{friend.email}</Text>}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              {groups.length === 0 ? (
                <View className="flex-1 justify-center items-center opacity-70 mt-16">
                  <Text className="text-6xl mb-4">🏠</Text>
                  <Text className="text-textSecondary text-lg font-medium">No groups created yet.</Text>
                  <Text className="text-textSecondary text-sm mt-1">Tap "New Group" to create one.</Text>
                </View>
              ) : (
                <>
                  <Text className="text-white font-bold text-base mb-2">Groups ({groups.length})</Text>
                  {groups.map(group => (
                    <View key={group.id} className="flex-row items-center bg-surface p-4 rounded-xl border border-accent mb-2">
                      <View className="w-10 h-10 bg-accent rounded-full items-center justify-center mr-3">
                        <Ionicons name="people" size={20} color="#A0A0AB" />
                      </View>
                      <Text className="text-white font-medium flex-1">{group.name}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Add Friend Modal */}
      <Modal animationType="slide" transparent visible={addFriendVisible} onRequestClose={() => { setAddFriendVisible(false); setError(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/60">
          <View className="bg-surface rounded-t-3xl p-6 border-t border-accent">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-2xl font-bold">Add New Friend</Text>
              <TouchableOpacity onPress={() => { setAddFriendVisible(false); setError(null); setFriendEmail(''); }}>
                <Ionicons name="close" size={24} color="#A0A0AB" />
              </TouchableOpacity>
            </View>

            {error && (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <Text className="text-red-400 text-sm">{error}</Text>
              </View>
            )}

            <Text className="text-textSecondary mb-2 font-medium">Friend's Email Address</Text>
            <TextInput
              className="bg-background text-white p-4 rounded-xl border border-accent mb-6"
              placeholder="friend@example.com"
              placeholderTextColor="#666"
              value={friendEmail}
              onChangeText={setFriendEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              className={`w-full py-4 items-center rounded-xl ${friendEmail && !loading ? 'bg-primary' : 'bg-primary/40'}`}
              onPress={handleAddFriend}
              disabled={!friendEmail || loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">Send Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Group Modal */}
      <Modal animationType="slide" transparent visible={addGroupVisible} onRequestClose={() => { setAddGroupVisible(false); setError(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/60">
          <View className="bg-surface rounded-t-3xl p-6 border-t border-accent" style={{ maxHeight: '75%' }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-2xl font-bold">Create Group</Text>
              <TouchableOpacity onPress={() => { setAddGroupVisible(false); setError(null); setGroupName(''); setSelectedGroupMembers([]); }}>
                <Ionicons name="close" size={24} color="#A0A0AB" />
              </TouchableOpacity>
            </View>

            {error && (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <Text className="text-red-400 text-sm">{error}</Text>
              </View>
            )}

            <Text className="text-textSecondary mb-2 font-medium">Group Name</Text>
            <TextInput
              className="bg-background text-white p-4 rounded-xl border border-accent mb-4"
              placeholder="e.g. Apartment, Trip to Bali"
              placeholderTextColor="#666"
              value={groupName}
              onChangeText={setGroupName}
            />

            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-textSecondary font-medium">Members</Text>
              <TouchableOpacity onPress={() => setGroupPickerVisible(true)}>
                <Text className="text-primary font-bold text-sm">+ Add Member</Text>
              </TouchableOpacity>
            </View>

            {selectedGroupMembers.length > 0 && (
              <ScrollView className="max-h-32 mb-4">
                {selectedGroupMembers.map(m => (
                  <View key={m.id} className="flex-row items-center bg-background rounded-xl p-3 border border-accent mb-1">
                    <Ionicons name="person" size={16} color="#FF4B4B" />
                    <Text className="text-white ml-2 flex-1">{m.full_name ?? m.email}</Text>
                    <TouchableOpacity onPress={() => toggleGroupMember(m)}>
                      <Ionicons name="close-circle" size={18} color="#A0A0AB" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              className={`w-full py-4 items-center rounded-xl mt-2 ${groupName && !loading ? 'bg-primary' : 'bg-primary/40'}`}
              onPress={handleCreateGroup}
              disabled={!groupName || loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {session?.user?.id && (
        <FriendPicker
          visible={groupPickerVisible}
          userId={session.user.id}
          onClose={() => setGroupPickerVisible(false)}
          onSelectFriend={toggleGroupMember}
          title="Add Member"
        />
      )}
    </SafeAreaView>
  );
}
