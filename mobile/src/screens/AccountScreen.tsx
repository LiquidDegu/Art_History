import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppState } from '../state/AppState';
import { COLORS } from '../theme';

// Build Roadmap Step 5: optional account so progress can follow across
// devices (see src/auth/authClient.ts for the claim/adopt logic this
// triggers). Playing without an account works exactly as before —
// nothing here is required to use the app.
export function AccountScreen() {
  const { session, xp, streak, authBusy, authError, login, register, logout } = useAppState();

  if (session) {
    return (
      <View style={styles.screen}>
        <View style={styles.loggedInCard}>
          <Ionicons name="person-circle" size={48} color={COLORS.gold} />
          <Text style={styles.email}>{session.email}</Text>
          <Text style={styles.summary}>
            {xp} XP · {streak} day streak
          </Text>
          <Text style={styles.hint}>Your progress syncs to this account across devices.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => logout()}>
            <Text style={styles.secondaryButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <AuthForm authBusy={authBusy} authError={authError} onLogin={login} onRegister={register} />;
}

interface AuthFormProps {
  authBusy: boolean;
  authError: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
}

function AuthForm({ authBusy, authError, onLogin, onRegister }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 3 && password.length >= 8 && !authBusy;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      if (mode === 'login') {
        await onLogin(email.trim(), password);
      } else {
        await onRegister(email.trim(), password);
      }
    } catch {
      // authError is already set by AppState; nothing else to do here.
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{mode === 'login' ? 'Log In' : 'Create Account'}</Text>
        <Text style={styles.subtitle}>
          Optional — keep playing without one, or sign in to follow your progress across devices.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9AA39C"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min. 8 characters)"
          placeholderTextColor="#9AA39C"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        {authError && <Text style={styles.error}>{authError}</Text>}

        <TouchableOpacity
          style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          {authBusy ? (
            <ActivityIndicator color={COLORS.cream} />
          ) : (
            <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Log In' : 'Create Account'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={styles.switchModeText}>
            {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Log in'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  formContent: { padding: 24, paddingTop: 60, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', color: COLORS.ink },
  subtitle: { fontSize: 13, color: '#6E7A72', marginBottom: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: COLORS.fade,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.ink,
  },
  error: { color: COLORS.burgundy, fontSize: 13 },
  primaryButton: {
    backgroundColor: COLORS.wall, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: COLORS.cream, fontWeight: '600', fontSize: 15 },
  switchModeText: { color: COLORS.burgundy, textAlign: 'center', fontSize: 13, marginTop: 4 },
  loggedInCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 6 },
  email: { fontSize: 17, fontWeight: '600', color: COLORS.ink, marginTop: 8 },
  summary: { fontSize: 14, color: COLORS.burgundy, fontWeight: '600' },
  hint: { fontSize: 12, color: '#8A948C', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  secondaryButton: {
    borderWidth: 2, borderColor: COLORS.fade, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  secondaryButtonText: { color: COLORS.ink, fontWeight: '600' },
});
