import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A24',
          borderTopColor: '#262636',
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarActiveTintColor: '#FF4B4B',
        tabBarInactiveTintColor: '#A0A0AB',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
