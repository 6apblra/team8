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
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api-client";
import { wsManager, useWebSocketMessages } from "@/lib/websocket";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { MessageBubble } from "@/components/MessageBubble";
import { QuickMessageChip } from "@/components/QuickMessageChip";
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

const QUICK_MESSAGE_KEYS = [
  "readyToPlay",
  "whatRole",
  "gotTime",
  "addDiscord",
  "teamUpLater",
] as const;

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { matchId, otherUserId, nickname } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [message, setMessage] = useState("");
  const [showQuickMessages, setShowQuickMessages] = useState(true);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
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
          if (msg.userId !== user?.id) {
            setIsTyping(false);
          }
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
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingIndicator(false);
        }, 2000);
      } else {
        sendTypingIndicator(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    },
    [sendTypingIndicator],
  );

  const handleReport = useCallback(
    async (reason: string) => {
      try {
        await apiRequest("POST", "/report", {
          reportedUserId: otherUserId,
          reason,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          t("chat.reportSubmitted"),
          t("chat.reportSubmittedMessage"),
        );
      } catch (error) {
        Alert.alert(t("common.error"), t("chat.failedReport"));
      }
    },
    [otherUserId, t],
  );

  const handleBlock = useCallback(async () => {
    try {
      await apiRequest("POST", "/block", {
        blockedUserId: otherUserId,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      Alert.alert(t("chat.userBlocked"), t("chat.userBlockedMessage", { name: nickname }), [
        { text: t("common.ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(t("common.error"), t("chat.failedBlock"));
    }
  }, [otherUserId, nickname, navigation, queryClient, t]);

  const showReportOptions = useCallback(() => {
    Alert.alert(t("chat.reportUser"), t("chat.reportWhy"), [
      {
        text: t("chat.reportInappropriate"),
        onPress: () => handleReport("inappropriate_content"),
      },
      { text: t("chat.reportHarassment"), onPress: () => handleReport("harassment") },
      { text: t("chat.reportSpam"), onPress: () => handleReport("spam") },
      { text: t("chat.reportFake"), onPress: () => handleReport("fake_profile") },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }, [handleReport, t]);

  const showOptionsMenu = useCallback(() => {
    Alert.alert(nickname, t("chat.chooseAction"), [
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

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={showOptionsMenu} style={{ padding: 8 }}>
          <Feather name="more-vertical" size={22} color={theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, showOptionsMenu, theme.text]);

  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [allMessages.length]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || isSending) return;

    const content = message.trim();
    setMessage("");
    setShowQuickMessages(false);
    setIsSending(true);
    sendTypingIndicator(false);

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
    } catch (error) {
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
      } catch (error) {
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

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={flatListRef}
          data={allMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            { paddingTop: headerHeight + Spacing.lg },
          ]}
          renderItem={({ item }) => (
            <MessageBubble
              content={item.content}
              isMine={item.senderId === user?.id}
              timestamp={new Date(item.createdAt)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather
                name="message-circle"
                size={48}
                color={theme.textSecondary}
              />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                {t("chat.startConversation")}
              </ThemedText>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingIndicator}>
                <ThemedText style={[styles.typingText, { color: theme.textSecondary }]}>
                  {t("chat.isTyping", { name: nickname })}
                </ThemedText>
              </View>
            ) : null
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        <View
          style={[
            styles.inputContainer,
            { paddingBottom: insets.bottom + Spacing.sm, backgroundColor: theme.backgroundRoot, borderTopColor: theme.border },
          ]}
        >
          {showQuickMessages && allMessages.length === 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickMessagesScroll}
              contentContainerStyle={styles.quickMessagesContent}
            >
              {quickMessages.map((qm, index) => (
                <QuickMessageChip
                  key={index}
                  message={qm}
                  onPress={() => handleQuickMessage(qm)}
                />
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundDefault }]}
              placeholder={t("chat.messagePlaceholder")}
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={handleTextChange}
              multiline
              maxLength={500}
              onFocus={() => setShowQuickMessages(false)}
            />
            <Pressable
              onPress={handleSend}
              disabled={!message.trim() || isSending}
              style={({ pressed }: { pressed: boolean }) => [
                styles.sendButton,
                {
                  backgroundColor: message.trim()
                    ? theme.primary
                    : theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather
                  name="send"
                  size={20}
                  color={message.trim() ? "#FFFFFF" : theme.textSecondary}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
  },
  typingIndicator: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  typingText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  inputContainer: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  quickMessagesScroll: {
    marginBottom: Spacing.sm,
  },
  quickMessagesContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
