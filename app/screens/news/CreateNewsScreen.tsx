import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { useSound } from '../../hooks/useSound';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { newsApi } from '../../services/api/news.api';
import type { HomeStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateNews'>;

// Mirrors the categories the web editor offers; the backend stores a plain string.
const CATEGORY_KEYS = ['announcement', 'event', 'achievement', 'general'] as const;

const MAX_TITLE = 200;
const MAX_SUBTITLE = 300;
const MAX_DESCRIPTION = 2000;

export default function CreateNewsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { user } = useAuth();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(t(`news.categories.${CATEGORY_KEYS[0]}`));
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const titleError = submitted && !title.trim() ? t('validation.required') : undefined;
  const subTitleError = submitted && !subTitle.trim() ? t('validation.required') : undefined;
  const descriptionError = submitted && !description.trim() ? t('validation.required') : undefined;
  const categoryError = submitted && !category.trim() ? t('validation.required') : undefined;

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('createNews.permissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setImage({
      uri: asset.uri,
      name: asset.fileName || `news-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    });
  };

  const publish = async () => {
    setSubmitted(true);
    if (!title.trim() || !subTitle.trim() || !description.trim() || !category.trim()) return;

    setSaving(true);
    try {
      await newsApi.createNews({
        title: title.trim(),
        subTitle: subTitle.trim(),
        description: description.trim(),
        category: category.trim(),
        image,
        staffId: user?.staffId ?? null,
      });
      play('success');
      Alert.alert(t('common.success'), t('createNews.published'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('createNews.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('createNews.title')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.imageEmpty}>
                <Ionicons name="image-outline" size={30} color={theme.colors.primary} />
                <Text style={styles.imageEmptyText}>{t('createNews.addImage')}</Text>
              </View>
            )}
          </TouchableOpacity>
          {image && (
            <TouchableOpacity onPress={() => setImage(null)} style={styles.removeImage}>
              <Text style={styles.removeImageText}>{t('createNews.removeImage')}</Text>
            </TouchableOpacity>
          )}

          <Input
            label={t('createNews.titleLabel')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('createNews.titlePlaceholder')}
            error={titleError}
            maxLength={MAX_TITLE}
          />
          <Input
            label={t('createNews.subtitleLabel')}
            value={subTitle}
            onChangeText={setSubTitle}
            placeholder={t('createNews.subtitlePlaceholder')}
            error={subTitleError}
            maxLength={MAX_SUBTITLE}
          />

          <Text style={styles.sectionLabel}>{t('createNews.categoryLabel')}</Text>
          <View style={styles.chipRow}>
            {CATEGORY_KEYS.map((key) => {
              const label = t(`news.categories.${key}`);
              const active = category === label;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.card,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setCategory(label)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : theme.colors.text }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Input
            value={category}
            onChangeText={setCategory}
            placeholder={t('createNews.categoryPlaceholder')}
            error={categoryError}
            maxLength={100}
          />

          <Input
            label={t('createNews.bodyLabel')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('createNews.bodyPlaceholder')}
            error={descriptionError}
            multiline
            numberOfLines={6}
            maxLength={MAX_DESCRIPTION}
            style={styles.bodyInput}
          />
          <Text style={styles.counter}>
            {description.length} / {MAX_DESCRIPTION}
          </Text>

          <Button
            title={t('createNews.publish')}
            onPress={publish}
            loading={saving}
            fullWidth
            size="large"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: spacing.xl, gap: spacing.sm },
    imagePicker: {
      height: 170,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePreview: { width: '100%', height: '100%' },
    imageEmpty: { alignItems: 'center', gap: spacing.xs },
    imageEmptyText: {
      fontSize: fontSize.sm,
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.textSecondary,
    },
    removeImage: { alignSelf: 'center', paddingVertical: spacing.xs },
    removeImageText: {
      fontSize: fontSize.sm,
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.danger,
    },
    sectionLabel: {
      fontSize: fontSize.sm,
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.text,
      marginTop: spacing.sm,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: borderRadius.full,
      borderWidth: 1,
    },
    chipText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
    bodyInput: { minHeight: 130 },
    counter: {
      alignSelf: 'flex-end',
      fontSize: fontSize.xs,
      fontFamily: 'Cairo_400Regular',
      color: theme.colors.textMuted,
      marginBottom: spacing.sm,
    },
  });
}
