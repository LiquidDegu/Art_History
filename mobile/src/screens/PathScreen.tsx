import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TopBar } from '../components/TopBar';
import { ERAS } from '../content';
import type { PathStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { COLORS, ERA_COLORS } from '../theme';

type Props = NativeStackScreenProps<PathStackParamList, 'Path'>;

const NODE_ICONS = {
  ancient: 'business' as const,
  medieval: 'business-outline' as const,
  renaissance: 'sparkles' as const,
  baroque: 'business' as const,
  impressionism: 'sunny' as const,
  modern: 'color-palette' as const,
};

export function PathScreen({ navigation }: Props) {
  const { hearts, xp, streak, unlockedIndex, progress } = useAppState();

  return (
    <View style={styles.screen}>
      <TopBar hearts={hearts} xp={xp} streak={streak} />
      <LinearGradient colors={[COLORS.wall, COLORS.wallDeep]} style={styles.wall}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>The Gallery Path</Text>
            <Text style={styles.title}>Six Rooms, One Story</Text>
          </View>
          <View style={styles.path}>
            <LinearGradient
              colors={[`${COLORS.goldLight}33`, `${COLORS.goldLight}88`]}
              style={styles.connectingLine}
              pointerEvents="none"
            />
            {ERAS.map((era, i) => {
              const isUnlocked = i <= unlockedIndex;
              const isCompleted = !!progress[era.id]?.completed;
              const offset = i % 2 === 0 ? -46 : 46;
              const [from, to] = ERA_COLORS[era.id];
              return (
                <View key={era.id} style={[styles.nodeWrap, { transform: [{ translateX: offset }] }]}>
                  <TouchableOpacity
                    disabled={!isUnlocked}
                    onPress={() => navigation.navigate('Quiz', { eraId: era.id })}
                    activeOpacity={0.8}
                  >
                    {isUnlocked ? (
                      <LinearGradient colors={[from, to]} style={[styles.node, styles.nodeUnlocked]}>
                        <Ionicons name={NODE_ICONS[era.id]} size={30} color="#fff" />
                        {isCompleted && (
                          <View style={styles.completedBadge}>
                            <Ionicons name="checkmark" size={13} color="#fff" />
                          </View>
                        )}
                      </LinearGradient>
                    ) : (
                      <View style={[styles.node, styles.nodeLocked]}>
                        <Ionicons name="lock-closed" size={22} color="#7C8A82" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.nodeLabel}>
                    <Text style={[styles.nodeName, !isUnlocked && styles.nodeNameLocked]}>{era.name}</Text>
                    <Text style={[styles.nodeRange, !isUnlocked && styles.nodeRangeLocked]}>{era.range}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  wall: { flex: 1 },
  scrollContent: { paddingVertical: 28, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 26 },
  eyebrow: { fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: COLORS.goldLight, textTransform: 'uppercase' },
  title: { fontSize: 22, color: COLORS.cream, fontWeight: '600', marginTop: 4 },
  path: { alignItems: 'center', gap: 6, position: 'relative' },
  connectingLine: { position: 'absolute', top: 30, bottom: 30, left: '50%', width: 2, marginLeft: -1 },
  nodeWrap: { alignItems: 'center', marginVertical: 10, zIndex: 1 },
  node: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center' },
  nodeUnlocked: { borderWidth: 3, borderColor: COLORS.gold },
  completedBadge: {
    position: 'absolute', top: -2, right: -2, width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.wallDeep,
  },
  nodeLocked: { backgroundColor: '#33413A', borderWidth: 3, borderColor: '#4A5A50' },
  nodeLabel: { alignItems: 'center', marginTop: 8, width: 110 },
  nodeName: { fontSize: 13, fontWeight: '600', color: COLORS.cream },
  nodeNameLocked: { color: '#6E7A72' },
  nodeRange: { fontFamily: 'monospace', fontSize: 9.5, color: COLORS.goldLight },
  nodeRangeLocked: { color: '#5A655F' },
});
