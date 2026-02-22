import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import MatchesStackNavigator from "@/navigation/MatchesStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useUnreadCount } from "@/lib/use-unread-count";

export type MainTabParamList = {
  DiscoverTab: undefined;
  MatchesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const unreadCount = useUnreadCount();

  return (
    <View style={{ flex: 1 }}>
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
