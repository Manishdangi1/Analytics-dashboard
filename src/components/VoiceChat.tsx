"use client";

import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Track, createLocalAudioTrack, createLocalVideoTrack, VideoPresets } from "livekit-client";
import { livekitCreateSession, livekitEndSession, livekitIssueToken } from "@/lib/queries";

interface VoiceChatProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
  isEnabled: boolean;
  onToggle: () => void;
}

export default function VoiceChat({ onTranscript, onError, isEnabled, onToggle }: VoiceChatProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);

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
    };
  }, []);

  const startVoiceSession = async () => {
    try {
      setIsConnecting(true);
      onError("");

      // Create LiveKit session
      const sessionResponse = await livekitCreateSession({
        display_name: "User",
        transcript_id: null
      });

      if (!sessionResponse.session_id) {
        throw new Error("Failed to create LiveKit session");
      }

      setSessionId(sessionResponse.session_id);

      // Create room instance
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log("Connected to LiveKit room");
        setIsConnected(true);
        setIsConnecting(false);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from LiveKit room");
        setIsConnected(false);
        setIsConnecting(false);
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
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          if (audioRef.current) {
            audioRef.current.srcObject = audioElement as any;
            audioRef.current.play().catch(console.error);
          }
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        track.detach();
      });

      newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.type === 'transcript' && data.text) {
            onTranscript(data.text);
          }
        } catch (error) {
          console.error("Error parsing data:", error);
        }
      });

      // Connect to room
      await newRoom.connect(sessionResponse.url, sessionResponse.token);
      
      // Enable microphone
      const audioTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(audioTrack);

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
      if (room) {
        await room.disconnect();
        setRoom(null);
        roomRef.current = null;
      }
      
      if (sessionId) {
        await livekitEndSession(sessionId);
        setSessionId(null);
      }
      
      setIsConnected(false);
      setParticipants([]);
    } catch (error) {
      console.error("Error ending voice session:", error);
      onError("Error ending voice session");
    }
  };

  const toggleMute = async () => {
    if (!room) return;

    try {
      const audioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
      if (audioTrack && 'setEnabled' in audioTrack) {
        await (audioTrack as any).setEnabled(isMuted);
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
      const data = {
        type: 'user_message',
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
        {isSpeaking && (
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

      {/* Connection Status */}
      {isConnected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Voice Active</span>
        </div>
      )}

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} autoPlay />
    </div>
  );
}
