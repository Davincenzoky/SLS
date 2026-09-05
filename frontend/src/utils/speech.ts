export function speakText(text: string, lang = 'en-US'): void {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported')
    return
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 1
  utterance.pitch = 1
  utterance.volume = 1

  // Try to use a natural voice
  const voices = speechSynthesis.getVoices()
  const preferredVoice = voices.find(v => 
    v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural'))
  ) || voices.find(v => v.lang.startsWith('en'))
  
  if (preferredVoice) {
    utterance.voice = preferredVoice
  }

  speechSynthesis.cancel() // Stop any ongoing speech
  speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel()
  }
}