import type { Ionicons } from '@expo/vector-icons';
import { Ionicons as Icon } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArtworkCard } from '../components/ArtworkCard';
import { TopBar } from '../components/TopBar';
import { ERAS, getArtwork, getQuestionsByEra } from '../content';
import type { PathStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { COLORS } from '../theme';

type Props = NativeStackScreenProps<PathStackParamList, 'Quiz'>;

export function QuizScreen({ route, navigation }: Props) {
  const { eraId } = route.params;
  const era = ERAS.find((e) => e.id === eraId)!;
  const questions = useMemo(() => getQuestionsByEra(eraId), [eraId]);
  const { hearts, xp, streak, resetHearts, loseHeart, completeRoom, logQuestionAnswered, enterQuiz, exitQuiz } =
    useAppState();

  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const questionStartRef = useRef(Date.now());

  useEffect(() => {
    resetHearts();
    // Reset hearts once, when entering a room — matches Section 2's
    // "hearts start at 3 per room attempt" (Section 6).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => exitQuiz, [exitQuiz]);

  const question = questions[qIndex];
  const artwork = getArtwork(question.artworkId)!;
  const isAnswered = selected !== null;
  const isLast = qIndex + 1 >= questions.length;

  useEffect(() => {
    questionStartRef.current = Date.now();
    enterQuiz(eraId, artwork.id);
  }, [eraId, artwork.id, enterQuiz]);

  function handleSelect(idx: number) {
    if (isAnswered) return;
    setSelected(idx);
    const correct = idx === question.correctIndex;
    logQuestionAnswered(eraId, artwork.id, correct, Date.now() - questionStartRef.current);
    if (correct) {
      setCorrectCount((c) => c + 1);
    } else {
      loseHeart();
      if (hearts - 1 <= 0) setOutOfHearts(true);
    }
  }

  async function handleNext() {
    if (submitting) return;
    if (outOfHearts) {
      exitQuiz();
      navigation.popToTop();
      return;
    }
    if (isLast) {
      setSubmitting(true);
      const xpGained = await completeRoom(eraId, correctCount, questions.length);
      exitQuiz();
      navigation.replace('Results', { eraId, correct: correctCount, total: questions.length, xpGained });
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
    }
  }

  return (
    <View style={styles.screen}>
      <TopBar hearts={hearts} xp={xp} streak={streak} />
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(qIndex / questions.length) * 100}%` }]} />
      </View>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>Identify the work · {era.name}</Text>
        <ArtworkCard artwork={artwork} eraId={eraId} />
        <Text style={styles.prompt}>{question.prompt}</Text>
        <View style={styles.options}>
          {question.options.map((opt, idx) => {
            const isCorrectOpt = idx === question.correctIndex;
            const isSelectedOpt = idx === selected;
            let style = styles.option;
            let textStyle = styles.optionText;
            let icon: React.ComponentProps<typeof Ionicons>['name'] | null = null;
            if (isAnswered && isCorrectOpt) {
              style = { ...styles.option, ...styles.optionCorrect };
              textStyle = { ...styles.optionText, color: COLORS.successText };
              icon = 'checkmark';
            } else if (isAnswered && isSelectedOpt && !isCorrectOpt) {
              style = { ...styles.option, ...styles.optionWrong };
              textStyle = { ...styles.optionText, color: COLORS.burgundy };
              icon = 'close';
            }
            return (
              <TouchableOpacity
                key={idx}
                style={style}
                disabled={isAnswered}
                onPress={() => handleSelect(idx)}
                activeOpacity={0.8}
              >
                <Text style={textStyle}>{opt}</Text>
                {icon && <Icon name={icon} size={17} color={isCorrectOpt ? COLORS.success : COLORS.burgundy} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, (!isAnswered || submitting) && styles.continueButtonDisabled]}
          disabled={!isAnswered || submitting}
          onPress={handleNext}
        >
          <Text style={[styles.continueText, (!isAnswered || submitting) && styles.continueTextDisabled]}>
            {submitting ? 'Saving…' : outOfHearts ? 'Exit Room (Out of Hearts)' : isLast ? 'Finish Room' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  progressTrack: { height: 6, borderRadius: 4, backgroundColor: COLORS.fade, marginHorizontal: 20, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.gold },
  body: { flex: 1, padding: 20, gap: 10 },
  eyebrow: { fontFamily: 'monospace', fontSize: 10.5, letterSpacing: 1.5, color: COLORS.burgundy, textTransform: 'uppercase' },
  prompt: { fontSize: 16.5, color: COLORS.ink, fontWeight: '500', lineHeight: 22, marginBottom: 6 },
  options: { gap: 9 },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2,
    borderColor: COLORS.fade, backgroundColor: '#fff',
  },
  optionCorrect: { borderColor: COLORS.success, backgroundColor: COLORS.successBg },
  optionWrong: { borderColor: COLORS.burgundy, backgroundColor: COLORS.errorBg },
  optionText: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  footer: { padding: 20 },
  continueButton: { paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.wall, alignItems: 'center' },
  continueButtonDisabled: { backgroundColor: COLORS.fade },
  continueText: { color: COLORS.cream, fontWeight: '600', fontSize: 15 },
  continueTextDisabled: { color: '#B8B0A0' },
});
