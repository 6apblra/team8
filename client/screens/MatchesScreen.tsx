import React from "react";
import { FlatList, StyleSheet, View, ActivityIndicator } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { MatchCard } from "@/components/MatchCard";
import { Colors, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface MatchData {
  id: string;
  user1Id: string;
  user2Id: string;
  matchedAt: string;
  lastMessageAt: string | null;
  otherUser: {
    profile: {
      nickname: string;
      avatarUrl: string | null;
    };
    userGames: Array<{ gameId: string }>;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
}

export default function MatchesScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const theme = Colors.dark;

  const { data: matches = [], isLoading, refetch } = useQuery<MatchData[]>({
    queryKey: ["/api/matches", user?.id],
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const handleMatchPress = (match: MatchData) => {
    navigation.navigate("Chat", {
      matchId: match.id,
      nickname: match.otherUser.profile.nickname,
      avatarUrl: match.otherUser.profile.avatarUrl,
      otherUserId: match.user1Id === user?.id ? match.user2Id : match.user1Id,
    });
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="message-circle" size={80} color={theme.textSecondary} />
            <ThemedText type="h3" style={styles.emptyTitle}>
              No Matches Yet
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Keep swiping to find your teammates!
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <MatchCard
            nickname={item.otherUser.profile.nickname}
            avatarUrl={item.otherUser.profile.avatarUrl}
            lastMessage={item.lastMessage?.content}
            timestamp={item.lastMessage?.createdAt ? new Date(item.lastMessage.createdAt) : item.matchedAt ? new Date(item.matchedAt) : null}
            unreadCount={item.unreadCount}
            onPress={() => handleMatchPress(item)}
          />
        )}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    gap: Spacing.md,
  },
  emptyTitle: {
    color: "#FFFFFF",
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    color: "#A0A8B8",
    fontSize: 16,
    textAlign: "center",
  },
});
