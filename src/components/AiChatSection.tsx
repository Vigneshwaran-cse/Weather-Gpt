import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  ArrowLeft,
  Loader2,
  Mic,
  MicOff,
  AlertCircle,
  Navigation,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { LocationData, ChatMessage } from '../types';
import { sendChatMessage, transcribeAudioApi } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Removes any remaining technical labels, data dumps, or timestamps from conversational bubbles.
 */
function sanitizeChatText(text: string): string {
  if (!text) return '';
  let cleaned = text;
  cleaned = cleaned.replace(/^[*\s]*(?:Source|Data source|Weather data source)[\s:*].*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*(?:Updated|Last updated|Retrieved at|Observed at)[\s:*].*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*(?:🛠️\s*)?(?:Grounding|Grounding status|Debug|Telemetry)[\s:*].*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*[🌧️🌦️]*\s*(?:Rain probability|Precipitation probability|बारिश की संभावना|மழை வாய்ப்பு|వర్షం అవకాశం|മഴ സാധ്യത|ಮಳೆಯ ಸಾಧ್ಯತೆ|पावसाची शक्यता)[\s:*]+[0-9]+%[\s*]*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*[💨🍃]*\s*(?:Wind|Wind speed|हवा|காற்று|గాలి|കാറ്റ്|ಗಾಳಿ|वारे)[\s:*]+[0-9.]+\s*(?:km\/h|kts|m\/s)[\s*]*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*[🌤️☁️☀️]*\s*(?:Conditions|Condition|मौसम की स्थिति|வானிலை நிலை|పరిస్థితి|അവസ്ഥ|ಹವಾಮಾನ ಸ್ಥಿತಿ|हवामानाची स्थिती)[\s:*]+.*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*[🌡️]*\s*(?:Temperature|तापमान|வெப்பநிலை|ఉష్ణోగ్రత|താപനില|ತಾಪಮಾನ|तापमान)[\s:*]+[0-9.]+\s*°C\s*\([^)]*\)[\s*]*$/gim, '');
  cleaned = cleaned.replace(/\s*\([Ff]eels like\s+[0-9.]+°?C?\)/g, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

interface AiChatSectionProps {
  currentLocation: LocationData;
  onLocationDetectedInChat?: (newLoc: LocationData) => void;
  onOpenRoutePlanner?: (origin?: string, destination?: string) => void;
  onGoBack?: () => void;
  onFarmerModeClick?: () => void;
}

export const AiChatSection: React.FC<AiChatSectionProps> = ({
  currentLocation,
  onLocationDetectedInChat,
  onOpenRoutePlanner,
  onGoBack,
  onFarmerModeClick,
}) => {
  const { t, language, speechCode } = useLanguage();

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: t('welcomeMessage', { location: currentLocation.name }),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      locationName: currentLocation.name,
    },
  ]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDebugIds, setExpandedDebugIds] = useState<Record<string, boolean>>({});

  // Developer debugging mode is only active when explicitly requested via ?debug=true in the URL
  const isDevMode = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('debug') === 'true' ||
    window.localStorage.getItem('weathergpt_dev_mode') === 'true'
  );

  // Conversation context tracking
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [lastTimeframe, setLastTimeframe] = useState<string | null>(null);
  const [lastTimeOfDay, setLastTimeOfDay] = useState<string | null>(null);
  const [deviceCoords, setDeviceCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {},
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  // Voice state: dual-engine supporting native SpeechRecognition + Gemini audio fallback
  type MicButtonState = 'idle' | 'requesting' | 'listening' | 'transcribing' | 'error';
  const [micState, setMicState] = useState<MicButtonState>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isListeningRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const baseInputRef = useRef<string>('');
  const activeTranscriptRef = useRef<string>('');

  // Speech synthesis & Live Voice Mode state
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState<boolean>(false);
  const isVoiceModeRef = useRef<boolean>(false);
  isVoiceModeRef.current = isVoiceMode;
  const sentViaVoiceRef = useRef<boolean>(false);
  const handleSendRef = useRef<(text?: string, isVoice?: boolean) => Promise<void>>(null as any);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Text-To-Speech implementation with authentic language voices
  const handleSpeakMessage = useCallback(
    (id: string, text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      if (speakingMsgId === id) {
        window.speechSynthesis.cancel();
        setSpeakingMsgId(null);
        return;
      }

      window.speechSynthesis.cancel();
      setSpeakingMsgId(id);

      // Clean text for speech: strip markdown, bullet markers, and emojis for natural pronunciation
      const clean = text
        .replace(/[*\-_#`~]/g, '')
        .replace(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
          ''
        )
        .trim();

      if (!clean) {
        setSpeakingMsgId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      const speechCodeMap: Record<string, string> = {
        en: 'en-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        ml: 'ml-IN',
        kn: 'kn-IN',
        mr: 'mr-IN',
      };
      const targetCode = speechCodeMap[language] || 'en-IN';
      utterance.lang = targetCode;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const match =
          voices.find((v) => v.lang.toLowerCase() === targetCode.toLowerCase()) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(targetCode.split('-')[0].toLowerCase())) ||
          voices.find((v) => v.lang.includes('IN')) ||
          voices[0];
        if (match) {
          utterance.voice = match;
        }
      }

      utterance.onend = () => {
        setSpeakingMsgId(null);
      };
      utterance.onerror = () => {
        setSpeakingMsgId(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [language, speakingMsgId]
  );

  const handleStopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  }, []);

  const handleToggleVoiceMode = () => {
    const nextState = !isVoiceMode;
    setIsVoiceMode(nextState);
    if (nextState) {
      if (micState === 'idle') {
        handleMicClick();
      }
    } else {
      handleStopSpeaking();
    }
  };

  // Sync greeting on location change
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id.startsWith('welcome')) {
        return [
          {
            ...prev[0],
            text: t('welcomeMessage', { location: currentLocation.name }),
            locationName: currentLocation.name,
          },
        ];
      }
      return prev;
    });
  }, [language, currentLocation.name, t]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Cleanup all audio/speech listeners on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch {}
      }
    };
  }, []);

  const handleMicClick = useCallback(async () => {
    console.log('[Voice] Microphone button clicked, current state:', micState);

    // 1. If currently listening, transcribing, or recording: stop immediately and return to idle
    if (isListeningRef.current || micState === 'listening' || micState === 'transcribing') {
      console.log('[Voice] Stopping active voice recognition/recording');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch {}
        mediaStreamRef.current = null;
      }
      isListeningRef.current = false;
      isStartingRef.current = false;
      setMicState('idle');
      setStatusMessage(null);
      return;
    }

    // 2. Prevent duplicate starts while initializing
    if (isStartingRef.current) {
      console.log('[Voice] Voice initialization already in progress, resetting');
      isStartingRef.current = false;
      setMicState('idle');
      return;
    }

    isStartingRef.current = true;
    setSpeechError(null);
    setStatusMessage(null);

    const SpeechRecognition =
      (typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;

    // Helper: Fallback to MediaRecorder + Gemini Multimodal Audio transcription
    const startMediaRecorderFallback = async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Microphone access is not supported in this browser.');
        }

        setMicState('requesting');
        setStatusMessage(t('requestingMic') || 'Connecting to microphone...');

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const mimeType =
          typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          console.log('[Voice] MediaRecorder stopped, preparing audio for transcription');
          isListeningRef.current = false;
          setMicState('transcribing');
          setStatusMessage(t('transcribingSpeech') || 'Transcribing speech...');

          // Stop all audio hardware tracks
          stream.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;

          const audioBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });

          if (audioBlob.size < 200) {
            setMicState('idle');
            setStatusMessage(null);
            return;
          }

          try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Data = (reader.result as string)?.split(',')[1];
              if (!base64Data) {
                setMicState('idle');
                setStatusMessage(null);
                return;
              }

              try {
                const transcript = await transcribeAudioApi(
                  base64Data,
                  recorder.mimeType || 'audio/webm',
                  language || 'en'
                );

                if (transcript && transcript.trim()) {
                  const cleaned = transcript.trim();
                  setInput('');
                  setStatusMessage(`"${cleaned}"`);
                  setTimeout(() => setStatusMessage(null), 2500);
                  if (handleSendRef.current) {
                    handleSendRef.current(cleaned, true);
                  }
                }
              } catch (transcribeErr: any) {
                console.warn('[Voice] Server transcription error:', transcribeErr);
                setSpeechError(t('micGenericError') || 'Speech could not be transcribed. Please type your question.');
              } finally {
                setMicState('idle');
              }
            };
          } catch {
            setMicState('idle');
            setStatusMessage(null);
          }
        };

        recorder.start(250);
        isListeningRef.current = true;
        isStartingRef.current = false;
        setMicState('listening');
        setStatusMessage(t('listeningActive') || 'Listening... Speak your weather question');

        // Automatically stop recording after 8 seconds of speech
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, 8000);
      } catch (err: any) {
        console.warn('[Voice] MediaRecorder fallback failed:', err);
        isListeningRef.current = false;
        isStartingRef.current = false;
        setMicState('error');
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setSpeechError(t('micBlockedMessage') || 'Microphone access is blocked. Allow microphone access in your browser settings.');
        } else {
          setSpeechError(t('micGenericError') || 'Microphone access could not be initialized. You can still type your question.');
        }
      }
    };

    // If native Web Speech API is not available, immediately fall back to MediaRecorder
    if (!SpeechRecognition) {
      console.log('[Voice] Native SpeechRecognition not available in this browser, using MediaRecorder fallback');
      await startMediaRecorderFallback();
      return;
    }

    // Native Web Speech API path
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = speechCode || 'en-IN';

      baseInputRef.current = input.trim() ? `${input.trim()} ` : '';

      recognition.onstart = () => {
        console.log('[Voice] Native SpeechRecognition onstart');
        isListeningRef.current = true;
        isStartingRef.current = false;
        setMicState('listening');
        setSpeechError(null);
        setStatusMessage(t('listeningActive') || 'Listening... Speak your weather question');
      };

      recognition.onspeechstart = () => {
        setMicState('transcribing');
        setStatusMessage(t('listeningShort') || 'Listening...');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        if (transcript) {
          activeTranscriptRef.current = transcript;
          setInput(baseInputRef.current + transcript);
          setStatusMessage(`"${transcript}"`);
        }
      };

      recognition.onerror = async (event: any) => {
        console.warn('[Voice] Native SpeechRecognition error:', event.error);
        isListeningRef.current = false;
        isStartingRef.current = false;

        if (event.error === 'no-speech' || event.error === 'aborted') {
          setMicState('idle');
          setStatusMessage(null);
          return;
        }

        // If network, audio-capture, not-allowed, or service error occurs, seamlessly try MediaRecorder fallback
        if (
          event.error === 'network' ||
          event.error === 'audio-capture' ||
          event.error === 'service-not-allowed' ||
          event.error === 'not-allowed'
        ) {
          console.log('[Voice] Native speech error, switching to MediaRecorder fallback');
          await startMediaRecorderFallback();
          return;
        }

        setMicState('error');
        setSpeechError(`${t('micGenericError')} (${event.error})`);
      };

      recognition.onend = () => {
        console.log('[Voice] Native SpeechRecognition ended');
        isListeningRef.current = false;
        isStartingRef.current = false;
        setMicState('idle');
        setStatusMessage(null);
        inputRef.current?.focus();

        const spoken = activeTranscriptRef.current.trim();
        if (spoken.length >= 2) {
          activeTranscriptRef.current = '';
          if (handleSendRef.current) {
            handleSendRef.current(spoken, true);
          }
        }
      };

      setMicState('requesting');
      setStatusMessage(t('requestingMic') || 'Connecting to microphone...');
      recognition.start();
    } catch (err: any) {
      console.warn('[Voice] Failed to start native SpeechRecognition, switching to MediaRecorder:', err);
      await startMediaRecorderFallback();
    }
  }, [micState, speechCode, input, language, t]);

  const handleToggleListening = handleMicClick;

  const handleRetryVoice = useCallback(() => {
    setSpeechError(null);
    setMicState('idle');
    isListeningRef.current = false;
    isStartingRef.current = false;
    setTimeout(() => {
      handleMicClick();
    }, 50);
  }, [handleMicClick]);

  const handleSend = async (customText?: string, isVoiceInput?: boolean) => {
    const textToSend = (customText !== undefined ? customText : input).trim();
    if (!textToSend || isProcessing) return;

    if (isVoiceInput) {
      sentViaVoiceRef.current = true;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    isListeningRef.current = false;
    isStartingRef.current = false;
    setMicState('idle');
    setStatusMessage(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    setStatusStep(t('processing') || 'Processing...');

    try {
      const recentHistory = [...messages, userMessage].slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const data = await sendChatMessage(
        textToSend,
        currentLocation,
        language,
        lastLocation || undefined,
        lastActivity || undefined,
        deviceCoords || undefined,
        recentHistory,
        lastTimeframe || undefined,
        lastTimeOfDay || undefined
      );

      if (data.intent?.activity) {
        setLastActivity(data.intent.activity);
      }
      if (data.intent?.timeframe) {
        setLastTimeframe(data.intent.timeframe);
      }
      if (data.intent?.timeOfDay) {
        setLastTimeOfDay(data.intent.timeOfDay);
      }
      if (data.location) {
        setLastLocation(data.location);
      }

      if (data.location && data.location.name !== currentLocation.name && onLocationDetectedInChat) {
        onLocationDetectedInChat(data.location);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || 'Open-Meteo',
        forecastModel: data.forecastModel || 'ECMWF IFS / NOAA GFS',
        updated: data.updated,
        locationName: data.location?.name || currentLocation.name,
        routeAction: data.routeAction,
        debug: data.debug,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If user is in Voice Mode or submitted question via voice, speak reply out loud!
      if (isVoiceModeRef.current || sentViaVoiceRef.current) {
        handleSpeakMessage(assistantMessage.id, data.reply);
        sentViaVoiceRef.current = false;
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: err.message || t('weatherError') || 'Unable to retrieve live weather data.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Open-Meteo',
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setStatusStep('');
    }
  };

  handleSendRef.current = handleSend;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setLastLocation(null);
    setLastActivity(null);
    setLastTimeframe(null);
    setLastTimeOfDay(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: t('chatCleared', { location: currentLocation.name }),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Open-Meteo',
        locationName: currentLocation.name,
      },
    ]);
  };

  const toggleDebugExpand = (id: string) => {
    setExpandedDebugIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const dynamicQuickPrompts = [
    t('quickPrompt1'),
    t('quickPrompt2'),
    t('quickPrompt3'),
    t('quickPrompt4'),
    t('quickPrompt5'),
  ];

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden rounded-2xl bg-slate-900/85 border border-slate-800/90 shadow-xl backdrop-blur-xl">
      {/* 1. Chatbot Header: Voice Mode toggle on the LEFT, Back button on the RIGHT */}
      <div className="shrink-0 px-3 py-1.5 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex items-center justify-between min-h-[40px]">
        <div className="flex items-center gap-1.5">
          {/* Live Voice Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleVoiceMode}
            className={`h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs ${
              isVoiceMode
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-300 ring-1 ring-sky-400/40'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Toggle Live Voice Mode: AI will speak responses out loud"
          >
            <Radio className={`w-3 h-3 ${isVoiceMode ? 'text-sky-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Voice Mode: {isVoiceMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Stop audio playback button if speaking */}
          {speakingMsgId && (
            <button
              type="button"
              onClick={handleStopSpeaking}
              className="h-7 px-2 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-medium flex items-center gap-1 cursor-pointer animate-pulse"
              title="Stop audio playback"
            >
              <VolumeX className="w-3 h-3 text-rose-400" />
              <span>Stop</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onFarmerModeClick && (
            <button
              type="button"
              onClick={onFarmerModeClick}
              className="h-7 px-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Open Farmer Mode"
            >
              <span>🌾</span>
              <span>Farmer Mode</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGoBack}
            className="h-7 px-2.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
            aria-label={t('back')}
            title={t('back')}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-200" />
            <span className="text-xs font-medium text-slate-300">{t('back')}</span>
          </button>
        </div>
      </div>

      {/* 2. Messages Container (ONLY this container scrolls internally!) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2.5 scrollbar-none">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isDebugExpanded = !!expandedDebugIds[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex gap-2 max-w-[94%] animate-msg-in ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-semibold shadow-xs ${
                  isUser
                    ? 'bg-gradient-to-tr from-sky-500 to-blue-600 text-white'
                    : msg.isError
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-sky-400'
                }`}
              >
                {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              </div>

              <div
                className={`relative rounded-2xl p-2.5 text-xs shadow-xs group ${
                  isUser
                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-tr-xs'
                    : msg.isError
                    ? 'bg-rose-950/40 border border-rose-500/40 text-rose-200 rounded-tl-xs'
                    : 'bg-slate-800/90 border border-slate-700/60 text-slate-100 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                  {sanitizeChatText(msg.text).split('\n\n').map((paragraph, pIdx) => {
                    const isBullet = paragraph.trim().startsWith('-') || paragraph.trim().startsWith('•');
                    return (
                      <p
                        key={pIdx}
                        className={isBullet ? 'pl-2 border-l-2 border-sky-400/50' : ''}
                      >
                        {paragraph}
                      </p>
                    );
                  })}
                </div>

                {/* Route Action Button if present */}
                {msg.routeAction && onOpenRoutePlanner && (
                  <div className="mt-2 pt-1.5 border-t border-slate-700/60">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenRoutePlanner(
                          msg.routeAction?.origin,
                          msg.routeAction?.destination
                        )
                      }
                      className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-[11px] shadow-xs cursor-pointer"
                    >
                      <Navigation className="w-3 h-3 text-slate-950" />
                      <span>{t('openInRoutePlanner')}</span>
                    </button>
                  </div>
                )}

                {/* Developer Debug Details - strictly isolated to developer mode (?debug=true) */}
                {isDevMode && msg.debug && (
                  <div className="mt-1.5 pt-1 border-t border-slate-700/60 text-[9px] font-mono">
                    <button
                      type="button"
                      onClick={() => toggleDebugExpand(msg.id)}
                      className="w-full flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-900/80 text-amber-300 border border-amber-500/30 cursor-pointer"
                    >
                      <span>🛠️ Debug: {msg.debug.detectedLocation}</span>
                      {isDebugExpanded ? (
                        <ChevronUp className="w-2.5 h-2.5 text-amber-400" />
                      ) : (
                        <ChevronDown className="w-2.5 h-2.5 text-amber-400" />
                      )}
                    </button>

                    {isDebugExpanded && (
                      <div className="mt-1 p-1.5 rounded bg-slate-950/80 border border-slate-700 space-y-0.5 text-slate-300">
                        <div>Intent: {msg.debug.detectedIntent}</div>
                        {msg.debug.activity && <div>Activity: {msg.debug.activity}</div>}
                        <div>Location: {msg.debug.weatherApiLocation}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer time & copy */}
                <div
                  className={`mt-1.5 pt-1 border-t flex items-center justify-between text-[9px] ${
                    isUser ? 'border-sky-500/30 text-sky-100' : 'border-slate-700/40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{msg.timestamp}</span>
                    {!isUser && !msg.isError && (
                      <span className="text-[8px] font-mono text-slate-400 bg-slate-900/60 px-1 py-0.2 rounded border border-slate-700/40">
                        {msg.forecastModel ? msg.forecastModel.split('(')[0].trim() : 'ECMWF/GFS'} · {msg.source || 'Open-Meteo'}
                      </span>
                    )}
                  </div>

                  {!isUser && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSpeakMessage(msg.id, msg.text)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                          speakingMsgId === msg.id
                            ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/50'
                            : 'hover:text-white text-slate-400'
                        }`}
                        title={speakingMsgId === msg.id ? 'Stop audio' : 'Listen to forecast'}
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="w-2.5 h-2.5 text-sky-400 animate-pulse" />
                            <span className="text-[8px] font-medium text-sky-300">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-2.5 h-2.5" />
                            <span className="text-[8px] font-medium">Listen</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="flex items-center gap-1 hover:text-white p-0.5 cursor-pointer"
                        title={t('copy')}
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex gap-2 mr-auto max-w-[85%] animate-msg-in">
            <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-sky-400 shrink-0 flex items-center justify-center">
              <Bot className="w-3 h-3" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="font-semibold text-slate-200 text-[11px] ml-1">
                  {statusStep || t('processing')}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Suggested Prompt Chips (Compact horizontal scroll) */}
      <div className="shrink-0 px-2 py-1 border-t border-slate-800/70 bg-slate-950/60 overflow-x-auto scrollbar-none flex items-center gap-1">
        <span className="text-[9px] font-semibold text-slate-400 whitespace-nowrap flex items-center gap-0.5 shrink-0">
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          <span>{t('tryAsking')}</span>
        </span>
        <div className="flex items-center gap-1 flex-nowrap">
          {dynamicQuickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={isProcessing}
              className="text-[11px] text-slate-300 hover:text-white bg-slate-800/70 border border-slate-700/70 px-2 py-0.5 rounded-lg whitespace-nowrap transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Status Alert / Banner if active, transcribing, requesting, or error */}
      {(micState !== 'idle' || speechError) && (
        <div
          className={`shrink-0 px-2.5 py-1 text-[11px] flex items-center justify-between border-t transition-colors ${
            speechError
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : micState === 'requesting'
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              : micState === 'transcribing'
              ? 'bg-sky-950/60 border-sky-500/40 text-sky-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
            {speechError ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : micState === 'requesting' ? (
              <Loader2 className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
            ) : micState === 'transcribing' ? (
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            )}
            <span className="truncate">
              {speechError ||
                statusMessage ||
                (micState === 'requesting'
                  ? t('requestingMic')
                  : micState === 'transcribing'
                  ? t('transcribingSpeech')
                  : t('listeningActive'))}
            </span>
          </div>

          {speechError ? (
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {typeof window !== 'undefined' && window.self !== window.top && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-700 hover:bg-sky-600 text-white font-medium text-[10px] shadow-xs cursor-pointer"
                  title="Open in standalone tab to permit microphone access"
                >
                  <span>Full Tab</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              <button
                type="button"
                onClick={handleRetryVoice}
                className="px-2 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-white font-semibold text-[10px] shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {t('tryAgain')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMicState('idle');
                  setSpeechError(null);
                }}
                className="text-[10px] text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer ml-1"
                title={t('dismiss')}
              >
                ✕
              </button>
            </div>
          ) : (
            (micState === 'listening' || micState === 'transcribing') && (
              <button
                type="button"
                onClick={() => handleMicClick()}
                className={`text-[10px] font-bold underline ml-2 shrink-0 cursor-pointer ${
                  micState === 'transcribing'
                    ? 'text-sky-300 hover:text-white'
                    : 'text-rose-300 hover:text-white'
                }`}
              >
                {t('stop')}
              </button>
            )
          )}
        </div>
      )}

      {/* 4. Chat Input Bar (Firmly pinned inside viewport, always visible!) */}
      <div className="shrink-0 p-1.5 xs:p-2 border-t border-slate-800/80 bg-slate-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5"
        >
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chatPlaceholder')}
              className="w-full resize-none h-9 py-2 px-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40 text-white placeholder:text-slate-500 overflow-hidden leading-snug"
            />
          </div>

          {/* Voice Microphone Button with smooth transitions across all 5 states */}
          <button
            type="button"
            onClick={() => handleMicClick()}
            aria-label={t('voiceSearch')}
            title={
              micState === 'listening'
                ? t('listening')
                : micState === 'transcribing'
                ? t('transcribingSpeech')
                : micState === 'requesting'
                ? t('requestingMic')
                : micState === 'error'
                ? t('tryAgain')
                : t('voiceSearch')
            }
            className={`w-9 h-9 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer ${
              micState === 'listening'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs animate-mic-pulse ring-2 ring-rose-400/60'
                : micState === 'transcribing'
                ? 'bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-xs animate-pulse ring-2 ring-sky-400/60'
                : micState === 'requesting'
                ? 'bg-amber-950/70 border border-amber-500/50 text-amber-300'
                : micState === 'error'
                ? 'bg-rose-950/70 hover:bg-rose-900 border border-rose-500/60 text-rose-300 active:scale-95'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-sky-400 border border-slate-700/80 active:scale-95'
            }`}
          >
            {micState === 'requesting' ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : micState === 'listening' ? (
              <MicOff className="w-3.5 h-3.5 text-white" />
            ) : micState === 'transcribing' ? (
              <Mic className="w-3.5 h-3.5 text-white animate-bounce" />
            ) : micState === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-sky-400" />
            )}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="w-9 h-9 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 rounded-xl font-bold transition-all flex items-center justify-center shadow-xs shrink-0 cursor-pointer"
            title={t('sendQuestion')}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
