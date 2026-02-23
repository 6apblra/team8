import React, { useCallback } from "react";
import {
  SectionList,
  StyleSheet,
  View,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuth } from "@/lib/auth-context";
import { useWebSocketMessages } from "@/lib/websocket";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { MatchCard } from "@/components/MatchCard";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";
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
    userGames: { gameId: string }[];
  };
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
  isOnline?: boolean;
  isAvailableNow?: boolean;
}

const AVATAR_PLACEHOLDERS = [
  "https://api.dicebear.com/7.x/avataaars/png?seed=new1",
  "https://api.dicebear.com/7.x/avataaars/png?seed=new2",
  "https://api.dicebear.com/7.x/avataaars/png?seed=new3",
];

function NewMatchBubble({
  match,
  onPress,
}: {
  match: MatchData;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const avatar =
    match.otherUser.profile.avatarUrl ||
    AVATAR_PLACEHOLDERS[Math.floor(Math.random() * AVATAR_PLACEHOLDERS.length)];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bubbleWrap, { opacity: pressed ? 0.75 : 1 }]}
    >
      {/* Gradient ring */}
      <View style={[styles.bubbleRing, { borderColor: theme.secondary, shadowColor: theme.secondary }]}>
        <Image source={{ uri: avatar }} style={styles.bubbleAvatar} contentFit="cover" />
        {/* NEW dot */}
        <View style={[styles.newDot, { backgroundColor: theme.secondary, borderColor: theme.backgroundRoot }]} />
      </View>
      <ThemedText style={[styles.bubbleName, { color: theme.text }]} numberOfLines={1}>
        {match.otherUser.profile.nickname}
      </ThemedText>
    </Pressable>
  );
}

export default function MatchesScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const queryClient = useQueryClient();

  const {
    data: matches = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<MatchData[]>({
    queryKey: ["/api/matches", user?.id],
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  // Real-time: invalidate matches list on new message or read receipt
  const handleWsMessage = useCallback(
    (msg: any) => {
      if (msg.type === "new_message" || msg.type === "messages_read") {
        queryClient.invalidateQueries({ queryKey: ["/api/matches", user?.id] });
      }
    },
    [queryClient, user?.id],
  );
  useWebSocketMessages(handleWsMessage);

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

  // Split into new (no messages) and conversations (has messages)
  const newMatches = matches.filter((m) => !m.lastMessage);
  const conversations = matches.filter((m) => !!m.lastMessage);

  if (matches.length === 0) {
    return (
      <ThemedView style={[styles.container, styles.centered, { paddingTop: headerHeight }]}>
        <View style={[styles.emptyIconWrap, { borderColor: theme.border }]}>
          <Feather name="heart" size={48} color={theme.textSecondary} />
        </View>
        <ThemedText type="h3" style={[styles.emptyTitle, { color: theme.text }]}>
          {t("matches.noMatchesTitle")}
        </ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          {t("matches.noMatchesSubtitle")}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SectionList
        sections={[
          ...(conversations.length > 0
            ? [{ title: "messages", data: conversations }]
            : []),
        ]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.sm,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={
          newMatches.length > 0 ? (
            <View style={styles.newMatchesSection}>
              {/* Section header */}
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionDot, { backgroundColor: theme.secondary }]} />
                <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                  New Matches
                </ThemedText>
                <View style={[styles.sectionCount, { backgroundColor: `${theme.secondary}20` }]}>
                  <ThemedText style={[styles.sectionCountText, { color: theme.secondary }]}>
                    {newMatches.length}
                  </ThemedText>
                </View>
              </View>

              {/* Horizontal bubbles */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bubblesRow}
              >
                {newMatches.map((match) => (
                  <NewMatchBubble
                    key={match.id}
                    match={match}
                    onPress={() => handleMatchPress(match)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) =>
          section.title === "messages" ? (
            <View style={[styles.sectionHeaderRow, styles.sectionHeaderMessages, { backgroundColor: theme.backgroundRoot }]}>
              <View style={[styles.sectionDot, { backgroundColor: theme.primary }]} />
              <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                Messages
              </ThemedText>
              {conversations.some((c) => c.unreadCount > 0) && (
                <View style={[styles.sectionCount, { backgroundColor: `${theme.primary}20` }]}>
                  <ThemedText style={[styles.sectionCountText, { color: theme.primary }]}>
                    {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
                  </ThemedText>
                </View>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <MatchCard
            nickname={item.otherUser.profile.nickname}
            avatarUrl={item.otherUser.profile.avatarUrl}
            lastMessage={item.lastMessage?.content}
            timestamp={
              item.lastMessage?.createdAt
                ? new Date(item.lastMessage.createdAt)
                : item.matchedAt
                  ? new Date(item.matchedAt)
                  : null
            }
            unreadCount={item.unreadCount}
            isOnline={item.isOnline}
            isAvailableNow={item.isAvailableNow}
            onPress={() => handleMatchPress(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListFooterComponent={
          conversations.length === 0 && newMatches.length > 0 ? (
            <View style={[styles.noConversationsHint, { borderColor: theme.border }]}>
              <Feather name="message-circle" size={20} color={theme.textSecondary} />
              <ThemedText style={[styles.noConversationsText, { color: theme.textSecondary }]}>
                No messages yet — tap a match to say hi!
              </ThemedText>
            </View>
          ) : null
        }
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
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    marginTop: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  newMatchesSection: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionHeaderMessages: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bubblesRow: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  bubbleWrap: {
    alignItems: "center",
    gap: 6,
    width: 72,
  },
  bubbleRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  bubbleAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  newDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  bubbleName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  noConversationsHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    borderStyle: "dashed",
  },
  noConversationsText: {
    fontSize: 14,
    flex: 1,
  },
});
