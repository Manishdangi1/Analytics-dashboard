"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Track, LocalAudioTrack, createLocalAudioTrack, createLocalVideoTrack, VideoPresets } from "livekit-client";
import { livekitCreateSession, livekitEndSession, livekitIssueToken, livekitQuery, livekitIngestTranscript, livekitMetadata } from "@/lib/queries";

interface VoiceChatProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
  isEnabled: boolean;
  onToggle: () => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onInterimTranscript?: (text: string) => void;
}

export default function VoiceChat({ 
  onTranscript, 
  onError, 
  isEnabled, 
  onToggle, 
  onSpeakingChange,
  onInterimTranscript 
}: VoiceChatProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [livekitRoomToken, setLivekitRoomToken] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const isSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const voiceActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceProcessingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize browser speech recognition for voice input
  useEffect(() => {
    
    // Set up browser speech recognition as fallback
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (interimTranscript) {
          setInterimTranscript(interimTranscript);
          onInterimTranscript?.(interimTranscript);
        }
        
        if (finalTranscript) {
          setCurrentTranscript(finalTranscript);
          // Process the transcript - will be handled by the voice processing system
          onTranscript(finalTranscript);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, [onInterimTranscript]);

  // LiveKit-based voice output with fallback to browser TTS
  const speakText = useCallback((text: string) => {
    
    // First try LiveKit TTS
    if (roomRef.current && sessionId) {
      try {
        const data = JSON.stringify({
          type: 'tts_request',
          text: text,
          timestamp: new Date().toISOString()
        });
        
        roomRef.current.localParticipant.publishData(
          new TextEncoder().encode(data),
          { reliable: true }
        );
        
        return;
      } catch (error) {
        console.error('Error sending TTS request to LiveKit:', error);
      }
    }
    
    // Fallback to browser TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        
        utterance.onerror = (error) => {
          console.error('❌ Browser TTS error:', error);
          setIsSpeaking(false);
        };
        
        speechSynthesis.speak(utterance);
        speechSynthesisRef.current = utterance;
      } catch (error) {
        console.error('❌ Browser TTS failed:', error);
      }
    }
  }, [sessionId]);

  // Process voice with fallback system
  const processVoiceWithLiveKit = useCallback(async (transcript: string) => {
    if (!sessionId) return;
    
    try {
      console.log('🎤 Processing voice with fallback system:', transcript);
      console.log('📡 Session ID:', sessionId);
      
      // Try LiveKit first, but fallback to regular chat API
      try {
        const axios = (await import('axios')).default;
        const sessionAPI = axios.create({
          baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Try LiveKit query first
        console.log('📤 Trying LiveKit query...');
        const queryResponse = await sessionAPI.post(`/livekit/session/${sessionId}/query`, {
          question: transcript,
          context: null
        });
        console.log('📥 LiveKit query response:', queryResponse.data);
        
        // Process LiveKit response
        if (queryResponse.data) {
          let responseText = '';
          if (typeof queryResponse.data === 'string') {
            responseText = queryResponse.data;
          } else if (typeof queryResponse.data === 'object') {
            responseText = queryResponse.data.text || queryResponse.data.message || queryResponse.data.response || JSON.stringify(queryResponse.data);
          }
          
          if (responseText && responseText.trim()) {
            console.log('📥 LiveKit response:', responseText);
            
            // Trigger the transcript callback
            onTranscript(responseText);
            
            // Trigger TTS for the response
            console.log('🔊 Triggering TTS for LiveKit response:', responseText);
            speakText(responseText);
            return;
          }
        }
        
      } catch (livekitError: any) {
        console.log('❌ LiveKit query failed:', livekitError.response?.status);
        console.log('❌ Error details:', livekitError.response?.data);
        
        // Fallback to regular chat API
        console.log('🔄 Falling back to regular chat API...');
        try {
          const axios = (await import('axios')).default;
          const sessionAPI = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          const chatResponse = await sessionAPI.post('/process_query', {
            natural_language_query: transcript,
            transcript_id: null,
            title: null,
            metadata: null,
            conversation_context: null
          });
          
          console.log('📥 Chat API response:', chatResponse.data);
          
          if (chatResponse.data) {
            let responseText = '';
            if (typeof chatResponse.data === 'string') {
              responseText = chatResponse.data;
            } else if (typeof chatResponse.data === 'object') {
              // Handle QueryProcessResponse format
              responseText = chatResponse.data.message || chatResponse.data.text || chatResponse.data.response || JSON.stringify(chatResponse.data);
            }
            
            if (responseText && responseText.trim()) {
              console.log('📥 Chat API response text:', responseText);
              
              // Trigger the transcript callback
              onTranscript(responseText);
              
              // Trigger TTS for the response
              console.log('🔊 Triggering TTS for chat API response:', responseText);
              speakText(responseText);
            }
          }
        } catch (chatError) {
          console.error('❌ Chat API also failed:', chatError);
          onError('Failed to process voice query with both LiveKit and chat API');
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing voice:', error);
      onError(`Failed to process voice: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [sessionId, onTranscript, onError, speakText]);

  // Start voice processing with fallback system
  const startVoiceProcessing = useCallback(() => {
    setIsVoiceActive(true);
    setIsListening(true);
    console.log('🎤 Voice processing started with fallback system');
    
    // Start browser speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('🎤 Browser speech recognition started');
      } catch (error) {
        console.error('❌ Failed to start speech recognition:', error);
        onError('Failed to start voice recognition');
      }
    } else {
      console.log('❌ Speech recognition not available');
      onError('Speech recognition not available in this browser');
    }
  }, [onError]);

  // Stop voice processing
  const stopVoiceProcessing = useCallback(() => {
    setIsVoiceActive(false);
    setIsListening(false);
    
    // Stop browser speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Stop any ongoing speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    console.log('Stopped voice processing');
  }, []);

  useEffect(() => {
    if (isEnabled && !isConnected && !isConnecting) {
      startVoiceSession();
    } else if (!isEnabled && isConnected) {
      endVoiceSession();
    }
  }, [isEnabled]);

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Send query to LiveKit agent for processing
  const sendQueryToLiveKit = useCallback(async (text: string) => {
    if (!sessionId) return;
    
    try {
      setIsProcessing(true);
      console.log('Sending query to LiveKit agent:', text);
      
      // Send query to LiveKit agent
      const response = await livekitQuery(sessionId, {
        question: text,
        context: null
      });
      
      console.log('LiveKit agent response:', response);
      
      // The response should contain the processed text
      if (response && typeof response === 'object') {
        const responseText = (response as any).text || (response as any).message || JSON.stringify(response);
        onTranscript(responseText);
        
        // LiveKit handles TTS on the server side
        console.log('Response processed by LiveKit server');
      }
      
    } catch (error) {
      console.error('Error sending query to LiveKit:', error);
      onError('Failed to process voice query with LiveKit agent');
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, onTranscript, onError]);

  // Send transcript to LiveKit for processing
  const sendTranscriptToLiveKit = useCallback(async (text: string, role: 'user' | 'assistant' | 'system' = 'user') => {
    if (!sessionId) return;
    
    try {
      console.log('Sending transcript to LiveKit:', { text, role });
      
      await livekitIngestTranscript(sessionId, {
        role,
        text,
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'voice_chat',
          processed: true
        }
      });
      
    } catch (error) {
      console.error('Error sending transcript to LiveKit:', error);
      onError('Failed to send transcript to LiveKit');
    }
  }, [sessionId, onError]);

  // Send voice query to LiveKit
  const sendVoiceQuery = useCallback(async (text: string) => {
    if (!sessionId) return;
    
    try {
      setIsProcessing(true);
      console.log('Sending voice query to LiveKit:', text);
      
      // Send query to LiveKit using your API
      const response = await livekitQuery(sessionId, {
        question: text,
        context: null
      });
      
      console.log('LiveKit query response:', response);
      
      // Process the response
      if (response) {
        let responseText = '';
        if (typeof response === 'string') {
          responseText = response;
        } else if (typeof response === 'object') {
          responseText = (response as any).text || (response as any).message || (response as any).response || JSON.stringify(response);
        }
        
        if (responseText && responseText.trim()) {
          // Send the response as a transcript
          await livekitIngestTranscript(sessionId, {
            role: 'assistant',
            text: responseText,
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'voice_response',
              processed: true
            }
          });
          
          // Trigger the transcript callback
          onTranscript(responseText);
          
          // Trigger TTS for the response
          console.log('🔊 Triggering TTS for agent response:', responseText);
          speakText(responseText);
        }
      }
      
    } catch (error) {
      console.error('Error sending voice query to LiveKit:', error);
      onError('Failed to process voice query with LiveKit');
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, onTranscript, onError, speakText]);

  const startVoiceSession = async () => {
    try {
      setIsConnecting(true);
      onError("");

      console.log('🚀 Starting voice session with LiveKit APIs...');

      // Create LiveKit session
      console.log('🚀 Creating LiveKit session...');
      const sessionResponse = await livekitCreateSession({
        display_name: "User",
        transcript_id: null
      });

      console.log("📥 LiveKit session created:", sessionResponse);
      console.log("📥 Session ID:", sessionResponse.session_id);
      console.log("📥 Room name:", sessionResponse.room_name);
      console.log("📥 URL:", sessionResponse.url);

      // Store session ID
      setSessionId(sessionResponse.session_id);

      // Get room token
      console.log('🎫 Getting LiveKit room token...');
      const tokenResponse = await livekitIssueToken(sessionResponse.session_id);
      console.log("🎫 Room token received:", tokenResponse);
      
      if (tokenResponse.token) {
        setLivekitRoomToken(tokenResponse.token);
        console.log("🎫 Room token stored successfully");
      }

      // Start voice processing
      setIsConnected(true);
      setIsConnecting(false);
      startVoiceProcessing();
      
      console.log('✅ Voice session started successfully with LiveKit');

      if (!sessionResponse.session_id) {
        throw new Error("Failed to create LiveKit session");
      }

      setSessionId(sessionResponse.session_id);
      setLivekitRoomToken(sessionResponse.token);

      // Create room instance
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log("✅ Connected to LiveKit room");
        console.log("📡 Room name:", newRoom.name);
        console.log("👥 Participants:", newRoom.numParticipants);
        setIsConnected(true);
        setIsConnecting(false);
        // Start voice processing with LiveKit APIs
        startVoiceProcessing();
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from LiveKit room");
        setIsConnected(false);
        setIsConnecting(false);
        stopVoiceProcessing();
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log("Participant connected:", participant.identity);
        setParticipants(prev => [...prev, participant]);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log("Participant disconnected:", participant.identity);
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track: Track, publication: any, participant: RemoteParticipant) => {
        console.log('🎵 Track subscribed:', track.kind, 'from participant:', participant.identity);
        if (track.kind === Track.Kind.Audio) {
          console.log('🔊 Audio track subscribed, setting up playback...');
          
          // Create audio element if it doesn't exist
          if (!audioRef.current) {
            const audio = document.createElement('audio');
            audio.autoplay = true;
            audio.controls = false;
            audio.style.display = 'none';
            audio.preload = 'auto';
            audio.volume = 1.0;
            audio.muted = false;
            document.body.appendChild(audio);
            audioRef.current = audio;
            console.log('🔊 Audio element created');
          }
          
          // Attach the track to the audio element
          const audioElement = track.attach();
          console.log('🔊 Audio element attached to track');
          
          // Set up audio element for playback
          if (audioRef.current) {
            // Set the audio source
            audioRef.current.srcObject = audioElement as any;
            audioRef.current.volume = 1.0;
            audioRef.current.muted = false;
            
            // Add event listeners before playing
            audioRef.current.onloadedmetadata = () => {
              console.log('🔊 Audio metadata loaded, duration:', audioRef.current?.duration);
            };
            
            audioRef.current.oncanplay = () => {
              console.log('🔊 Audio can play, attempting to play...');
              // Try to play when ready
              audioRef.current?.play().catch((error) => {
                console.error('❌ Auto-play failed:', error);
              });
            };
            
            audioRef.current.onplay = () => {
              console.log('✅ Audio playback started');
              setIsSpeaking(true);
            };
            
            audioRef.current.onended = () => {
              console.log('🔇 Audio playback ended');
              setIsSpeaking(false);
            };
            
            audioRef.current.onerror = (error) => {
              console.error('❌ Audio element error:', error);
              setIsSpeaking(false);
            };
            
            audioRef.current.onpause = () => {
              console.log('⏸️ Audio playback paused');
              setIsSpeaking(false);
            };
            
            // Force play if autoplay doesn't work
            setTimeout(() => {
              if (audioRef.current && audioRef.current.paused) {
                console.log('🔊 Attempting manual play...');
                audioRef.current.play().then(() => {
                  console.log('✅ Manual play successful');
                }).catch((error) => {
                  console.error('❌ Manual play failed:', error);
                });
              }
            }, 100);
          }
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        console.log('🎵 Track unsubscribed:', track.kind);
        if (track.kind === Track.Kind.Audio) {
          console.log('🔇 Audio track unsubscribed');
          setIsSpeaking(false);
        }
        track.detach();
      });

      newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          console.log('📨 LiveKit data received:', data);
          console.log('📨 From participant:', participant?.identity);
          
          if (data.type === 'voice_transcript' && data.text) {
            // Handle voice transcript from LiveKit
            console.log('🎤 Voice transcript received:', data.text);
            onTranscript(data.text);
            sendTranscriptToLiveKit(data.text, 'user');
          } else if (data.type === 'voice_response' && data.text) {
            // Handle voice response from LiveKit
            console.log('🤖 Voice response received:', data.text);
            onTranscript(data.text);
            sendTranscriptToLiveKit(data.text, 'assistant');
            
            // Trigger TTS for the response
            speakText(data.text);
          } else if (data.type === 'voice_query' && data.text) {
            // Handle voice query
            console.log('❓ Voice query received:', data.text);
            sendVoiceQuery(data.text);
          } else if (data.type === 'interim_transcript' && data.text) {
            // Handle interim transcript
            console.log('⏳ Interim transcript:', data.text);
            setInterimTranscript(data.text);
            onInterimTranscript?.(data.text);
          } else if (data.type === 'agent_audio_ready') {
            // Agent is about to speak
            console.log('🔊 Agent audio ready, waiting for audio track...');
            setIsSpeaking(true);
          } else if (data.type === 'agent_audio_end') {
            // Agent finished speaking
            console.log('🔇 Agent audio ended');
            setIsSpeaking(false);
          } else if (data.type === 'tts_response' && data.text) {
            // Handle TTS response from agent
            console.log('🔊 TTS response received:', data.text);
            speakText(data.text);
          } else if (data.type === 'error') {
            // Handle errors from LiveKit
            console.error('❌ LiveKit error:', data.message);
            onError(data.message || 'LiveKit error occurred');
          }
        } catch (error) {
          console.error("❌ Error parsing LiveKit data:", error);
        }
      });

      // Connect to room
      console.log('🔗 Connecting to LiveKit room...');
      console.log('🔗 URL:', sessionResponse.url);
      console.log('🔗 Token length:', sessionResponse.token?.length || 0);
      
      // Use LiveKit Cloud WebSocket URL from environment
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://test-d2mkesrx.livekit.cloud';
      const roomName = `${process.env.NEXT_PUBLIC_LIVEKIT_ROOM_PREFIX || 'indus'}-${sessionResponse.session_id}`;
      
      console.log('🌐 LiveKit Cloud URL:', livekitUrl);
      console.log('🏠 Room name:', roomName);
      console.log('🎫 Token length:', sessionResponse.token?.length || 0);
      console.log('🔑 LiveKit API Key:', process.env.NEXT_PUBLIC_LIVEKIT_API_KEY ? 'Present' : 'Missing');
      console.log('🔑 LiveKit API Secret:', process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET ? 'Present' : 'Missing');
      
      // Validate token before connecting
      if (!sessionResponse.token) {
        throw new Error('No LiveKit token received from server');
      }
      
      if (sessionResponse.token.length < 10) {
        throw new Error('Invalid LiveKit token received from server');
      }
      
      // Connect to LiveKit room with error handling
      try {
        await newRoom.connect(livekitUrl, sessionResponse.token);
        console.log('✅ Successfully connected to LiveKit Cloud room');
      } catch (connectError) {
        console.error('❌ Failed to connect to LiveKit room:', connectError);
        throw new Error(`Failed to connect to LiveKit: ${connectError instanceof Error ? connectError.message : String(connectError)}`);
      }
      
      // Enable microphone with proper error handling
      console.log('🎤 Requesting microphone permission...');
      try {
        // Request microphone permission first
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        console.log('✅ Microphone permission granted');
        
        // Create audio track from the stream
        const audioTrack = await createLocalAudioTrack({
          deviceId: stream.getAudioTracks()[0].getSettings().deviceId
        });
        console.log('🎤 Audio track created:', audioTrack);
        
        // Stop the temporary stream
        stream.getTracks().forEach(track => track.stop());
        
        console.log('📤 Publishing audio track...');
        await newRoom.localParticipant.publishTrack(audioTrack);
        console.log('✅ Audio track published');
        audioTrackRef.current = audioTrack;
        
        // Set up voice activity detection
        audioTrack.on('muted', () => {
          console.log('🎤 Audio track muted');
          setIsMuted(true);
        });
        
        audioTrack.on('unmuted', () => {
          console.log('🎤 Audio track unmuted');
          setIsMuted(false);
        });
        
        // Start voice processing
        startVoiceProcessing();
        
      } catch (micError) {
        console.error('❌ Microphone access denied:', micError);
        onError('Microphone access denied. Please allow microphone access and try again.');
        setIsConnecting(false);
        return;
      }

      setRoom(newRoom);
      roomRef.current = newRoom;
    } catch (error) {
      console.error("Error starting voice session:", error);
      onError("Failed to start voice chat. Please try again.");
      setIsConnecting(false);
    }
  };

  const endVoiceSession = async () => {
    try {
      // Stop voice processing
      stopVoiceProcessing();
      
      // Stop any ongoing speech
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
      
      // Clean up audio track
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current = null;
      }
      
      // Clean up LiveKit room if it exists
      if (room) {
        await room.disconnect();
        setRoom(null);
        roomRef.current = null;
      }
      
      // Clean up LiveKit session if it exists
      if (sessionId) {
        try {
          await livekitEndSession(sessionId);
        } catch (error) {
          console.log('LiveKit session cleanup failed (expected):', error);
        }
        setSessionId(null);
      }
      
      setIsConnected(false);
      setParticipants([]);
      setIsSpeaking(false);
      setIsListening(false);
      setIsProcessing(false);
      setIsVoiceActive(false);
      setInterimTranscript("");
      setCurrentTranscript("");
      
      console.log('✅ Voice session ended successfully');
    } catch (error) {
      console.error("Error ending voice session:", error);
      onError("Error ending voice session");
    }
  };

  const toggleMute = async () => {
    if (!room || !audioTrackRef.current) return;

    try {
      const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (publication && publication.track) {
        await (publication.track as any).setEnabled(isMuted);
        setIsMuted(!isMuted);
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
      onError("Failed to toggle microphone");
    }
  };

  const sendMessage = async (message: string) => {
    if (!room || !sessionId) return;

    try {
      // Send message using LiveKit APIs
      await sendVoiceQuery(message);
      
      // Also send as data channel message for real-time communication
      const data = {
        type: 'voice_query',
        text: message,
        timestamp: new Date().toISOString()
      };
      
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        { reliable: true }
      );
    } catch (error) {
      console.error("Error sending message:", error);
      onError("Failed to send message");
    }
  };





  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main Voice Controls */}
      <div className="flex items-center gap-3">
        {/* Voice Chat Toggle */}
        <button
          onClick={onToggle}
          disabled={isConnecting}
          className={`relative inline-flex items-center justify-center w-12 h-12 rounded-xl transition-all pressable ${
            isEnabled
              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white indus-glow"
              : "bg-white/10 border border-white/20 text-neutral-400 hover:bg-white/20"
          } ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}`}
          title={isEnabled ? "Disable voice chat" : "Enable voice chat"}
        >
          {isConnecting ? (
            <div className="w-5 h-5 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
          ) : isEnabled ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
              <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5a.75.75 0 001.5 0v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 11-9 0v-.357z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
              <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5a.75.75 0 001.5 0v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 11-9 0v-.357z" />
            </svg>
          )}
          
          {/* Speaking indicator */}
          {(isSpeaking || isListening) && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Mute Toggle */}
        {isConnected && (
          <button
            onClick={toggleMute}
            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all pressable ${
              isMuted
                ? "bg-red-500/20 border border-red-500/30 text-red-400"
                : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
            }`}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              {isMuted ? (
                <path d="M13.92 10.38a.75.75 0 00-1.34-.67L12 10.5V6a3 3 0 00-5.25-2.13.75.75 0 00-1.5 0A4.5 4.5 0 0112 6v4.5l-.58-.79a.75.75 0 00-1.34.67l.58.79-.58.79a.75.75 0 001.34.67L12 12.5V17a.75.75 0 001.5 0v-4.5l.58.79a.75.75 0 001.34-.67l-.58-.79.58-.79z" />
              ) : (
                <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
              )}
            </svg>
          </button>
        )}

        {/* Stop Speaking Button */}
        {isSpeaking && (
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                speechSynthesis.cancel();
              }
            }}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
            title="Stop speaking"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Voice System Status */}
      <div className="flex items-center gap-2">
        <div className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-500/20 border border-blue-500/30 text-blue-400">
          🎙️ LiveKit Only
        </div>
        {isConnected && (
          <div className="px-3 py-1 rounded-lg text-xs font-medium bg-green-500/20 border border-green-500/30 text-green-400">
            ✅ LiveKit Connected
          </div>
        )}
        {!isConnected && (
          <div className="px-3 py-1 rounded-lg text-xs font-medium bg-red-500/20 border border-red-500/30 text-red-400">
            ⚠️ Not Connected
          </div>
        )}
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        {isConnected && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Voice Active</span>
          </div>
        )}

        {/* Listening Status */}
        {isListening && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-xs text-blue-400 font-medium">Listening...</span>
          </div>
        )}

        {/* Speaking Status */}
        {isSpeaking && (
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span className="text-xs text-purple-400 font-medium">Speaking...</span>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <span className="text-xs text-orange-400 font-medium">Processing with LiveKit...</span>
          </div>
        )}

        {/* Voice Active Status */}
        {isVoiceActive && (
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span className="text-xs text-purple-400 font-medium">Voice Processing Active</span>
          </div>
        )}
      </div>


      {/* Interim Transcript Display */}
      {interimTranscript && (
        <div className="w-full max-w-md px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
          <div className="text-xs text-neutral-400 mb-1">Listening:</div>
          <div className="text-sm text-white italic">{interimTranscript}</div>
        </div>
      )}

      {/* Hidden audio element for playback */}
      <audio 
        ref={audioRef} 
        autoPlay 
        controls={false}
        style={{ display: 'none' }}
        onEnded={() => {
          console.log('🔇 Audio playback ended');
          setIsSpeaking(false);
        }}
        onError={(e) => {
          console.error('❌ Audio element error:', e);
          setIsSpeaking(false);
        }}
        onPlay={() => {
          console.log('▶️ Audio playback started');
          setIsSpeaking(true);
        }}
        onPause={() => {
          console.log('⏸️ Audio playback paused');
          setIsSpeaking(false);
        }}
      />
    </div>
  );
}
