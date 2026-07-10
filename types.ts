export type UserRole = "super_admin" | "company_manager" | "staff";
export type StaffStatus = "pending" | "approved";

export interface Company {
  id: string;
  name: string;
  code: string; // Special code used by staff to sign up under this company
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  cnic: string;
  mobile: string;
  role: UserRole;
  companyId?: string; // Empty for super_admin
  status: StaffStatus; // Admin must approve staff members before they can join meetings
  createdAt: string;
}

export interface MeetingPost {
  id: string;
  title: string;
  timing: string;
  description: string;
  companyId: string;
  companyName: string;
  postedBy: string; // User name
  createdAt: string;
}

export interface ParticipantState {
  userId: string;
  name: string;
  role: UserRole;
  isCameraOn: boolean;
  isMuted: boolean;
  isRequestingToSpeak: boolean;
  isSpeaking: boolean;
  avatarUrl: string;
}

export interface MeetingRoomState {
  roomId: string;
  companyId: string;
  participants: ParticipantState[];
  activeSpeakerId: string | null;
  speakerQueue: string[]; // User IDs waiting to speak
  currentSpeakerId: string | null; // Who is currently permitted to speak
}
