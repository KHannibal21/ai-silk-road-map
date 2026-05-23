// app/(tabs)/ai.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { geminiGenerateText } from '@/service/gemini-api';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
};

const STORAGE_KEY = 'ai_chat_v3';

function mutedTextColor(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? 'rgba(240,233,221,0.72)' : 'rgba(44,44,44,0.62)';
}
function subtleBg(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)';
}
function hairline(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
}

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeParam(v?: string | string[]) {
  if (!v) return '';
  if (Array.isArray(v)) return v[0] ?? '';
  return v;
}

export default function AiScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const t = Colors[scheme];
  const muted = mutedTextColor(scheme);
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ q?: string; autosend?: string; ts?: string }>();
  const initialQuestion = normalizeParam(params.q);
  const autoSend = normalizeParam(params.autosend) === '1';

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Флаг, чтобы автоотправка сработала только один раз для текущего набора параметров
  const autoSendPerformedRef = useRef(false);

  // Загружаем сохранённый чат
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Message[];
          setMessages(parsed);
        } else {
          // Приветственное сообщение
          setMessages([
            {
              id: uid(),
              role: 'assistant',
              createdAt: Date.now(),
              text:
                'Сәлем! Мен “AI Silk Road Map” көмекшісімін.\n' +
                'Маған қала/нысан немесе маршрут туралы сұрақ қой: мысалы, “Отырардың Жібек жолындағы рөлі қандай?”',
            },
          ]);
        }
      } catch (e) {
        console.warn('Failed to load chat', e);
      }
    })();
  }, []);

  // Сохраняем чат при изменении
  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100))).catch(console.warn);
    }
  }, [messages]);

  // Автоотправка вопроса из параметров (только один раз)
  useEffect(() => {
    if (initialQuestion && autoSend && !isLoading && !autoSendPerformedRef.current) {
      autoSendPerformedRef.current = true; // сразу помечаем, чтобы избежать повторных срабатываний
      const task = InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          setInputText(initialQuestion);
          sendMessage(initialQuestion).finally(() => {
            // После завершения отправки (успех или ошибка) очищаем параметры навигации,
            // чтобы при возврате на этот экран вопрос не подставлялся снова.
            router.setParams({});
          });
        }, 180);
      });
      return () => task.cancel();
    } else if (initialQuestion && !autoSend && !autoSendPerformedRef.current) {
      // Если autosend не требуется, просто устанавливаем текст в поле ввода (тоже один раз)
      autoSendPerformedRef.current = true;
      setInputText(initialQuestion);
    }
  }, [initialQuestion, autoSend, isLoading]); // убрали sendMessage из зависимостей, чтобы избежать цикла

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 40);
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, isLoading, scrollToBottom]);

  // Клавиатурные события для скролла
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subShow = Keyboard.addListener(showEvt, () => scrollToBottom(true));
    const subHide = Keyboard.addListener(hideEvt, () => scrollToBottom(true));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [scrollToBottom]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: uid(),
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setError(null);
    setIsLoading(true);
    scrollToBottom(true);

    try {
      const answer = await geminiGenerateText(trimmed);
      const assistantMessage: Message = {
        id: uid(),
        role: 'assistant',
        text: answer,
        createdAt: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      const friendly = err?.message || 'Белгісіз қате';
      setError(friendly);
      const errorMessage: Message = {
        id: uid(),
        role: 'assistant',
        text:
          'Кешір, жауап ала алмадым.\n' +
          `Себебі: ${friendly}\n` +
          'Қайталап көру үшін төмендегі “Қайта сұрау” батырмасын бас.',
        createdAt: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      scrollToBottom(true);
    }
  };

  const retryLast = async () => {
    if (isLoading) return;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      await sendMessage(lastUser.text);
    } else {
      setInputText('Отырар туралы қысқаша түсіндір.');
      inputRef.current?.focus();
    }
  };

  const clearChat = async () => {
    setError(null);
    const welcome: Message = {
      id: uid(),
      role: 'assistant',
      createdAt: Date.now(),
      text: 'Жаңа чат басталды.\nМаған қала/нысан немесе маршрут туралы сұрақ қой (қазақ тілінде).',
    };
    setMessages([welcome]);
    setInputText('');
    await AsyncStorage.removeItem(STORAGE_KEY);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: t.background }]}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={Platform.select({ ios: 88, android: 0 })}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.background }]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.title, { color: t.text }]}>AI Көмекші</ThemedText>
            <ThemedText style={[styles.subtitle, { color: muted }]} numberOfLines={1}>
              Жібек жолы • Қазақстан тарихы
            </ThemedText>
          </View>

          <Pressable
            onPress={clearChat}
            style={({ pressed }) => [
              styles.headerBtn,
              { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.9 : 1 },
            ]}
            hitSlop={8}
          >
            <IconSymbol name="trash.fill" size={16} color={t.icon} />
          </Pressable>
        </View>

        {/* Chat messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={[styles.chatContent, { paddingBottom: Math.max(insets.bottom, 0) + 14 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          {messages.map(msg => (
            <Bubble key={msg.id} msg={msg} scheme={scheme} />
          ))}

          {isLoading && (
            <View style={[styles.thinkingRow, { borderColor: hairline(scheme) }]}>
              <ActivityIndicator size="small" color={t.tint} />
              <ThemedText style={[styles.thinkingText, { color: muted }]}>Жауап дайындалуда…</ThemedText>
            </View>
          )}

          {!isLoading && error && (
            <View style={[styles.errorCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={16} color={t.tint} />
              <ThemedText style={[styles.errorText, { color: muted }]} numberOfLines={4}>
                {error}
              </ThemedText>
              <Pressable
                onPress={retryLast}
                style={({ pressed }) => [
                  styles.smallBtn,
                  { backgroundColor: subtleBg(scheme), borderColor: t.border, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <ThemedText style={[styles.smallBtnText, { color: t.text }]}>Қайта сұрау</ThemedText>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Composer (без быстрых кнопок) */}
        <View style={[styles.composer, { borderTopColor: t.border, backgroundColor: t.background }]}>
          <View style={[styles.inputWrap, { borderColor: t.border, backgroundColor: t.card }]}>
            <TextInput
              ref={inputRef}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Сұрақ жаз… (мысалы: “Тараз туралы қысқаша дерек бер”)"
              placeholderTextColor={scheme === 'dark' ? 'rgba(244,235,221,0.55)' : 'rgba(31,35,40,0.45)'}
              style={[styles.input, { color: t.text }]}
              multiline
              maxLength={2400}
              autoCorrect={false}
              autoCapitalize="sentences"
              returnKeyType="send"
              blurOnSubmit={false}
              editable={!isLoading}
              onFocus={() => scrollToBottom(true)}
              onSubmitEditing={() => {
                if (inputText.trim() && !isLoading) sendMessage(inputText);
              }}
            />

            <Pressable
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() && !isLoading ? t.tint : t.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              hitSlop={8}
            >
              <IconSymbol
                name="paperplane.fill"
                size={16}
                color={inputText.trim() && !isLoading ? (scheme === 'dark' ? '#0F1216' : '#FFF9F0') : t.icon}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Компонент пузырька сообщения
function Bubble({ msg, scheme }: { msg: Message; scheme: 'light' | 'dark' }) {
  const t = Colors[scheme];
  const muted = mutedTextColor(scheme);
  const isUser = msg.role === 'user';

  const roleColor = isUser ? (scheme === 'dark' ? '#0F1216' : '#FFF9F0') : muted;
  const textColor = isUser ? (scheme === 'dark' ? '#0F1216' : '#FFF9F0') : t.text;

  return (
    <View style={[styles.bubbleRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: isUser ? t.tint : t.card, borderColor: isUser ? t.tint : t.border },
        ]}
      >
        <View style={styles.bubbleHeader}>
          <IconSymbol
            name={isUser ? 'person.fill' : 'sparkles'}
            size={14}
            color={isUser ? (scheme === 'dark' ? '#0F1216' : '#FFF9F0') : t.icon}
          />
          <ThemedText style={[styles.bubbleRole, { color: roleColor }]}>{isUser ? 'Сен' : 'AI'}</ThemedText>
        </View>

        <ThemedText style={[styles.bubbleText, { color: textColor }]}>{msg.text}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 14, android: 12, default: 12 }),
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  headerBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chat: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },

  bubbleRow: { flexDirection: 'row' },
  bubble: {
    maxWidth: '92%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 8,
  },
  bubbleHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bubbleRole: { fontSize: 12, fontWeight: '900' },
  bubbleText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  thinkingRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  thinkingText: { fontSize: 12, fontWeight: '700' },

  errorCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  errorText: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 16 },
  smallBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallBtnText: { fontSize: 12, fontWeight: '900' },

  composer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.select({ ios: 12, android: 12, default: 12 }),
    gap: 10,
    marginBottom: '5%',
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 160,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  sendBtn: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});