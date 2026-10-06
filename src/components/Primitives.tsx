import React from 'react';
import { Pressable, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { styles, VEHICLES } from '../theme';
import type { Role, VehicleType } from '../types';

type Translate = (key: string) => string;

export function AppHeader({
  title,
  back,
  signedIn,
  hindi,
  onSignOut,
  onToggleLanguage,
  onOpenHelp,
  t,
}: {
  title: string;
  back?: () => void;
  signedIn: boolean;
  hindi: boolean;
  onSignOut: () => void;
  onToggleLanguage: () => void;
  onOpenHelp?: () => void;
  t: Translate;
}) {
  return (
    <View style={styles.header}>
      {back ? <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={back} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable> : <Text style={styles.logoMark}>MS</Text>}
      <View style={{ flex: 1 }}><Text style={styles.headerTitle}>{title}</Text><Text style={styles.headerSub}>{t('tagline')}</Text></View>
      {onOpenHelp && (
        <Pressable accessibilityRole="button" accessibilityLabel={t('helpAndPrivacy')} onPress={onOpenHelp} style={styles.lang}>
          <Text style={styles.langText}>ℹ️</Text>
        </Pressable>
      )}
      {signedIn && <Pressable accessibilityRole="button" accessibilityLabel={t('signOut')} onPress={onSignOut} style={styles.lang}><Text style={styles.langText}>{t('signOut')}</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel={t('switchToEnglish')} onPress={onToggleLanguage} style={styles.lang}><Text style={styles.langText}>{t('language')}</Text></Pressable>
    </View>
  );
}

export function FormField({
  label,
  value,
  onChange,
  placeholder = '',
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#78716C"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.88 }]}><Text style={styles.primaryText}>{label}  →</Text></Pressable>;
}

export function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

export function VehicleTypePicker({
  current,
  onPick,
  t,
}: {
  current: VehicleType | 'Any';
  onPick: (value: VehicleType | 'Any') => void;
  t: Translate;
}) {
  const vehicleLabels: Record<VehicleType, string> = { Hatchback: t('vehicleHatchback'), Sedan: t('vehicleSedan'), SUV: t('vehicleSUV'), Van: t('vehicleVan') };
  return <View style={styles.chipRow}>{(['Any', ...VEHICLES] as const).map((value) => <ChoiceChip key={value} label={value === 'Any' ? t('any') : vehicleLabels[value]} active={current === value} onPress={() => onPick(value)} />)}</View>;
}

export function RolePicker({ role, onPick, t }: { role: Role; onPick: (role: Role) => void; t: Translate }) {
  return (
    <View style={styles.roleBox}>
      <Text style={styles.eyebrow}>{t('switchRole')}</Text>
      <View style={styles.roleRow}>{(['customer', 'owner', 'admin'] as Role[]).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: role === value }} onPress={() => onPick(value)} style={[styles.roleButton, role === value && styles.roleButtonActive]}><Text style={[styles.roleText, role === value && styles.roleTextActive]}>{t(value)}</Text></Pressable>)}</View>
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}
