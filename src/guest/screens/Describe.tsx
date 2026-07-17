import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { BackLink, ErrorBanner, TwoBeat } from "../components";

const QUICK_CHIPS = ["Add our team name", "Vintage", "Bold & simple", "Line art", "Add a date"];

// Minimal typing for the (webkit-prefixed) Web Speech API.
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

interface Props {
  error: string | null;
  onGenerate: (prompt: string) => void;
  onBack: () => void;
}

export default function Describe({ error, onGenerate, onBack }: Props) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const SpeechCtor = useRef(getSpeechRecognition()).current;

  useEffect(() => () => recRef.current?.stop(), []);

  const toggleMic = () => {
    if (!SpeechCtor) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join(" ");
      setText(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const addChip = (chip: string) => {
    setText((t) => (t.trim() ? `${t.trim()}, ${chip.toLowerCase()}` : chip));
  };

  return (
    <div className="flex flex-col gap-6 pt-4">
      <TwoBeat a="Say It." b="See It." />
      <ErrorBanner message={error} />

      {SpeechCtor && (
        <button
          onClick={toggleMic}
          className={`mx-auto rounded-full p-8 border-4 transition ${
            listening
              ? "bg-gold text-ink border-gold-soft animate-pulse"
              : "bg-navy-mid text-gold border-gold/40 hover:border-gold"
          }`}
          aria-label={listening ? "Stop listening" : "Start voice input"}
        >
          {listening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
        </button>
      )}
      {listening && <p className="text-center text-muted text-sm -mt-3">Listening… tap to stop</p>}

      <textarea
        className="input-field min-h-[110px] text-lg"
        placeholder="Type your idea… e.g. 'a vintage biplane over mountains'"
        value={text}
        maxLength={600}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex flex-wrap gap-2 justify-center">
        {QUICK_CHIPS.map((chip) => (
          <button key={chip} className="chip" onClick={() => addChip(chip)}>
            {chip}
          </button>
        ))}
      </div>

      <button className="btn-primary" disabled={!text.trim()} onClick={() => onGenerate(text.trim())}>
        Create My Design →
      </button>
      <BackLink onClick={onBack} />
    </div>
  );
}
