// Minimal ambient declarations for browser SpeechRecognition APIs
declare type SpeechRecognition = any;
declare type SpeechRecognitionEvent = any;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export {};


