import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExampleNumber, type CountryCode } from 'libphonenumber-js/mobile';
import examples from 'libphonenumber-js/mobile/examples';
import { useTheme } from '@theme/ThemeProvider';
import { spacing } from '@theme/spacing';
import { typography, fontSize } from '@theme/typography';
import { useRTL } from '../../i18n/RTLProvider';
import { PHONE_COUNTRIES, PRIORITY_PHONE_COUNTRY_COUNT, type PhoneCountry } from '../../utils/phoneCountries';
import { flagEmoji, normalizeSearch } from '../../utils/phoneNumber';

interface PhoneInputProps {
  label?: string;
  value: string;
  country: CountryCode;
  onChangeText: (value: string) => void;
  onChangeCountry: (country: CountryCode) => void;
  error?: string;
}

export function PhoneInput({ label, value, country, onChangeText, onChangeCountry, error }: PhoneInputProps) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);

  const selected = PHONE_COUNTRIES.find((c) => c.code === country) ?? PHONE_COUNTRIES[0];
  const nameOf = (c: PhoneCountry) => (locale === 'ar' ? c.ar : c.en);

  const countries = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter((c) =>
      normalizeSearch(`${c.ar} ${c.en} ${c.code} ${c.callingCode}`).includes(query)
    );
  }, [search]);

  const borderColor = error ? theme.colors.danger : focused ? theme.colors.primary : theme.colors.inputBorder;
  const background = theme.dark ? theme.colors.inputBackground : theme.colors.card;

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>}

      <View style={[styles.field, { backgroundColor: background, borderColor, borderWidth: focused ? 1.5 : 1 }]}>
        <TouchableOpacity
          style={[styles.countryButton, { borderEndColor: theme.colors.inputBorder }]}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('auth.phoneCountry')}
        >
          <Text style={styles.flag}>{flagEmoji(selected.code)}</Text>
          <Text style={[styles.callingCode, { color: theme.colors.inputText }]}>+{selected.callingCode}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: theme.colors.inputText }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={getExampleNumber(selected.code, examples)?.formatNational().replace(/\D/g, '') || t('auth.phonePlaceholder')}
          placeholderTextColor={theme.colors.inputPlaceholder}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={20}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>

      {error && <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.md }]}>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{t('auth.phoneCountry')}</Text>
            <View style={[styles.search, { backgroundColor: background, borderColor: theme.colors.inputBorder }]}>
              <Ionicons name="search" size={18} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.inputText }]}
                value={search}
                onChangeText={setSearch}
                placeholder={t('auth.phoneCountrySearch')}
                placeholderTextColor={theme.colors.inputPlaceholder}
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={countries}
              keyExtractor={(c) => c.code}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              renderItem={({ item, index }) => {
                const active = item.code === selected.code;
                const lastPriority = !search && index === PRIORITY_PHONE_COUNTRY_COUNT - 1;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      { borderBottomColor: theme.colors.divider },
                      lastPriority && { borderBottomWidth: 6 },
                    ]}
                    onPress={() => {
                      onChangeCountry(item.code);
                      close();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={styles.flag}>{flagEmoji(item.code)}</Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.optionName, { color: active ? theme.colors.primary : theme.colors.text }]}
                    >
                      {nameOf(item)}
                    </Text>
                    <Text style={[styles.optionCode, { color: theme.colors.textMuted }]}>+{item.callingCode}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('auth.phoneCountryNotFound')}</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  field: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: '100%',
    paddingHorizontal: spacing.md,
    borderEndWidth: 1,
  },
  flag: {
    fontSize: 20,
    textAlign: 'left',
  },
  callingCode: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
  },
  sheetTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: fontSize.base,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'left',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionName: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'left',
  },
  optionCode: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    padding: spacing.xl,
  },
});

export default PhoneInput;
