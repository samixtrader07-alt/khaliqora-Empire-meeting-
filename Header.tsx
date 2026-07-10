import React from "react";
import { LogOut, Shield, Users, Calendar, Video } from "lucide-react";
import { User } from "../types";
import KhaliqoraLogo from "./KhaliqoraLogo";

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  companyName?: string;
}

export default function Header({ user, onLogout, activeTab, setActiveTab, companyName }: HeaderProps) {
  return (
    <header className="bg-brand-header border-b border-white/5 text-slate-200 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab("home")}>
          <KhaliqoraLogo iconOnly={true} size="md" className="group-hover:scale-105 transition-transform" />
          <div className="text-left">
            <h1 className="text-sm font-black tracking-[0.2em] text-slate-100 font-sans">KHALIQORA</h1>
            <p className="text-[7px] text-slate-500 font-mono tracking-[0.2em] uppercase mt-0.5 font-bold">GLOBAL PARENT COMPANY</p>
          </div>
        </div>

        {/* Current Active Meeting indicator if any */}
        {companyName && (
          <div className="hidden md:flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-[11px] font-mono animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            <span>Live Room: {companyName}</span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex items-center space-x-1 sm:space-x-3">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex items-center space-x-1 sm:space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "home"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Notice Board</span>
          </button>

          {user && (
            <button
              onClick={() => setActiveTab("meeting")}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "meeting"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span>Meeting Rooms</span>
            </button>
          )}

          {user && (user.role === "super_admin" || user.email === "hafsaanum91@gmail.com" || user.email === "admin@khaliqora.com") && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "admin"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Khaliqora Administrator</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center pl-2 sm:pl-4 border-l border-white/5 space-x-3">
              <div className="hidden lg:block text-right">
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest font-mono">
                  {user.role === "super_admin" ? "Khaliqora Administrator" : user.role === "company_manager" ? "Manager" : "Staff"}
                </p>
                <p className="text-xs text-slate-200 font-semibold truncate max-w-[120px]">{user.name}</p>
              </div>
              
              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab("auth")}
              className="ml-2 bg-amber-500 text-slate-950 hover:bg-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Portal Login</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
