import React, { useState } from "react";
import { Company, MeetingPost } from "../types";
import { Search, Calendar, Clock, MapPin, Sparkles, AlertCircle, RefreshCw, Building } from "lucide-react";
import KhaliqoraLogo from "./KhaliqoraLogo";

interface DashboardProps {
  companies: Company[];
  meetingPosts: MeetingPost[];
  onRefresh: () => void;
  isLoading: boolean;
  onEnterRoom: (companyId: string) => void;
  isLoggedIn: boolean;
}

export default function Dashboard({
  companies,
  meetingPosts,
  onRefresh,
  isLoading,
  onEnterRoom,
  isLoggedIn,
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative bg-gradient-to-br from-[#121418] via-[#0D0F12] to-[#121418] text-slate-200 rounded-2xl p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-hidden border border-white/5">
        <div className="absolute right-6 bottom-6 top-6 w-1/3 opacity-[0.08] pointer-events-none flex items-center justify-center">
          <KhaliqoraLogo iconOnly={true} size="xl" />
        </div>
        
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Khaliqora Group of Industries</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Khaliqora Empire Meeting Portal
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Welcome to the centralized secure digital workspace of the Khaliqora Empire. We govern 
            <span className="text-amber-500 font-bold px-1">106 enterprise companies</span> 
            under our umbrella, keeping team connection and planning unified.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="bg-[#1c1f26] border border-white/5 rounded-xl px-4 py-2 text-xs font-mono text-slate-400">
              <span className="text-amber-500 font-black block text-sm">106</span>
              Active Companies
            </div>
            <div className="bg-[#1c1f26] border border-white/5 rounded-xl px-4 py-2 text-xs font-mono text-slate-400">
              <span className="text-amber-500 font-black block text-sm">{companies.length}</span>
              Registered Rooms
            </div>
            <div className="bg-[#1c1f26] border border-white/5 rounded-xl px-4 py-2 text-xs font-mono text-slate-400">
              <span className="text-amber-500 font-black block text-sm">{meetingPosts.length}</span>
              Active Schedules
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Combined Schedule bulletin */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                <span>Combined Meeting Schedules</span>
              </h3>
              <p className="text-xs text-slate-500">Global schedule of meetings across all 106 companies</p>
            </div>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-amber-500 rounded-full hover:bg-white/5 transition-all flex items-center space-x-1"
              title="Refresh timeline"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {meetingPosts.length === 0 ? (
            <div className="bg-[#121418] border border-white/5 rounded-2xl p-8 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-slate-400 font-medium text-sm">No meeting schedules posted yet.</p>
              <p className="text-xs text-slate-500">Managers will post schedules here when meetings are planned.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetingPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-[#121418] border border-white/5 hover:border-amber-500/20 rounded-2xl p-5 shadow-lg transition-all space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="space-y-1">
                      <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Room: {post.companyName}
                      </div>
                      <h4 className="text-base font-bold text-white tracking-tight">{post.title}</h4>
                    </div>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-400 bg-[#1c1f26] px-2 py-1 rounded border border-white/5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-mono">{formatDateTime(post.timing)}</span>
                    </div>
                  </div>

                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{post.description}</p>

                  <div className="flex items-center justify-between pt-2.5 text-[11px] font-mono text-slate-500 border-t border-white/5">
                    <span>Posted by: <strong className="text-amber-500 font-semibold">{post.postedBy}</strong></span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>

                  {isLoggedIn && post.companyId !== "all" && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => onEnterRoom(post.companyId)}
                        className="bg-amber-500 text-slate-950 hover:bg-amber-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                      >
                        Join Room Now
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Company Directory */}
        <div className="space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-amber-500" />
              <span>Empire Directory</span>
            </h3>
            <p className="text-xs text-slate-500">Quick-find meetings & join codes for all 106 companies</p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search companies (e.g. Textiles, Logistics...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#121418] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="bg-[#121418] rounded-2xl p-3 border border-white/5 space-y-2 max-h-[500px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Companies ({companies.length})</span>
            </div>

            {filteredCompanies.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No matching companies found.</p>
            ) : (
              filteredCompanies.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-[#1c1f26] border border-white/5 rounded-xl p-3 hover:border-amber-500/20 transition-all flex items-center justify-between group cursor-pointer"
                  onClick={() => isLoggedIn && onEnterRoom(comp.id)}
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-200 text-xs group-hover:text-amber-500 transition-colors">
                      {comp.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] bg-black/40 text-slate-400 font-mono px-1.5 py-0.5 rounded">
                        ID: {comp.id}
                      </span>
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 font-mono px-1.5 py-0.5 rounded border border-amber-500/10 font-bold uppercase">
                        Code: {comp.code}
                      </span>
                    </div>
                  </div>

                  {isLoggedIn ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEnterRoom(comp.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 bg-amber-500 text-slate-950 hover:bg-amber-400 px-2 py-1.5 rounded-lg text-[10px] font-extrabold transition-all"
                      title={`Enter ${comp.name} Room`}
                    >
                      Join
                    </button>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-mono italic">Login to Join</p>
                  )}
                </div>
              ))
            )}
            {companies.length < 106 && (
              <div className="border border-dashed border-white/10 rounded-xl p-3 text-center text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                {106 - companies.length} more companies awaiting registration by Empire Admin
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
