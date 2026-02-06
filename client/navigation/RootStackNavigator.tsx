import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import LoginScreen from "@/screens/LoginScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import ChatScreen from "@/screens/ChatScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import EditGamesScreen from "@/screens/EditGamesScreen";
import FiltersScreen from "@/screens/FiltersScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth, AuthProvider } from "@/lib/auth-context";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Main: undefined;
  Chat: {
    matchId: string;
    nickname: string;
    avatarUrl: string | null;
    otherUserId: string;
  };
  EditProfile: undefined;
  EditGames: undefined;
  Filters: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, hasProfile, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.backgroundRoot,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : !hasProfile ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({
              headerTitle: route.params.nickname,
              presentation: "card",
            })}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              headerTitle: "Edit Profile",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="EditGames"
            component={EditGamesScreen}
            options={{
              headerTitle: "Edit Games",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="Filters"
            component={FiltersScreen}
            options={{
              headerTitle: "Filters",
              presentation: "modal",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function RootStackNavigator() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
