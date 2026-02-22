import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api-client";
import { wsManager, useWebSocketMessages } from "@/lib/websocket";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { MessageBubble, TypingBubble, DateSeparator } from "@/components/MessageBubble";
import { QuickMessageChip } from "@/components/QuickMessageChip";
import { ReviewModal } from "@/components/ReviewModal";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ChatScreenRouteProp = RouteProp<RootStackParamList, "Chat">;

interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

type ListItem =
  | { type: "message"; message: Message; isFirst: boolean; isLast: boolean }
  | { type: "date"; date: Date; id: string };

const QUICK_MESSAGE_KEYS = [
  "readyToPlay",
  "whatRole",
  "gotTime",
  "addDiscord",
  "teamUpLater",
] as const;

const AVATAR_PLACEHOLDERS = [
  "https://api.dicebear.com/7.x/avataaars/png?seed=chat1",
  "https://api.dicebear.com/7.x/avataaars/png?seed=chat2",
];

function ChatHeader({
  nickname,
  avatarUrl,
  onOptions,
}: {
  nickname: string;
  avatarUrl: string | null;
  onOptions: () => void;
}) {
  const { theme } = useTheme();
  const avatar =
    avatarUrl ||
    AVATAR_PLACEHOLDERS[Math.floor(Math.random() * AVATAR_PLACEHOLDERS.length)];

  return (
    <View style={[styles.headerContainer, { borderBottomColor: theme.border }]}>
      <View style={styles.headerLeft}>
        <View style={[styles.headerAvatarRing, { borderColor: `${theme.primary}50` }]}>
          <Image source={{ uri: avatar }} style={styles.headerAvatar} contentFit="cover" />
          <View style={[styles.headerOnlineDot, { backgroundColor: theme.success, borderColor: theme.backgroundRoot }]} />
        </View>
        <View>
          <ThemedText style={[styles.headerNickname, { color: theme.text }]}>{nickname}</ThemedText>
          <ThemedText style={[styles.headerStatus, { color: theme.success }]}>online</ThemedText>
        </View>
      </View>
      <Pressable
        onPress={onOptions}
        style={({ pressed }) => [styles.headerOptions, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Feather name="more-vertical" size={22} color={theme.text} />
      </Pressable>
    </View>
  );
}

function AnimatedDot({ delay }: { delay: number }) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: delay }),
        withTiming(1, { duration: 300 }),
        withTiming(0.3, { duration: 300 }),
      ),
      -1,
    );
  }, [delay]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.typingDot, { backgroundColor: theme.textSecondary }, style]} />
  );
}

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { matchId, otherUserId, nickname, avatarUrl } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const sendScale = useSharedValue(1);

  const [message, setMessage] = useState("");
  const [showQuickMessages, setShowQuickMessages] = useState(true);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const quickMessages = QUICK_MESSAGE_KEYS.map((key) =>
    t(`gameData.quickMessages.${key}`),
  );

  const { data: fetchedMessages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", matchId],
    enabled: !!matchId,
    refetchInterval: false,
  });

  useEffect(() => {
    if (fetchedMessages.length > 0) {
      setLocalMessages(fetchedMessages);
    }
  }, [fetchedMessages]);

  const allMessages = localMessages;

  // Build list items with date separators and grouping info
  const listItems = React.useMemo((): ListItem[] => {
    const items: ListItem[] = [];
    let lastDate = "";
    let lastSenderId = "";

    allMessages.forEach((msg, i) => {
      const msgDate = new Date(msg.createdAt);
      const dateKey = msgDate.toDateString();

      if (dateKey !== lastDate) {
        items.push({ type: "date", date: msgDate, id: `date-${dateKey}` });
        lastDate = dateKey;
        lastSenderId = "";
      }

      const nextMsg = allMessages[i + 1];
      const prevMsg = allMessages[i - 1];

      const isFirst =
        !prevMsg ||
        prevMsg.senderId !== msg.senderId ||
        new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

      const isLast =
        !nextMsg ||
        nextMsg.senderId !== msg.senderId ||
        new Date(msg.createdAt).toDateString() !== new Date(nextMsg.createdAt).toDateString();

      items.push({ type: "message", message: msg, isFirst, isLast });
      lastSenderId = msg.senderId;
    });

    return items;
  }, [allMessages]);

  const handleWebSocketMessage = useCallback(
    (msg: any) => {
      if (msg.matchId !== matchId) return;
      switch (msg.type) {
        case "new_message":
          setLocalMessages((prev) => {
            const exists = prev.some((m) => m.id === msg.message.id);
            if (exists) return prev;
            return [...prev, msg.message];
          });
          if (msg.message.senderId !== user?.id) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          break;
        case "typing":
          if (msg.userId !== user?.id) {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 3000);
          }
          break;
        case "stop_typing":
          if (msg.userId !== user?.id) setIsTyping(false);
          break;
      }
    },
    [matchId, user?.id],
  );

  useWebSocketMessages(handleWebSocketMessage);

  const sendTypingIndicator = useCallback(
    (typing: boolean) => {
      wsManager.send({
        type: typing ? "typing" : "stop_typing",
        matchId,
        senderId: user?.id || "",
      });
    },
    [matchId, user?.id],
  );

  const handleTextChange = useCallback(
    (text: string) => {
      setMessage(text);
      if (text.length > 0) {
        sendTypingIndicator(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => sendTypingIndicator(false), 2000);
      } else {
        sendTypingIndicator(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    },
    [sendTypingIndicator],
  );

  const handleReport = useCallback(
    async (reason: string) => {
      try {
        await apiRequest("POST", "/report", { reportedUserId: otherUserId, reason });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t("chat.reportSubmitted"), t("chat.reportSubmittedMessage"));
      } catch {
        Alert.alert(t("common.error"), t("chat.failedReport"));
      }
    },
    [otherUserId, t],
  );

  const handleBlock = useCallback(async () => {
    try {
      await apiRequest("POST", "/block", { blockedUserId: otherUserId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      Alert.alert(t("chat.userBlocked"), t("chat.userBlockedMessage", { name: nickname }), [
        { text: t("common.ok"), onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t("common.error"), t("chat.failedBlock"));
    }
  }, [otherUserId, nickname, navigation, queryClient, t]);

  const showReportOptions = useCallback(() => {
    Alert.alert(t("chat.reportUser"), t("chat.reportWhy"), [
      { text: t("chat.reportInappropriate"), onPress: () => handleReport("inappropriate_content") },
      { text: t("chat.reportHarassment"), onPress: () => handleReport("harassment") },
      { text: t("chat.reportSpam"), onPress: () => handleReport("spam") },
      { text: t("chat.reportFake"), onPress: () => handleReport("fake_profile") },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }, [handleReport, t]);

  const showOptionsMenu = useCallback(() => {
    Alert.alert(nickname, t("chat.chooseAction"), [
      { text: t("reviews.leaveReview"), onPress: () => setShowReviewModal(true) },
      { text: t("chat.reportUser"), onPress: showReportOptions },
      {
        text: t("chat.blockUser"),
        style: "destructive",
        onPress: () => {
          Alert.alert(
            t("chat.blockUser"),
            t("chat.blockConfirm", { name: nickname }),
            [
              { text: t("common.cancel"), style: "cancel" },
              { text: t("chat.block"), style: "destructive", onPress: handleBlock },
            ],
          );
        },
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }, [nickname, showReportOptions, handleBlock, t]);

  // Custom header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <ChatHeader
          nickname={nickname}
          avatarUrl={avatarUrl ?? null}
          onOptions={showOptionsMenu}
        />
      ),
      headerRight: () => null,
    });
  }, [navigation, nickname, avatarUrl, showOptionsMenu]);

  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [allMessages.length]);

  const sendScale_style = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const handleSend = useCallback(async () => {
    if (!message.trim() || isSending) return;
    const content = message.trim();
    setMessage("");
    setShowQuickMessages(false);
    setIsSending(true);
    sendTypingIndicator(false);

    sendScale.value = withSequence(
      withSpring(0.85, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 300 }),
    );

    try {
      const newMessage = await apiRequest<Message>("POST", "/api/messages", {
        matchId,
        senderId: user?.id,
        content,
      });
      setLocalMessages((prev) => {
        const exists = prev.some((m) => m.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    } catch {
      Alert.alert(t("common.error"), t("chat.failedSend"));
      setMessage(content);
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, matchId, user?.id, queryClient, sendTypingIndicator, t]);

  const handleQuickMessage = useCallback(
    async (quickMessage: string) => {
      setShowQuickMessages(false);
      setIsSending(true);
      try {
        const newMessage = await apiRequest<Message>("POST", "/api/messages", {
          matchId,
          senderId: user?.id,
          content: quickMessage,
        });
        setLocalMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      } catch {
        Alert.alert(t("common.error"), t("chat.failedSend"));
      } finally {
        setIsSending(false);
      }
    },
    [matchId, user?.id, queryClient, t],
  );

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  const canSend = message.trim().length > 0 && !isSending;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={flatListRef}
          data={listItems}
          keyExtractor={(item) => item.type === "date" ? item.id : item.message.id}
          contentContainerStyle={[
            styles.messagesList,
            { paddingTop: Spacing.lg },
          ]}
          renderItem={({ item }) => {
            if (item.type === "date") {
              return <DateSeparator date={item.date} />;
            }
            return (
              <MessageBubble
                content={item.message.content}
                isMine={item.message.senderId === user?.id}
                timestamp={new Date(item.message.createdAt)}
                isFirst={item.isFirst}
                isLast={item.isLast}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyAvatarRing, { borderColor: `${theme.secondary}60`, shadowColor: theme.secondary }]}>
                <Image
                  source={{ uri: avatarUrl || AVATAR_PLACEHOLDERS[0] }}
                  style={styles.emptyAvatar}
                  contentFit="cover"
                />
              </View>
              <ThemedText style={[styles.emptyName, { color: theme.text }]}>{nickname}</ThemedText>
              <ThemedText style={[styles.emptyHint, { color: theme.textSecondary }]}>
                {t("chat.startConversation")}
              </ThemedText>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingRow}>
                <View style={[styles.typingBubble, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <AnimatedDot delay={0} />
                  <AnimatedDot delay={150} />
                  <AnimatedDot delay={300} />
                </View>
              </View>
            ) : null
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {/* Input area */}
        <View style={[
          styles.inputContainer,
          {
            paddingBottom: insets.bottom + Spacing.sm,
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
          },
        ]}>
          {showQuickMessages && allMessages.length === 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickScroll}
              contentContainerStyle={styles.quickContent}
            >
              {quickMessages.map((qm, i) => (
                <QuickMessageChip key={i} message={qm} onPress={() => handleQuickMessage(qm)} />
              ))}
            </ScrollView>
          )}

          <View style={[
            styles.inputRow,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder={t("chat.messagePlaceholder")}
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={handleTextChange}
              multiline
              maxLength={500}
              onFocus={() => setShowQuickMessages(false)}
            />
            <Animated.View style={sendScale_style}>
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: canSend ? theme.primary : theme.backgroundSecondary,
                    shadowColor: canSend ? theme.primary : "transparent",
                  },
                ]}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather
                    name="send"
                    size={18}
                    color={canSend ? "#FFFFFF" : theme.textSecondary}
                  />
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviewedUserId={otherUserId}
        matchId={matchId}
        nickname={nickname}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  keyboardAvoid: { flex: 1 },

  // Header
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    flex: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  headerAvatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  headerNickname: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  headerOptions: {
    padding: 6,
  },

  // Messages
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 60,
    gap: Spacing.md,
  },
  emptyAvatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  emptyAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  emptyName: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyHint: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: Spacing["3xl"],
  },

  // Typing
  typingRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  typingBubble: {
    flexDirection: "row",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // Input
  inputContainer: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  quickScroll: {
    marginBottom: Spacing.xs,
  },
  quickContent: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
