import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Languages, 
  Sparkles, 
  Volume2, 
  Play, 
  Pause, 
  Square, 
  Copy, 
  Check, 
  FileText, 
  AlertCircle,
  BookOpen,
  ListOrdered,
  RefreshCw,
  Info,
  BrainCircuit,
  Stethoscope
} from 'lucide-react';
import api from '../services/api';
import { usePatient } from '../context/PatientContext';

const CONTENT_TYPES = [
  '👨‍⚕️ Doctor Brief',
  '💊 Prescription & Meds',
  '📄 Recent Clinical Encounter'
];

export const TranslateExplain = () => {
  const { activePatientId, activePatient } = usePatient();
  
  const [languages, setLanguages] = useState({});
  const [selectedLangKey, setSelectedLangKey] = useState('বাংলা / Bengali');
  const [selectedContentType, setSelectedContentType] = useState('👨‍⚕️ Doctor Brief');
  const [sourceContent, setSourceContent] = useState(null);
  const [translationResult, setTranslationResult] = useState(null);
  const [keyTerms, setKeyTerms] = useState([]);
  const [loadingSource, setLoadingSource] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [loadingTerms, setLoadingTerms] = useState(false);
  
  // TTS State for Translated Explanation
  const [synthesizingTTS, setSynthesizingTTS] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // TTS State for Key Medical Terms
  const [synthesizingTermsTTS, setSynthesizingTermsTTS] = useState(false);
  const [termsAudioUrl, setTermsAudioUrl] = useState(null);
  const [isPlayingTerms, setIsPlayingTerms] = useState(false);
  const [termsAudioProgress, setTermsAudioProgress] = useState(0);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const termsAudioRef = useRef(null);

  // 1. Fetch Supported Languages on Mount
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const langRes = await api.getLanguages();
        if (langRes.success && langRes.languages) {
          setLanguages(langRes.languages);
          if (!selectedLangKey || !langRes.languages[selectedLangKey]) {
            const firstKey = Object.keys(langRes.languages)[0] || 'English';
            setSelectedLangKey(firstKey);
          }
        }
      } catch (err) {
        console.error('Failed to load languages:', err);
      }
    };
    fetchLanguages();
  }, []);

  // 2. Clear all state when activePatientId changes (Patient Isolation)
  useEffect(() => {
    setTranslationResult(null);
    setSourceContent(null);
    setKeyTerms([]);
    setAudioUrl(null);
    setTermsAudioUrl(null);
    setIsPlaying(false);
    setIsPlayingTerms(false);
    setError(null);
  }, [activePatientId]);

  // 3. Load Translation and Key Terms
  const loadTranslationAndTerms = async () => {
    if (!activePatientId) return;
    try {
      setLoadingSource(true);
      setError(null);
      setAudioUrl(null);
      setTermsAudioUrl(null);
      setIsPlaying(false);
      setIsPlayingTerms(false);

      // Validate language in supported configuration
      if (Object.keys(languages).length > 0 && !languages[selectedLangKey]) {
        setError('Translation for this language is not currently available.');
        setLoadingSource(false);
        setTranslating(false);
        return;
      }

      // A. Call Translation API (returns both translation and explained terms in one call)
      const res = await api.translateContent(activePatientId, {
        contentType: selectedContentType,
        targetLanguageKey: selectedLangKey,
      });

      if (res.success) {
        setTranslationResult(res);
        const srcTitle = res.source_title || selectedContentType;
        const srcText = res.source_text || '';
        setSourceContent({
          title: srcTitle,
          text: srcText,
        });

        // B. Set Key Terms from unified translation result
        const inlineTerms = res.result?.key_terms || res.result?.key_terms_explained || [];
        setKeyTerms(inlineTerms);
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(err.message || 'Failed to generate translation.');
    } finally {
      setLoadingSource(false);
      setTranslating(false);
    }
  };

  useEffect(() => {
    loadTranslationAndTerms();
  }, [activePatientId, selectedContentType, selectedLangKey]);

  const handleTranslateClick = async () => {
    setTranslating(true);
    await loadTranslationAndTerms();
  };

  // 4. Synthesize Audio for Main Translation
  const handleGenerateAudio = async () => {
    const textToSpeak = explanationText;

    if (!textToSpeak || !textToSpeak.trim()) return;

    try {
      setSynthesizingTTS(true);
      setError(null);

      const res = await api.synthesizeTTS(activePatientId, {
        text: textToSpeak,
        targetLanguageKey: selectedLangKey,
      });

      if (res.success && res.audio_base64) {
        const binaryStr = atob(res.audio_base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.play().catch(e => console.log('Audio autoplay prevented:', e));
            setIsPlaying(true);
          }
        }, 100);
      } else if (res.message) {
        setError(res.message);
      }
    } catch (err) {
      console.error('TTS error:', err);
      setError(err.message || 'Audio synthesis is not available for the selected language.');
    } finally {
      setSynthesizingTTS(false);
    }
  };

  // 5. Synthesize Audio for Key Medical Terms
  const handleGenerateTermsAudio = async () => {
    if (!keyTerms || keyTerms.length === 0) return;

    // Build comprehensive narration script of all terms and plain explanations
    const termsScript = keyTerms.map(t => {
      const termName = t.term || t.medical_term || '';
      const exp = t.explanation || t.simple_meaning || '';
      return `${termName}: ${exp}`;
    }).join('. ');

    try {
      setSynthesizingTermsTTS(true);
      setError(null);

      const res = await api.synthesizeTTS(activePatientId, {
        text: termsScript,
        targetLanguageKey: selectedLangKey,
      });

      if (res.success && res.audio_base64) {
        const binaryStr = atob(res.audio_base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
        const url = URL.createObjectURL(audioBlob);
        setTermsAudioUrl(url);

        setTimeout(() => {
          if (termsAudioRef.current) {
            termsAudioRef.current.src = url;
            termsAudioRef.current.play().catch(e => console.log('Terms audio autoplay prevented:', e));
            setIsPlayingTerms(true);
          }
        }, 100);
      } else if (res.message) {
        setError(res.message);
      }
    } catch (err) {
      console.error('Terms TTS error:', err);
      setError(err.message || 'Key terms audio synthesis is not available for this language.');
    } finally {
      setSynthesizingTermsTTS(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.log('Playback error:', e));
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setAudioProgress(0);
  };

  const handlePlayPauseTerms = () => {
    if (!termsAudioRef.current) return;
    if (isPlayingTerms) {
      termsAudioRef.current.pause();
      setIsPlayingTerms(false);
    } else {
      termsAudioRef.current.play().catch(e => console.log('Terms audio playback error:', e));
      setIsPlayingTerms(true);
    }
  };

  const handleStopTerms = () => {
    if (!termsAudioRef.current) return;
    termsAudioRef.current.pause();
    termsAudioRef.current.currentTime = 0;
    setIsPlayingTerms(false);
    setTermsAudioProgress(0);
  };

  const handleCopyTranslated = () => {
    const result = translationResult?.result || {};
    const text = result.simplified_explanation || 
                 result.patient_friendly_explanation || 
                 result.translated_content || 
                 result.translated_text;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const patientName = activePatient?.name || 'Patient';
  const resultData = translationResult?.result || {};
  const explanationText = resultData.simplified_explanation || 
                          resultData.patient_friendly_explanation || 
                          resultData.translated_content || 
                          resultData.translated_text || '';

  const nativeLanguageLabel = selectedLangKey.split('/')[0].trim();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-teal to-brand-indigo text-white dark:text-slate-950 flex items-center justify-center shadow-md">
              <Languages className="w-4 h-4" />
            </div>
            Multilingual Translate & Explain
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reassuring, simplified regional translations with full-length continuous voice synthesis for <strong className="text-slate-800 dark:text-slate-200">{patientName}</strong>.
          </p>
        </div>
      </div>

      {/* Control Bar: Source Type & Language Selector */}
      <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        
        {/* Source Content Category Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500 flex-shrink-0">
            Source:
          </span>
          {CONTENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedContentType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedContentType === type
                  ? 'bg-gradient-to-r from-brand-teal to-brand-indigo dark:from-[#2DD4BF] dark:to-[#818CF8] text-white dark:text-slate-950 shadow-md shadow-brand-indigo/25'
                  : 'bg-slate-100 dark:bg-[#182235] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Language Dropdown & Trigger Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
              Language:
            </span>
            <select
              value={selectedLangKey}
              onChange={(e) => setSelectedLangKey(e.target.value)}
              className="bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 transition-colors"
            >
              {Object.keys(languages).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleTranslateClick}
            disabled={translating || loadingSource}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-teal to-brand-indigo dark:from-[#2DD4BF] dark:to-[#818CF8] text-white dark:text-slate-950 text-xs font-extrabold shadow-md shadow-brand-indigo/25 hover:opacity-95 disabled:opacity-50 transition-all active:scale-95"
          >
            {translating || loadingSource ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{translating || loadingSource ? 'Translating...' : 'Translate & Explain'}</span>
          </button>
        </div>

      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* BLOCK 1 & BLOCK 2: SPLIT-SCREEN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BLOCK 1: ORIGINAL MEDICAL CONTENT */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#263247] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  1. Original Medical Content
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-[#182235] text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-[#263247]">
                English / Clinical Record
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#182235] p-4 rounded-2xl border border-slate-100 dark:border-[#263247] font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto transition-colors">
              {loadingSource ? (
                <div className="text-slate-400 dark:text-slate-500 text-center py-16 font-sans">
                  <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading source clinical context...
                </div>
              ) : (
                sourceContent?.text || 'No source content available for this category.'
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#263247] text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>Patient: <strong className="text-slate-700 dark:text-slate-300">{patientName}</strong> (ID: {activePatientId})</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ Clinical Context Loaded</span>
          </div>
        </div>

        {/* BLOCK 2: TRANSLATED + SIMPLIFIED EXPLANATION */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-cyan-50/70 dark:from-[#111827] dark:via-[#182235] dark:to-[#111827] p-6 rounded-3xl border border-indigo-200 dark:border-[#263247] shadow-card flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between border-b border-indigo-100 dark:border-[#263247] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-indigo dark:text-[#818CF8]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-indigo dark:text-[#818CF8]">
                  2. Translated + Simplified Explanation ({nativeLanguageLabel})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyTranslated}
                  disabled={!explanationText}
                  className="text-xs text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white font-bold flex items-center gap-1 disabled:opacity-40 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Translation Output Container */}
            <div className="bg-white/95 dark:bg-[#111827]/95 p-5 rounded-2xl border border-indigo-100 dark:border-[#263247] text-sm text-slate-800 dark:text-slate-200 leading-relaxed max-h-96 overflow-y-auto space-y-4 shadow-sm transition-colors">
              {loadingSource || translating ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-9 h-9 border-3 border-brand-indigo dark:border-[#818CF8] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Gemini 3.6 Flash translating into {nativeLanguageLabel}...</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Simplifying medical terms into patient-friendly language</p>
                </div>
              ) : explanationText ? (
                <div className="space-y-3">
                  <p className="text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC] font-medium whitespace-pre-wrap leading-relaxed">
                    {explanationText}
                  </p>
                  
                  {resultData.translated_content && resultData.translated_content !== explanationText && (
                    <div className="pt-3 border-t border-slate-100 dark:border-[#263247]">
                      <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Full Translated Record:
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {resultData.translated_content}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 dark:text-slate-500 text-xs text-center py-16">
                  Click "Translate & Explain" to generate a simple regional explanation.
                </p>
              )}
            </div>
          </div>

          {/* AUDIO PLAYER CONTROLS */}
          <div className="mt-5 pt-4 border-t border-indigo-100 dark:border-[#263247] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAudio}
                  disabled={synthesizingTTS || !explanationText}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-indigo to-purple-600 dark:from-[#818CF8] dark:to-purple-500 text-white dark:text-slate-950 font-extrabold text-xs shadow-md shadow-brand-indigo/25 hover:opacity-95 disabled:opacity-40 transition-all active:scale-95"
                >
                  {synthesizingTTS ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span>{synthesizingTTS ? 'Synthesizing Audio...' : `🔊 Listen in ${nativeLanguageLabel}`}</span>
                </button>

                {audioUrl && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePlayPause}
                      className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-brand-indigo dark:text-indigo-300 transition-colors"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleStop}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-[#182235] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Stop"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span>Full-text continuous TTS</span>
              </div>
            </div>

            {/* Audio Progress Bar */}
            {audioUrl && (
              <div className="w-full bg-indigo-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-indigo dark:bg-[#818CF8] h-full transition-all duration-200"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
            )}

            {/* HTML Audio Element */}
            <audio
              ref={audioRef}
              onTimeUpdate={() => {
                if (audioRef.current && audioRef.current.duration) {
                  setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                }
              }}
              onEnded={() => {
                setIsPlaying(false);
                setAudioProgress(100);
              }}
              className="hidden"
            />
          </div>
        </div>

      </div>

      {/* BLOCK 3: KEY MEDICAL TERMS IN PLAIN LANGUAGE */}
      <div className="bg-white dark:bg-[#111827] p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card transition-colors">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#263247] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-brand-indigo dark:text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-sm">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                <span>🧠 Key Medical Terms in Plain Language</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-brand-indigo dark:text-indigo-300">
                  {keyTerms.length} Terms
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Everyday non-clinical explanations in {nativeLanguageLabel} designed for clear patient understanding
              </p>
            </div>
          </div>

          {/* Listen to Explanations TTS Button */}
          {keyTerms.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleGenerateTermsAudio}
                disabled={synthesizingTermsTTS}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500 text-white dark:text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-600/20 hover:opacity-95 disabled:opacity-40 transition-all active:scale-95"
              >
                {synthesizingTermsTTS ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>{synthesizingTermsTTS ? 'Synthesizing Audio...' : '🔊 Listen to explanations'}</span>
              </button>

              {termsAudioUrl && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePlayPauseTerms}
                    className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 transition-colors"
                    title={isPlayingTerms ? 'Pause' : 'Play'}
                  >
                    {isPlayingTerms ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleStopTerms}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-[#182235] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Stop"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Terms Audio Progress Bar */}
        {termsAudioUrl && (
          <div className="w-full bg-emerald-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-4">
            <div 
              className="bg-emerald-600 dark:bg-emerald-400 h-full transition-all duration-200"
              style={{ width: `${termsAudioProgress}%` }}
            />
          </div>
        )}

        {/* Hidden Terms Audio Element */}
        <audio
          ref={termsAudioRef}
          onTimeUpdate={() => {
            if (termsAudioRef.current && termsAudioRef.current.duration) {
              setTermsAudioProgress((termsAudioRef.current.currentTime / termsAudioRef.current.duration) * 100);
            }
          }}
          onEnded={() => {
            setIsPlayingTerms(false);
            setTermsAudioProgress(100);
          }}
          className="hidden"
        />

        {/* Terms Grid */}
        {loadingTerms ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <div className="w-7 h-7 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold">Extracting key medical terms...</p>
          </div>
        ) : keyTerms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {keyTerms.map((term, idx) => {
              const termTitle = term.term || term.medical_term || 'Medical Term';
              const termMeaning = term.simple_explanation || term.explanation || term.simple_meaning || term.plain_language || '';

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="p-4 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-white dark:from-[#182235] dark:to-[#111827] border border-indigo-100/90 dark:border-[#263247] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-brand-indigo dark:bg-[#818CF8]" />
                      <span className="text-xs font-extrabold text-brand-indigo dark:text-[#818CF8] tracking-tight">
                        {termTitle}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      {termMeaning}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#263247] flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                    <span>Term #{idx + 1}</span>
                    <span className="font-semibold text-brand-indigo/80 dark:text-indigo-400">Plain Language</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#182235] rounded-2xl border border-slate-100 dark:border-[#263247]">
            Click "Translate & Explain" above to extract and simplify medical terms for this clinical document.
          </div>
        )}

        {/* Safety Disclaimer Note */}
        <div className="mt-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#182235] border border-slate-200/80 dark:border-[#263247] flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-brand-indigo dark:text-indigo-400 flex-shrink-0" />
          <span>
            <strong>Safety Note:</strong> Simple explanation for understanding — not a diagnosis. Always consult your healthcare provider for medical decisions.
          </span>
        </div>

      </div>

      {/* Recommended Action Points (If Available) */}
      {resultData.patient_action_points && resultData.patient_action_points.length > 0 && (
        <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card transition-colors">
          <h3 className="text-sm font-black text-slate-900 dark:text-[#F8FAFC] mb-3 flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Recommended Next Steps & Care Actions</span>
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {resultData.patient_action_points.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-[#182235] rounded-xl border border-slate-100 dark:border-[#263247]">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <span className="leading-relaxed font-medium">{typeof action === 'string' ? action : action.action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};

export default TranslateExplain;
