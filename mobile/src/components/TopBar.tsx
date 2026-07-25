import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme';

interface Props {
  hearts: number;
  xp: number;
  streak: number;
  maxHearts?: number;
}

export function TopBar({ hearts, xp, streak, maxHearts = 3 }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Ionicons name="flame" size={18} color={COLORS.burgundy} />
        <Text style={[styles.statText, { color: COLORS.burgundy }]}>{streak}</Text>
      </View>
      <View style={styles.stat}>
        <Ionicons name="star" size={18} color={COLORS.gold} />
        <Text style={[styles.statText, { color: COLORS.gold }]}>{xp} XP</Text>
      </View>
      <View style={styles.hearts}>
        {Array.from({ length: maxHearts }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < hearts ? 'heart' : 'heart-outline'}
            size={18}
            color={COLORS.burgundy}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: COLORS.cream,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.fade,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontWeight: '700', fontSize: 14 },
  hearts: { flexDirection: 'row', gap: 3 },
});
