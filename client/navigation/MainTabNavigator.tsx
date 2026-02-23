import React, { useCallback } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import MatchesStackNavigator from "@/navigation/MatchesStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useUnreadCount } from "@/lib/use-unread-count";
import { useWebSocketMessages } from "@/lib/websocket";
import { useToast } from "@/lib/toast-context";
import { useAuth } from "@/lib/auth-context";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export type MainTabParamList = {
  DiscoverTab: undefined;
  MatchesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Returns the name of the currently active leaf route. */
function useActiveRouteName(): string {
  return useNavigationState((state) => {
    if (!state) return "";
    let route = state.routes[state.index];
    while (route.state) {
      const nested = route.state;
      route = nested.routes[nested.index ?? 0];
    }
    return route.name;
  }) ?? "";
}

function GlobalWsListener() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const activeRoute = useActiveRouteName();

  const handleMessage = useCallback(
    (msg: any) => {
      if (msg.type === "new_message") {
        // Skip if already viewing that chat
        if (activeRoute === "Chat") return;

        // Find match/sender info in cache
        const matches: any[] = queryClient.getQueryData(["/api/matches", user?.id]) ?? [];
        const match = matches.find((m: any) => m.id === msg.matchId);
        if (!match) return;

        // Don't notify for own messages
        if (msg.message?.senderId === user?.id) return;

        const nickname = match.otherUser?.profile?.nickname ?? "Unknown";
        const avatarUrl = match.otherUser?.profile?.avatarUrl ?? null;
        const content = msg.message?.content ?? "New message";

        showToast({
          type: "message",
          title: nickname,
          body: content,
          avatarUrl,
          onPress: () =>
            navigation.navigate("Chat", {
              matchId: msg.matchId,
              nickname,
              avatarUrl,
              otherUserId:
                match.user1Id === user?.id ? match.user2Id : match.user1Id,
            }),
        });
      }

      if (msg.type === "new_match") {
        // Invalidate matches cache first, then show toast
        queryClient.invalidateQueries({ queryKey: ["/api/matches", user?.id] });

        // Small delay so cache has time to populate
        setTimeout(() => {
          const matches: any[] =
            queryClient.getQueryData(["/api/matches", user?.id]) ?? [];
          const match = matches.find((m: any) => m.id === msg.matchId);
          const otherUserId =
            msg.user1Id === user?.id ? msg.user2Id : msg.user1Id;
          const nickname =
            match?.otherUser?.profile?.nickname ?? "Someone";
          const avatarUrl = match?.otherUser?.profile?.avatarUrl ?? null;

          showToast({
            type: "match",
            title: "New Match! 🎉",
            body: `You matched with ${nickname}`,
            avatarUrl,
            onPress: () =>
              navigation.navigate("Chat", {
                matchId: msg.matchId,
                nickname,
                avatarUrl,
                otherUserId,
              }),
          });
        }, 800);
      }
    },
    [activeRoute, user?.id, queryClient, navigation, showToast],
  );

  useWebSocketMessages(handleMessage);
  return null;
}

export default function MainTabNavigator() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const unreadCount = useUnreadCount();

  return (
    <View style={{ flex: 1 }}>
      <GlobalWsListener />
      <Tab.Navigator
        initialRouteName="DiscoverTab"
        screenOptions={{
          tabBarActiveTintColor: theme.tabIconSelected,
          tabBarInactiveTintColor: theme.tabIconDefault,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: Platform.select({
              ios: "transparent",
              android: theme.backgroundRoot,
            }),
            borderTopWidth: 0,
            elevation: 0,
            height: 85,
            paddingBottom: 30,
          },
          tabBarBackground: () =>
            Platform.OS === "ios" ? (
              <BlurView
                intensity={100}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            ) : null,
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="DiscoverTab"
          component={HomeStackNavigator}
          options={{
            title: t("navigation.discover"),
            tabBarIcon: ({ color, size }) => (
              <Feather name="compass" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="MatchesTab"
          component={MatchesStackNavigator}
          options={{
            title: t("navigation.matches"),
            tabBarIcon: ({ color, size }) => (
              <Feather name="users" size={size} color={color} />
            ),
            tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
            tabBarBadgeStyle: { backgroundColor: theme.danger, fontSize: 10, minWidth: 18, height: 18, lineHeight: 18 },
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStackNavigator}
          options={{
            title: t("navigation.profile"),
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({});
