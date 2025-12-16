import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { MessageBubble } from "@/components/MessageBubble";
import { QuickMessageChip } from "@/components/QuickMessageChip";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { QUICK_MESSAGES } from "@/lib/game-data";
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

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const { matchId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const theme = Colors.dark;
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [message, setMessage] = useState("");
  const [showQuickMessages, setShowQuickMessages] = useState(true);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", matchId],
    enabled: !!matchId,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/messages", {
        matchId,
        senderId: user?.id,
        content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
    setMessage("");
    setShowQuickMessages(false);
  };

  const handleQuickMessage = (quickMessage: string) => {
    sendMutation.mutate(quickMessage);
    setShowQuickMessages(false);
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
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
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
              <Feather name="message-circle" size={48} color={theme.textSecondary} />
              <ThemedText style={styles.emptyText}>
                Start the conversation!
              </ThemedText>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
          {showQuickMessages && messages.length === 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickMessagesScroll}
              contentContainerStyle={styles.quickMessagesContent}
            >
              {QUICK_MESSAGES.map((qm, index) => (
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
              style={[styles.input, { color: theme.text }]}
              placeholder="Type a message..."
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              onFocus={() => setShowQuickMessages(false)}
            />
            <Pressable
              onPress={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: message.trim() ? theme.primary : theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {sendMutation.isPending ? (
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
    color: "#A0A8B8",
    fontSize: 16,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#2A3040",
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: "#0A0E1A",
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
    backgroundColor: "#1A1F2E",
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
