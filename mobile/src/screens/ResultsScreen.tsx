import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ERAS } from '../content';
import type { PathStackParamList } from '../navigation/types';
import { COLORS } from '../theme';

type Props = NativeStackScreenProps<PathStackParamList, 'Results'>;

export function ResultsScreen({ route, navigation }: Props) {
  const { eraId, correct, total, xpGained } = route.params;
  const era = ERAS.find((e) => e.id === eraId)!;

  return (
    <LinearGradient colors={[COLORS.wall, COLORS.wallDeep]} style={styles.screen}>
      <View style={styles.trophyCircle}>
        <Ionicons name="trophy" size={44} color="#fff" />
      </View>
      <Text style={styles.eyebrow}>Room complete</Text>
      <Text style={styles.eraName}>{era.name}</Text>
      <Text style={styles.summary}>
        {correct} of {total} correct · +{xpGained} XP
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.popToTop()}>
        <Text style={styles.buttonText}>Back to path</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.gold} />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  trophyCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  eyebrow: { fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: COLORS.goldLight, textTransform: 'uppercase' },
  eraName: { fontSize: 24, color: COLORS.cream, fontWeight: '600', marginVertical: 6 },
  summary: { color: '#B9C4BC', fontSize: 13.5, marginBottom: 22 },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 30,
    borderRadius: 12, borderWidth: 2, borderColor: COLORS.gold,
  },
  buttonText: { color: COLORS.gold, fontWeight: '600', fontSize: 14.5 },
});
