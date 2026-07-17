"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const scope = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

type UseSpeechTranscriptionOptions = {
  enabled: boolean;
  speaker: string;
  onFinalTranscript: (text: string) => void | Promise<void>;
};

export function useSpeechTranscription({
  enabled,
  speaker,
  onFinalTranscript,
}: UseSpeechTranscriptionOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const enabledRef = useRef(enabled);
  const onFinalRef = useRef(onFinalTranscript);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterimText("");
  }, []);

  const start = useCallback(() => {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setSupported(false);
      setError("Live transcription is not supported in this browser.");
      return;
    }

    setSupported(true);
    setError(null);
    stop();

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim() ?? "";
        if (!transcript) continue;
        if (result.isFinal) {
          void onFinalRef.current(transcript);
          setInterimText("");
        } else {
          interim = transcript;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setError("Microphone permission is required for live transcription.");
      } else if (event.error !== "aborted") {
        setError("Transcription paused. Retrying…");
      }
    };

    recognition.onend = () => {
      setListening(false);
      if (enabledRef.current) {
        window.setTimeout(() => {
          if (!enabledRef.current) return;
          try {
            recognition.start();
            setListening(true);
          } catch {
            // Ignore restart races.
          }
        }, 350);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      setError("Unable to start live transcription.");
    }
  }, [stop]);

  useEffect(() => {
    if (!enabled) {
      startTransition(() => {
        stop();
      });
      return;
    }
    startTransition(() => {
      start();
    });
    return () => stop();
  }, [enabled, speaker, start, stop]);

  return {
    supported,
    listening,
    interimText,
    error,
  };
}
