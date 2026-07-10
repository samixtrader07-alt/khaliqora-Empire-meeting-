import React, { useState, useEffect, useRef } from "react";
import { User, ParticipantState, MeetingRoomState } from "../types";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Hand, Users,
  X, HelpCircle, Volume2, Shield, Settings, Sparkles, Star, UserCheck
} from "lucide-react";

interface MeetingRoomProps {
  user: User;
  companyId: string;
  companyName: string;
  onLeave: () => void;
}

export default function MeetingRoom({ user, companyId, companyName, onLeave }: MeetingRoomProps) {
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [speakerQueue, setSpeakerQueue] = useState<string[]>([]);
  const [delegatedHostId, setDelegatedHostId] = useState<string | null>(null);
  
  // Local Media states
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isRequestingSpeak, setIsRequestingSpeak] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Real camera stream states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Computed Roles
  const isCoHost = delegatedHostId === user.id;
  const isManagerOrAdmin = user.role === "super_admin" || user.role === "company_manager" || isCoHost;
  const isMainHost = user.role === "super_admin" || user.role === "company_manager";

  // Check if this specific user has permission to speak
  // They can speak if they are a manager, OR if the manager has unlocked the room (currentSpeakerId === null),
  // OR if they are the designated current speaker.
  const hasSpeakPermission = isManagerOrAdmin || currentSpeakerId === null || currentSpeakerId === user.id;

  // Manage camera streaming
  useEffect(() => {
    let active = true;
    if (isCameraOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          if (active) {
            setLocalStream(stream);
          } else {
            stream.getTracks().forEach(track => track.stop());
          }
        })
        .catch((err) => {
          console.warn("Camera access denied or unavailable:", err);
          setLocalStream(null);
        });
    } else {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
    }

    return () => {
      active = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOn]);

  // Audio waveform animation frames
  const [waveHeights, setWaveHeights] = useState<number[]>([10, 20, 10, 30, 15]);
  const animationRef = useRef<number | null>(null);

  // Poll server to sync room state
  useEffect(() => {
    let active = true;

    const syncRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${companyId}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            name: user.name,
            role: user.role,
            isCameraOn,
            isMuted,
            isRequestingToSpeak: isRequestingSpeak,
            isSpeaking: isSpeaking && !isMuted && hasSpeakPermission,
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id}`
          })
        });

        if (!response.ok) return;
        const data: MeetingRoomState & { kicked?: boolean; delegatedHostId?: string | null } = await response.json();

        if (active) {
          if (data.kicked) {
            alert("You have been removed / kicked from this meeting room by the Administrator.");
            onLeave();
            return;
          }

          setParticipants(data.participants);
          setActiveSpeakerId(data.activeSpeakerId);
          setCurrentSpeakerId(data.currentSpeakerId);
          setSpeakerQueue(data.speakerQueue);
          setDelegatedHostId(data.delegatedHostId || null);

          // If current speaker permission was taken away and we are currently speaking, force stop speaking
          if (data.currentSpeakerId !== null && data.currentSpeakerId !== user.id && !isManagerOrAdmin) {
            setIsSpeaking(false);
          }
        }
      } catch (err) {
        console.error("Room sync error:", err);
      }
    };

    // Initial sync
    syncRoom();

    // Set polling interval
    const interval = setInterval(syncRoom, 2000);

    return () => {
      active = false;
      clearInterval(interval);
      
      // Notify server we are leaving
      fetch(`/api/rooms/${companyId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      }).catch(err => console.error(err));
    };
  }, [companyId, user, isCameraOn, isMuted, isRequestingSpeak, isSpeaking, hasSpeakPermission, isManagerOrAdmin]);

  // Audio wave visual animation generator
  useEffect(() => {
    if (isSpeaking && !isMuted && hasSpeakPermission) {
      const animate = () => {
        setWaveHeights(Array.from({ length: 6 }, () => Math.floor(Math.random() * 35) + 5));
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      setWaveHeights([5, 5, 5, 5, 5, 5]);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSpeaking, isMuted, hasSpeakPermission]);

  // Handle raise hand / speaking request
  const handleToggleRequestSpeak = async () => {
    const action = !isRequestingSpeak ? "add" : "remove";
    setIsRequestingSpeak(!isRequestingSpeak);
    
    try {
      await fetch(`/api/rooms/${companyId}/request-speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Grant Mic permission (Manager Only)
  const handleGrantMic = async (targetUserId: string | null) => {
    try {
      await fetch(`/api/rooms/${companyId}/permit-speaker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: user.id,
          targetUserId
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Reset controls (Manager Only)
  const handleResetControls = async () => {
    try {
      await fetch(`/api/rooms/${companyId}/reset-controls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: user.id })
      });
      setIsRequestingSpeak(false);
      setIsSpeaking(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Delegate Host status (Main Host Only)
  const handleToggleDelegate = async (targetUserId: string) => {
    const newDelegateId = delegatedHostId === targetUserId ? null : targetUserId;
    try {
      const response = await fetch(`/api/rooms/${companyId}/delegate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: user.id, targetUserId: newDelegateId })
      });
      if (response.ok) {
        const data = await response.json();
        setDelegatedHostId(data.delegatedHostId || null);
      }
    } catch (err) {
      console.error("Delegation error:", err);
    }
  };

  // Kick Participant (Managers or Co-hosts Only)
  const handleKickParticipant = async (targetUserId: string) => {
    if (!window.confirm("Are you sure you want to kick/remove this participant from the meeting?")) return;
    try {
      const response = await fetch(`/api/rooms/${companyId}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: user.id, targetUserId })
      });
      if (response.ok) {
        setParticipants(prev => prev.filter(p => p.userId !== targetUserId));
      }
    } catch (err) {
      console.error("Kick error:", err);
    }
  };

  // Toggle local speak simulation
  const handleToggleSpeaking = () => {
    if (!hasSpeakPermission) return;
    setIsSpeaking(!isSpeaking);
  };

  // Resolve manager participant to display in the big card
  // First look for super_admin, then company_manager, or fall back to any manager
  const managerParticipant = participants.find(
    p => p.role === "super_admin" || p.role === "company_manager"
  );

  // Active speaker details
  const activeSpeaker = participants.find(p => p.userId === activeSpeakerId);

  // Focus entity: Decide what to show on the BIG SCREEN (Leader View vs Auto-Speaker Switch)
  const focusParticipant = activeSpeaker && activeSpeakerId !== managerParticipant?.userId
    ? activeSpeaker 
    : (managerParticipant || participants[0] || {
        userId: user.id,
        name: user.name,
        role: user.role,
        isCameraOn,
        isMuted,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id}`
      });

  return (
    <div className="space-y-6">
      {/* Room Header Banner */}
      <div className="bg-[#121418] text-white rounded-2xl p-4 sm:p-6 border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[9px] bg-black/40 px-2 py-0.5 rounded text-amber-400 font-mono tracking-widest font-bold border border-white/5">
              KHALIQORA SECURE PROTOCOL
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white">{companyName} Room</h2>
          <p className="text-xs text-slate-500 font-mono">
            Active participants: <strong className="text-slate-300 font-bold">{participants.length}</strong> | Speak-on-turn: Enabled
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-3">
          {isManagerOrAdmin && (
            <button
              onClick={handleResetControls}
              className="bg-[#1c1f26] hover:bg-[#252a33] text-amber-400 px-3.5 py-1.5 rounded-xl border border-white/5 text-xs font-mono font-bold flex items-center space-x-1 transition-all"
              title="Reset speaker permits and mute everyone"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Reset Room</span>
            </button>
          )}
          <button
            onClick={onLeave}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-rose-950/20 transition-all flex items-center space-x-1"
          >
            <X className="h-3.5 w-3.5" />
            <span>Leave Room</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Top big Manager focus, bottom small grids */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* BIG SCREEN: Manager / Active Speaker Screen */}
        <div className="xl:col-span-3 space-y-4">
          <div className="relative bg-slate-950 border border-white/5 rounded-3xl aspect-video w-full overflow-hidden shadow-2xl group flex flex-col justify-between p-6">
            
            {/* Top Bar on Video Feed */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center space-x-1.5 bg-[#121418]/90 backdrop-blur border border-white/5 text-white px-3.5 py-1.5 rounded-full text-xs font-bold font-mono">
                {focusParticipant.role === "super_admin" ? (
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />
                ) : (
                  <Shield className="h-4 w-4 text-indigo-400 shrink-0" />
                )}
                <span>
                  {focusParticipant.role === "super_admin" 
                    ? "EMPIRE OWNER" 
                    : focusParticipant.role === "company_manager" 
                    ? "COMPANY MANAGER" 
                    : "ACTIVE PRESENTER"}
                </span>
              </div>

              {focusParticipant.userId === activeSpeakerId && (
                <div className="inline-flex items-center space-x-2 bg-emerald-500/90 backdrop-blur border border-emerald-400/50 text-white px-3.5 py-1.5 rounded-full text-xs font-black animate-pulse">
                  <Volume2 className="h-4 w-4" />
                  <span>ACTIVE SPEAKER SWITCHED</span>
                </div>
              )}
            </div>

            {/* Video Stream Simulation Body */}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
              {focusParticipant.isCameraOn ? (
                focusParticipant.userId === user.id && localStream ? (
                  <video
                    ref={(el) => {
                      if (el) el.srcObject = localStream;
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-3xl"
                  />
                ) : (
                  /* Simulated scanning webcam stream */
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                      src={focusParticipant.avatarUrl}
                      alt={focusParticipant.name}
                      className="h-3/4 object-contain filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.5)] z-10 transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Glowing background halo */}
                    <div className={`absolute h-72 w-72 rounded-full filter blur-[100px] transition-all duration-1000 ${
                      focusParticipant.userId === activeSpeakerId ? "bg-emerald-500/15" : "bg-amber-500/5"
                    }`} />
                    
                    {/* Overlay digital CRT line effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/10 to-transparent pointer-events-none opacity-20 bg-[length:100%_4px]" />
                  </div>
                )
              ) : (
                /* Camera is off avatar placeholder */
                <div className="text-center space-y-3 relative z-10">
                  <div className="bg-[#121418] border border-white/5 p-6 rounded-full mx-auto w-24 h-24 flex items-center justify-center shadow-inner">
                    <VideoOff className="h-10 w-10 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 font-mono">Webcam Feed Paused</p>
                </div>
              )}
            </div>

            {/* Bottom Info bar on Video Feed */}
            <div className="relative z-10 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 rounded-b-3xl -mx-6 -mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-lg font-black text-white tracking-tight">{focusParticipant.name}</p>
                <p className="text-xs text-slate-500 font-mono">
                  Room Connection: Secure (SSL/TLS 1.3)
                </p>
              </div>

              {/* Waveform indicator if speaking */}
              {focusParticipant.userId === activeSpeakerId && (
                <div className="flex items-end space-x-1 h-6 px-3 py-1 bg-[#121418]/80 border border-white/5 rounded-lg">
                  {waveHeights.map((h, i) => (
                    <div
                       key={i}
                      style={{ height: `${h}px` }}
                      className="w-1.5 bg-emerald-500 rounded-full transition-all duration-150"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Local User Controls & Speaking simulator */}
          <div className="bg-[#121418] border border-white/5 rounded-2xl p-5 shadow-2xl space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
              YOUR PERSONAL TRANSMITTER DEVICE
            </h4>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-4">
              
              {/* Media Toggles */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsCameraOn(!isCameraOn)}
                  className={`p-3.5 rounded-xl border flex items-center justify-center transition-all ${
                    isCameraOn
                      ? "bg-[#1c1f26] text-slate-200 border-white/5 hover:bg-[#252a33]"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                  }`}
                  title={isCameraOn ? "Mute Camera Video" : "Start Camera Video"}
                >
                  {isCameraOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3.5 rounded-xl border flex items-center justify-center transition-all ${
                    !isMuted
                      ? "bg-[#1c1f26] text-slate-200 border-white/5 hover:bg-[#252a33]"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {!isMuted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>

                {/* Hand raise for Staff members */}
                {!isManagerOrAdmin && (
                  <button
                    onClick={handleToggleRequestSpeak}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
                      isRequestingSpeak
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                        : "bg-[#1c1f26] text-slate-300 border-white/5 hover:bg-[#252a33]"
                    }`}
                  >
                    <Hand className="h-4 w-4" />
                    <span>{isRequestingSpeak ? "Hand Raised" : "Request to Speak"}</span>
                  </button>
                )}
              </div>

              {/* Speak State simulation */}
              <div className="flex items-center space-x-3 bg-[#1c1f26] border border-white/5 rounded-xl p-2 sm:px-4 shrink-0 justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-500 font-mono leading-none">SPEECH STATUS</p>
                  <p className={`text-xs font-bold ${
                    !hasSpeakPermission 
                      ? "text-rose-400" 
                      : isMuted 
                      ? "text-slate-500" 
                      : isSpeaking 
                      ? "text-emerald-400 animate-pulse" 
                      : "text-slate-300"
                  }`}>
                    {!hasSpeakPermission 
                      ? "Muted (Wait Turn)" 
                      : isMuted 
                      ? "Muted" 
                      : isSpeaking 
                      ? "Speaking Now..." 
                      : "Ready to Talk"}
                  </p>
                </div>

                <button
                  onClick={handleToggleSpeaking}
                  disabled={!hasSpeakPermission || isMuted}
                  className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider shadow transition-all ${
                    isSpeaking && !isMuted
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : "bg-[#121418] text-white hover:bg-[#1a1d24] border border-white/5 disabled:bg-[#1c1f26] disabled:text-slate-600 disabled:border-none disabled:shadow-none"
                  }`}
                >
                  {isSpeaking ? "STOP SPEAKING" : "START SPEAKING"}
                </button>
              </div>

            </div>

            {/* Instruction footnote */}
            {!hasSpeakPermission && (
              <p className="text-[11px] text-rose-400 font-semibold flex items-center space-x-1 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                <Shield className="h-3.5 w-3.5" />
                <span>
                  The Company Manager has enabled Structured Speaking. Please click **"Request to Speak"** and wait for the manager to assign you the microphone.
                </span>
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Speaking turn queue, microphone controllers (Manager panel) */}
        <div className="space-y-6">
          
          {/* Manager microphone dashboard control */}
          {isManagerOrAdmin && (
            <div className="bg-[#121418] text-white border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-black text-amber-400 flex items-center space-x-1.5 uppercase font-mono tracking-wider">
                  <Settings className="h-4 w-4" />
                  <span>Microphone Control Panel</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">Assign speaker rights to companies' staff</p>
              </div>

              {/* Speaker Queue list */}
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 font-mono">SPEAKER REQUEST QUEUE ({speakerQueue.length})</p>
                
                {speakerQueue.length === 0 ? (
                  <p className="text-xs text-slate-600 italic py-4 text-center border border-dashed border-white/10 rounded-xl font-mono">
                    No active speech requests.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {speakerQueue.map((queueUserId) => {
                      const requester = participants.find(p => p.userId === queueUserId);
                      if (!requester) return null;
                      return (
                        <div
                          key={queueUserId}
                          className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between"
                        >
                          <span className="text-xs font-bold text-slate-300 truncate max-w-[120px]">{requester.name}</span>
                          <button
                            onClick={() => handleGrantMic(queueUserId)}
                            className="bg-amber-500 text-slate-950 hover:bg-amber-400 px-2.5 py-1 rounded text-[10px] font-black transition-all flex items-center space-x-0.5"
                          >
                            <UserCheck className="h-3 w-3" />
                            <span>Permit Mic</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Current Speaker Indicator / Relinquish control */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <p className="text-[11px] text-slate-500 font-mono">CURRENT DESIGNATED SPEAKER</p>
                {currentSpeakerId ? (
                  <div className="bg-[#1c1f26] border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">
                        {participants.find(p => p.userId === currentSpeakerId)?.name || "Unknown user"}
                      </p>
                      <p className="text-[10px] text-amber-500 font-mono leading-none">Has Microphone Rights</p>
                    </div>
                    <button
                      onClick={() => handleGrantMic(null)}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2 py-1 rounded-lg text-[10px] font-mono font-bold"
                    >
                      Revoke
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-emerald-400 font-bold">Open Discussion Mode</p>
                    <p className="text-[9px] text-slate-500 font-mono">Anyone can unmute and start speaking</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connected Participants List */}
          <div className="bg-[#121418] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
            <h3 className="text-xs font-black text-slate-500 font-mono uppercase tracking-wider flex items-center justify-between">
              <span>CONNECTED STAFF ({participants.length})</span>
              <Users className="h-4 w-4" />
            </h3>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {participants.map((part) => {
                const isUserActiveSpeaker = part.userId === activeSpeakerId;
                const isUserDesignatedSpeaker = part.userId === currentSpeakerId;
                
                return (
                  <div
                    key={part.userId}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isUserActiveSpeaker
                        ? "bg-emerald-500/10 border-emerald-500/20 shadow-sm"
                        : "bg-[#1c1f26] border-white/5"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="relative">
                        <img
                          src={part.avatarUrl}
                          alt={part.name}
                          className="h-8 w-8 rounded-full bg-slate-900 border border-white/10"
                        />
                        {/* Status dot */}
                        <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#121418] ${
                          part.isCameraOn ? "bg-emerald-500" : "bg-slate-500"
                        }`} />
                      </div>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1">
                          <p className="text-xs font-bold text-white truncate max-w-[90px]">{part.name}</p>
                          {delegatedHostId === part.userId && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/20 px-1 rounded-[4px] text-[7px] font-black tracking-wider uppercase">
                              CO-HOST
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono capitalize leading-none">
                          {part.role === "super_admin" ? "Khaliqora Administrator" : part.role === "company_manager" ? "Manager" : "Staff"}
                        </p>
                      </div>
                    </div>

                    {/* Status & Action Icons */}
                    <div className="flex items-center space-x-2 pl-2">
                      {part.isRequestingToSpeak && (
                        <Hand className="h-3.5 w-3.5 text-amber-500 animate-bounce shrink-0" title="Requesting to speak" />
                      )}
                      
                      {isUserDesignatedSpeaker && (
                        <span className="bg-amber-500/20 text-amber-400 p-0.5 px-1.5 rounded text-[8px] font-mono font-bold shrink-0">
                          MIC
                        </span>
                      )}

                      {/* Main Host: Co-Host delegation button */}
                      {isMainHost && part.userId !== user.id && (
                        <button
                          onClick={() => handleToggleDelegate(part.userId)}
                          className={`p-1 rounded-lg transition-all shrink-0 ${
                            delegatedHostId === part.userId
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                              : "bg-[#121418] border border-white/5 text-slate-500 hover:text-slate-300"
                          }`}
                          title={delegatedHostId === part.userId ? "Revoke Co-Host Delegation" : "Delegate Host Authority (Allow meeting in place of me)"}
                        >
                          <Star className={`h-3.5 w-3.5 ${delegatedHostId === part.userId ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
                        </button>
                      )}

                      {/* Manager/Admin or Co-Host: Kick Participant button */}
                      {isManagerOrAdmin && part.userId !== user.id && part.role !== "super_admin" && part.role !== "company_manager" && (
                        <button
                          onClick={() => handleKickParticipant(part.userId)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-1 rounded-lg transition-all shrink-0"
                          title="Kick / Remove Participant"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {isUserActiveSpeaker ? (
                        <div className="flex items-center justify-center shrink-0">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        </div>
                      ) : part.isMuted ? (
                        <MicOff className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      ) : (
                        <Mic className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Grid: Lower level smaller participant boxes */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 font-mono uppercase tracking-wider">
          PARTICIPANTS WEBCAM TILES ({participants.length})
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {participants.map((part) => {
            const isUserActiveSpeaker = part.userId === activeSpeakerId;
            return (
              <div
                key={part.userId}
                className={`relative bg-slate-950 rounded-2xl overflow-hidden aspect-video border transition-all flex flex-col justify-between p-3 group ${
                  isUserActiveSpeaker
                    ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-102"
                    : "border-white/5"
                }`}
              >
                {/* Webcam Image or Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                  {part.isCameraOn ? (
                    part.userId === user.id && localStream ? (
                      <video
                        ref={(el) => {
                          if (el) el.srcObject = localStream;
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={part.avatarUrl}
                        alt={part.name}
                        className="h-4/5 object-contain filter drop-shadow z-10 transition-transform duration-300 group-hover:scale-105"
                      />
                    )
                  ) : (
                    <VideoOff className="h-6 w-6 text-slate-800" />
                  )}
                </div>

                {/* Speaker indicator halo */}
                {isUserActiveSpeaker && (
                  <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none" />
                )}

                {/* Top overlay elements */}
                <div className="relative z-10 flex justify-between items-start pointer-events-none">
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded text-white font-bold backdrop-blur/70 ${
                    part.role === "super_admin" || part.role === "company_manager"
                      ? "bg-amber-500/90"
                      : "bg-[#121418]/90 border border-white/5"
                  }`}>
                    {part.role === "super_admin" ? "Owner" : part.role === "company_manager" ? "Manager" : "Staff"}
                  </span>

                  {part.isRequestingToSpeak && (
                    <Hand className="h-3.5 w-3.5 text-amber-500 fill-amber-500 animate-bounce shrink-0" />
                  )}
                </div>

                {/* Bottom Overlay Label */}
                <div className="relative z-10 flex items-center justify-between text-white bg-black/75 backdrop-blur-xs p-1 rounded-lg -mx-1 -mb-1 border border-white/5">
                  <p className="text-[10px] font-bold truncate max-w-[70%]">{part.name}</p>
                  
                  {isUserActiveSpeaker ? (
                    <div className="flex space-x-0.5 items-end h-3">
                      <div className="w-0.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <div className="w-0.5 h-2.5 bg-emerald-500 rounded-full animate-pulse delay-75" />
                      <div className="w-0.5 h-2 bg-emerald-500 rounded-full animate-pulse delay-150" />
                    </div>
                  ) : part.isMuted ? (
                    <MicOff className="h-3 w-3 text-rose-500" />
                  ) : (
                    <Mic className="h-3 w-3 text-slate-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
