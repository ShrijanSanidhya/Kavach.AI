import React from 'react';
import { useVoice } from '../hooks/useVoice.js';

export default function VoiceInput({ onCallSubmit }) {
  const {
    transcript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    clearTranscript
  } = useVoice();

  if (!isSupported) {
    return (
      <div className="text-center text-slate-500 text-xs py-2">
        Voice not supported in this browser
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!isListening && !transcript && (
        <button 
          onClick={startListening}
          className="w-full border border-slate-600 rounded-lg py-2 bg-navy-700 hover:bg-navy-600 text-sm text-slate-300 font-bold transition-colors"
        >
          🎤 Speak a 911 Call
        </button>
      )}

      {isListening && (
        <div className="flex flex-col gap-2">
          <button 
            onClick={stopListening}
            className="w-full border border-red-500 rounded-lg py-2 bg-red-900/30 animate-pulse text-sm text-white font-bold"
          >
            🔴 Recording... click to stop
          </button>
          <div className="text-xs text-slate-400 italic line-clamp-2 h-8 px-1">
            "{transcript || "..."}"
          </div>
        </div>
      )}

      {!isListening && transcript && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-slate-300 italic px-1 break-words">
            "{transcript.length > 80 ? transcript.substring(0, 80) + '...' : transcript}"
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                onCallSubmit(transcript);
                clearTranscript();
              }}
              className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-lg transition-colors"
            >
              ✓ Submit Call
            </button>
            <button 
              onClick={clearTranscript}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold py-2 rounded-lg transition-colors"
            >
              ✕ Discard
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-xs text-center font-bold">
          {error}
        </div>
      )}
    </div>
  );
}
