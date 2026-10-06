import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { C } from '../theme';
import type { CopyKey } from '../i18n';

interface HelpPrivacyScreenProps {
  hindi: boolean;
  t: (key: CopyKey) => string;
  signedIn: boolean;
  onBack: () => void;
  onDeleteAccount?: () => Promise<void>;
}

export function HelpPrivacyScreen({
  t,
  signedIn,
  onBack,
  onDeleteAccount,
}: HelpPrivacyScreenProps) {
  const [deleting, setDeleting] = useState(false);

  const extra = Constants.expoConfig?.extra ?? {};
  const privacyUrl = (extra.privacyPolicyUrl as string) || 'https://merasaarthi.in/privacy';
  const deletionUrl = (extra.accountDeletionUrl as string) || 'https://merasaarthi.in/delete-account';
  const supportEmail = (extra.supportEmail as string) || 'support@merasaarthi.in';
  const supportPhone = (extra.supportPhone as string) || '';
  const version = Constants.expoConfig?.version || '1.0.0';
  const versionCode = Constants.expoConfig?.android?.versionCode || 1;

  const handleOpenUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('help'), url);
      }
    } catch {
      Alert.alert(t('help'), url);
    }
  };

  const handleContactSupport = () => {
    if (supportPhone) {
      void handleOpenUrl(`tel:${supportPhone}`);
    } else {
      void handleOpenUrl(`mailto:${supportEmail}?subject=Mera%20Saarthi%20Support`);
    }
  };

  const confirmAccountDeletion = () => {
    Alert.alert(
      t('confirmDeleteAccount'),
      t('deleteAccountWarning'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteAccountConfirmButton'),
          style: 'destructive',
          onPress: async () => {
            if (!onDeleteAccount) return;
            setDeleting(true);
            try {
              await onDeleteAccount();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : t('accountDeletionFailed');
              Alert.alert(t('accountDeletionFailed'), msg);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={localStyles.content}>
      {/* App Information */}
      <View style={localStyles.card}>
        <Text style={localStyles.cardTitle}>{t('brand')}</Text>
        <Text style={localStyles.metaText}>
          {t('appVersion')}: {version} ({versionCode})
        </Text>
        <Text style={localStyles.cardNote}>{t('tagline')}</Text>
      </View>

      {/* Support Section */}
      <View style={localStyles.card}>
        <Text style={localStyles.cardTitle}>{t('contactSupport')}</Text>
        <Text style={localStyles.cardSub}>{t('supportDesc')}</Text>
        <Text style={localStyles.contactHighlight}>
          {supportPhone ? `📞 ${supportPhone}` : `✉️ ${supportEmail}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleContactSupport}
          style={localStyles.actionButton}
        >
          <Text style={localStyles.actionButtonText}>
            {supportPhone ? 'Call Support' : 'Email Support'}
          </Text>
        </Pressable>
      </View>

      {/* Privacy Policy */}
      <View style={localStyles.card}>
        <Text style={localStyles.cardTitle}>{t('privacyPolicy')}</Text>
        <Text style={localStyles.cardSub}>{t('privacyPolicyDesc')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleOpenUrl(privacyUrl)}
          style={localStyles.outlineButton}
        >
          <Text style={localStyles.outlineButtonText}>
            {t('privacyPolicy')} ({t('openInBrowser')})
          </Text>
        </Pressable>
      </View>

      {/* Account Deletion */}
      <View style={localStyles.card}>
        <Text style={localStyles.cardTitle}>{t('accountDeletion')}</Text>
        <Text style={localStyles.cardSub}>{t('accountDeletionDesc')}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleOpenUrl(deletionUrl)}
          style={localStyles.outlineButton}
        >
          <Text style={localStyles.outlineButtonText}>
            {t('accountDeletion')} Web Page ({t('openInBrowser')})
          </Text>
        </Pressable>

        {signedIn && onDeleteAccount && (
          <View style={localStyles.dangerZone}>
            <Text style={localStyles.dangerWarning}>
              {t('deleteAccountWarning')}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={deleting}
              onPress={confirmAccountDeletion}
              style={[
                localStyles.dangerButton,
                deleting && { opacity: 0.6 },
              ]}
            >
              <Text style={localStyles.dangerButtonText}>
                {deleting ? t('deletingAccount') : t('deleteAccount')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={localStyles.backButton}
      >
        <Text style={localStyles.backButtonText}>{t('back')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 34,
    gap: 16,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  cardTitle: {
    color: C.ink,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSub: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  cardNote: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  contactHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: C.green,
    marginTop: 8,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: C.green2,
    borderWidth: 1,
    borderColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  actionButtonText: {
    color: C.green,
    fontSize: 14,
    fontWeight: '800',
  },
  outlineButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  outlineButtonText: {
    color: C.orange,
    fontSize: 13,
    fontWeight: '700',
  },
  dangerZone: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  dangerWarning: {
    color: C.red,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  dangerButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dangerButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
  },
  backButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: C.muted,
    fontSize: 14,
    fontWeight: '700',
  },
});
