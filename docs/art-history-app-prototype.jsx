import React, { useState } from "react";
import { Heart, Flame, Trophy, ChevronRight, X, Check, Landmark, Church, Palette, Sun, Sparkles, Building2, Lock, Star } from "lucide-react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
`;

const TOKENS = {
  wall: "#24322A",
  wallDeep: "#1A241E",
  gold: "#C9A227",
  goldLight: "#E4C766",
  cream: "#F7F4EC",
  ink: "#1E1B16",
  burgundy: "#7A2E3A",
  card: "#FFFFFF",
  fade: "#EFEAE0",
};

const ERAS = [
  { id: "ancient", name: "Antiquity", range: "3000 BCE – 400 CE", icon: Landmark, gradient: "linear-gradient(135deg,#B8935A,#8C6A3B)" },
  { id: "medieval", name: "Medieval", range: "500 – 1400", icon: Church, gradient: "linear-gradient(135deg,#6E5A8C,#453760)" },
  { id: "renaissance", name: "Renaissance", range: "1400 – 1600", icon: Sparkles, gradient: "linear-gradient(135deg,#C9A227,#8C6E1A)" },
  { id: "baroque", name: "Baroque", range: "1600 – 1750", icon: Building2, gradient: "linear-gradient(135deg,#7A2E3A,#4E1D25)" },
  { id: "impressionism", name: "Impressionism", range: "1860 – 1900", icon: Sun, gradient: "linear-gradient(135deg,#4C8C7A,#2E5A4C)" },
  { id: "modern", name: "Modern", range: "1900 – present", icon: Palette, gradient: "linear-gradient(135deg,#3B4A9C,#242F63)" },
];

const QUESTIONS = {
  ancient: [
    { prompt: "This armless figure, carved around 100 BCE, is displayed in the Louvre.", label: "Venus de Milo · Unknown sculptor", gradient: ERAS[0].gradient, options: ["Venus de Milo", "Nike of Samothrace", "The Discobolus", "Laocoön Group"], answer: 0 },
    { prompt: "Which civilization painted these figures using a strict rule of frontal torso, profile head?", label: "Tomb painting convention · Egyptian", gradient: ERAS[0].gradient, options: ["Minoan", "Egyptian", "Sumerian", "Mycenaean"], answer: 1 },
  ],
  medieval: [
    { prompt: "Flat gold backgrounds and elongated, solemn figures define this style, common in church icons.", label: "Byzantine icon painting", gradient: ERAS[1].gradient, options: ["Gothic", "Byzantine", "Romanesque", "Carolingian"], answer: 1 },
    { prompt: "Illuminated manuscripts like the Book of Kells were produced mainly in which setting?", label: "Monastic scriptorium", gradient: ERAS[1].gradient, options: ["Royal courts", "Guild workshops", "Monasteries", "Trading posts"], answer: 2 },
  ],
  renaissance: [
    { prompt: "This portrait's subtle smoke-like shading technique is called sfumato.", label: "Mona Lisa · Leonardo da Vinci", gradient: ERAS[2].gradient, options: ["Leonardo da Vinci", "Raphael", "Botticelli", "Titian"], answer: 0 },
    { prompt: "Painted directly on the Sistine Chapel ceiling between 1508–1512.", label: "Sistine Chapel Ceiling · Michelangelo", gradient: ERAS[2].gradient, options: ["Donatello", "Michelangelo", "Bramante", "Ghiberti"], answer: 1 },
  ],
  baroque: [
    { prompt: "Dramatic light-and-shadow contrast used by this painter is called tenebrism.", label: "Caravaggio's signature technique", gradient: ERAS[3].gradient, options: ["Chiaroscuro only", "Tenebrism", "Grisaille", "Impasto"], answer: 1 },
    { prompt: "This Dutch painter is famous for luminous domestic scenes like 'Girl with a Pearl Earring.'", label: "Girl with a Pearl Earring · Vermeer", gradient: ERAS[3].gradient, options: ["Rembrandt", "Frans Hals", "Johannes Vermeer", "Jan van Eyck"], answer: 2 },
  ],
  impressionism: [
    { prompt: "This 1872 harbor scene gave the whole movement its name.", label: "Impression, Sunrise · Claude Monet", gradient: ERAS[4].gradient, options: ["Edgar Degas", "Claude Monet", "Camille Pissarro", "Alfred Sisley"], answer: 1 },
    { prompt: "Impressionists broke tradition mainly by painting where?", label: "En plein air (outdoors)", gradient: ERAS[4].gradient, options: ["In royal courts", "Outdoors, on location", "From memory only", "In photographic studios"], answer: 1 },
  ],
  modern: [
    { prompt: "This 1937 mural responds to the bombing of a Basque town during the Spanish Civil War.", label: "Guernica · Pablo Picasso", gradient: ERAS[5].gradient, options: ["Guernica · Picasso", "The Scream · Munch", "Composition VII · Kandinsky", "Nighthawks · Hopper"], answer: 0 },
    { prompt: "This art movement, led by Dalí, painted dreamlike, irrational scenes.", label: "Surrealism", gradient: ERAS[5].gradient, options: ["Cubism", "Surrealism", "Futurism", "Fauvism"], answer: 1 },
  ],
};

function PhoneChrome({ children }) {
  return (
    <div style={{ background: TOKENS.ink, borderRadius: 44, padding: 10, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)" }}>
      <div style={{ background: TOKENS.cream, borderRadius: 34, overflow: "hidden", width: 360, height: 700, position: "relative", fontFamily: "'Inter',sans-serif" }}>
        {children}
      </div>
    </div>
  );
}

function TopBar({ hearts, xp, streak }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: TOKENS.cream, borderBottom: `1px solid ${TOKENS.fade}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: TOKENS.burgundy, fontWeight: 700 }}>
        <Flame size={18} fill={TOKENS.burgundy} /> <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14 }}>{streak}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: TOKENS.gold, fontWeight: 700 }}>
        <Star size={18} fill={TOKENS.gold} /> <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14 }}>{xp} XP</span>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <Heart key={i} size={18} fill={i < hearts ? TOKENS.burgundy : "none"} color={TOKENS.burgundy} strokeWidth={2} />
        ))}
      </div>
    </div>
  );
}

function PathScreen({ hearts, xp, streak, unlocked, onSelectEra }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <TopBar hearts={hearts} xp={xp} streak={streak} />
      <div style={{ flex: 1, overflowY: "auto", background: `radial-gradient(ellipse at top, ${TOKENS.wall}, ${TOKENS.wallDeep})`, padding: "28px 0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: 2, color: TOKENS.goldLight, textTransform: "uppercase" }}>The Gallery Path</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, color: TOKENS.cream, fontWeight: 600, marginTop: 4 }}>Six Rooms, One Story</div>
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ position: "absolute", top: 30, bottom: 30, width: 2, background: `linear-gradient(${TOKENS.goldLight}33, ${TOKENS.goldLight}88)`, left: "50%", transform: "translateX(-50%)" }} />
          {ERAS.map((era, i) => {
            const Icon = era.icon;
            const isUnlocked = i <= unlocked;
            const offset = i % 2 === 0 ? -46 : 46;
            return (
              <div key={era.id} style={{ transform: `translateX(${offset}px)`, zIndex: 1, margin: "10px 0" }}>
                <button
                  onClick={() => isUnlocked && onSelectEra(i)}
                  disabled={!isUnlocked}
                  style={{
                    width: 78, height: 78, borderRadius: "50%", border: `3px solid ${isUnlocked ? TOKENS.gold : "#4A5A50"}`,
                    background: isUnlocked ? era.gradient : "#33413A", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: isUnlocked ? "pointer" : "default", boxShadow: isUnlocked ? "0 8px 18px -6px rgba(0,0,0,0.6)" : "none", position: "relative",
                  }}
                >
                  {isUnlocked ? <Icon size={30} color="#fff" /> : <Lock size={22} color="#7C8A82" />}
                </button>
                <div style={{ textAlign: "center", marginTop: 8, width: 100, marginLeft: -11 }}>
                  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 13, color: isUnlocked ? TOKENS.cream : "#6E7A72" }}>{era.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: isUnlocked ? TOKENS.goldLight : "#5A655F" }}>{era.range}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuizScreen({ era, hearts, xp, streak, onFinish, onHeartLost }) {
  const questions = QUESTIONS[era.id];
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [localHearts, setLocalHearts] = useState(hearts);

  const q = questions[qIndex];
  const isAnswered = selected !== null;
  const isCorrect = selected === q.answer;

  function handleSelect(idx) {
    if (isAnswered) return;
    setSelected(idx);
    if (idx !== q.answer) {
      setLocalHearts((h) => Math.max(0, h - 1));
      onHeartLost();
    } else {
      setCorrectCount((c) => c + 1);
    }
  }

  function handleNext() {
    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
      setSelected(null);
    } else {
      onFinish(correctCount, questions.length);
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <TopBar hearts={localHearts} xp={xp} streak={streak} />
      <div style={{ padding: "10px 20px 0" }}>
        <div style={{ height: 6, borderRadius: 4, background: TOKENS.fade, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((qIndex) / questions.length) * 100}%`, background: TOKENS.gold, transition: "width .3s" }} />
        </div>
      </div>
      <div style={{ flex: 1, padding: "20px 20px 10px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: 1.5, color: TOKENS.burgundy, textTransform: "uppercase", marginBottom: 8 }}>
          Identify the work · {era.name}
        </div>
        <div style={{ borderRadius: 14, overflow: "hidden", border: `6px solid #fff`, boxShadow: "0 10px 24px -10px rgba(0,0,0,0.35)", marginBottom: 10 }}>
          <div style={{ height: 160, background: q.gradient, display: "flex", alignItems: "flex-end", padding: 10 }}>
            <div style={{ background: "rgba(0,0,0,0.35)", color: "#fff", fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace", padding: "3px 8px", borderRadius: 6 }}>
              {q.label}
            </div>
          </div>
        </div>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 16.5, color: TOKENS.ink, fontWeight: 500, lineHeight: 1.4, marginBottom: 16 }}>
          {q.prompt}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {q.options.map((opt, idx) => {
            let border = TOKENS.fade, bg = "#fff", color = TOKENS.ink;
            if (isAnswered && idx === q.answer) { border = "#3F7A56"; bg = "#EAF5EE"; color = "#245036"; }
            else if (isAnswered && idx === selected && idx !== q.answer) { border = TOKENS.burgundy; bg = "#FBEBEE"; color = TOKENS.burgundy; }
            return (
              <button key={idx} onClick={() => handleSelect(idx)}
                style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, border: `2px solid ${border}`, background: bg, color, fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600, cursor: isAnswered ? "default" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {opt}
                {isAnswered && idx === q.answer && <Check size={17} color="#3F7A56" />}
                {isAnswered && idx === selected && idx !== q.answer && <X size={17} color={TOKENS.burgundy} />}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ padding: "10px 20px 22px" }}>
        <button onClick={handleNext} disabled={!isAnswered}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: isAnswered ? TOKENS.wall : TOKENS.fade, color: isAnswered ? TOKENS.cream : "#B8B0A0", fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 15, cursor: isAnswered ? "pointer" : "default" }}>
          {qIndex + 1 < questions.length ? "Continue" : "Finish Room"}
        </button>
      </div>
    </div>
  );
}

function ResultScreen({ era, correct, total, xpGained, onContinue }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at top, ${TOKENS.wall}, ${TOKENS.wallDeep})`, padding: 30, textAlign: "center" }}>
      <div style={{ width: 90, height: 90, borderRadius: "50%", background: TOKENS.gold, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, boxShadow: "0 10px 30px -8px rgba(201,162,39,0.6)" }}>
        <Trophy size={44} color="#fff" />
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: 2, color: TOKENS.goldLight, textTransform: "uppercase" }}>Room complete</div>
      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, color: TOKENS.cream, fontWeight: 600, margin: "6px 0 4px" }}>{era.name}</div>
      <div style={{ color: "#B9C4BC", fontFamily: "'Inter',sans-serif", fontSize: 13.5, marginBottom: 22 }}>{correct} of {total} correct · +{xpGained} XP</div>
      <button onClick={onContinue} style={{ padding: "13px 30px", borderRadius: 12, border: `2px solid ${TOKENS.gold}`, background: "transparent", color: TOKENS.gold, fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        Back to path <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("path");
  const [eraIndex, setEraIndex] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [xp, setXp] = useState(120);
  const [streak, setStreak] = useState(4);
  const [lastResult, setLastResult] = useState({ correct: 0, total: 0, xpGained: 0 });

  const era = ERAS[eraIndex];

  function handleSelectEra(idx) {
    setEraIndex(idx);
    setHearts(3);
    setScreen("quiz");
  }

  function handleHeartLost() {}

  function handleFinish(correct, total) {
    const gained = correct * 15;
    setXp((x) => x + gained);
    setUnlocked((u) => Math.max(u, eraIndex + 1 < ERAS.length ? eraIndex + 1 : eraIndex));
    setLastResult({ correct, total, xpGained: gained });
    setScreen("result");
  }

  return (
    <>
      <style>{FONTS}{`* { box-sizing: border-box; } button { font: inherit; }`}</style>
      <div style={{ display: "flex", justifyContent: "center", padding: 30, background: "#0000", minHeight: 700 }}>
        <PhoneChrome>
          {screen === "path" && <PathScreen hearts={hearts} xp={xp} streak={streak} unlocked={unlocked} onSelectEra={handleSelectEra} />}
          {screen === "quiz" && <QuizScreen era={era} hearts={hearts} xp={xp} streak={streak} onFinish={handleFinish} onHeartLost={handleHeartLost} />}
          {screen === "result" && <ResultScreen era={era} correct={lastResult.correct} total={lastResult.total} xpGained={lastResult.xpGained} onContinue={() => setScreen("path")} />}
        </PhoneChrome>
      </div>
    </>
  );
}
