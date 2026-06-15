import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFriends, getGroups } from '../lib/api';
import type { Profile, Group } from '../types/database';

type PickerMode = 'friends' | 'groups' | 'both';

type FriendPickerProps = {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSelectFriend: (profile: Profile) => void;
  onSelectGroup?: (group: Group) => void;
  mode?: PickerMode;
  title?: string;
};

export default function FriendPicker({
  visible,
  userId,
  onClose,
  onSelectFriend,
  onSelectGroup,
  mode = 'friends',
  title = 'Select Friend',
}: FriendPickerProps) {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tab, setTab] = useState<'friends' | 'groups'>('friends');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    const loadData = async () => {
      const [f, g] = await Promise.all([
        getFriends(userId),
        mode === 'both' || mode === 'groups' ? getGroups(userId) : Promise.resolve([]),
      ]);
      setFriends(f);
      setGroups(g);
      setLoading(false);
    };
    loadData();
  }, [visible, userId]);

  const showTabs = mode === 'both';

  const renderFriend = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      className="flex-row items-center bg-background p-4 rounded-xl border border-accent mb-2"
      onPress={() => {
        onSelectFriend(item);
        onClose();
      }}
    >
      <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mr-3">
        <Ionicons name="person" size={20} color="#FF4B4B" />
      </View>
      <Text className="text-white font-medium flex-1">{item.full_name ?? item.email ?? item.id}</Text>
      <Ionicons name="chevron-forward" size={18} color="#A0A0AB" />
    </TouchableOpacity>
  );

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity
      className="flex-row items-center bg-background p-4 rounded-xl border border-accent mb-2"
      onPress={() => {
        onSelectGroup?.(item);
        onClose();
      }}
    >
      <View className="w-10 h-10 bg-accent rounded-full items-center justify-center mr-3">
        <Ionicons name="people" size={20} color="#A0A0AB" />
      </View>
      <Text className="text-white font-medium flex-1">{item.name}</Text>
      <Ionicons name="chevron-forward" size={18} color="#A0A0AB" />
    </TouchableOpacity>
  );

  const currentList = showTabs ? (tab === 'friends' ? friends : groups) : (mode === 'groups' ? groups : friends);
  const isEmpty = currentList.length === 0;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/60">
        <View className="bg-surface rounded-t-3xl p-6 border-t border-accent" style={{ maxHeight: '70%' }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-xl font-bold">{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#A0A0AB" />
            </TouchableOpacity>
          </View>

          {showTabs && (
            <View className="flex-row bg-background rounded-xl p-1 mb-4 border border-accent">
              <TouchableOpacity
                className={`flex-1 py-2 items-center rounded-lg ${tab === 'friends' ? 'bg-primary' : ''}`}
                onPress={() => setTab('friends')}
              >
                <Text className={`font-bold ${tab === 'friends' ? 'text-white' : 'text-textSecondary'}`}>Friends</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-2 items-center rounded-lg ${tab === 'groups' ? 'bg-primary' : ''}`}
                onPress={() => setTab('groups')}
              >
                <Text className={`font-bold ${tab === 'groups' ? 'text-white' : 'text-textSecondary'}`}>Groups</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#FF4B4B" />
              <Text className="text-textSecondary mt-2">Loading...</Text>
            </View>
          ) : isEmpty ? (
            <View className="items-center py-8 opacity-60">
              <Text className="text-6xl mb-3">{mode === 'groups' ? '🏠' : '👥'}</Text>
              <Text className="text-textSecondary">
                {tab === 'groups' ? 'No groups yet.' : 'No friends yet. Add one in Network!'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={currentList as any[]}
              keyExtractor={item => item.id}
              renderItem={showTabs && tab === 'groups' ? renderGroup as any : renderFriend as any}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
