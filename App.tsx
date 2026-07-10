import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import AuthPage from "./components/AuthPage";
import AdminPanel from "./components/AdminPanel";
import MeetingRoom from "./components/MeetingRoom";
import { Company, MeetingPost, User } from "./types";
import { RefreshCw, AlertCircle, Sparkles, Building, Video } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [meetingPosts, setMeetingPosts] = useState<MeetingPost[]>([]);
  const [activeTab, setActiveTab] = useState<string>("home");
  
  // Active Room state
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeCompanyName, setActiveCompanyName] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Load companies and active user session on startup
  useEffect(() => {
    // 1. Restore user session
    const savedUser = localStorage.getItem("khaliqora_session");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("khaliqora_session");
      }
    }

    // 2. Fetch companies
    fetchCompanies();
    
    // 3. Fetch schedules
    fetchMeetingPosts();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/companies");
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
      setAppError("Failed to connect to full-stack server. Verify backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMeetingPosts = async () => {
    try {
      const response = await fetch("/api/meetings/posts");
      if (response.ok) {
        const data = await response.json();
        setMeetingPosts(data);
      }
    } catch (err) {
      console.error("Failed to load timeline posts:", err);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem("khaliqora_session", JSON.stringify(loggedInUser));
    
    // If approved, go to home or meeting room directly
    if (loggedInUser.role === "super_admin" || loggedInUser.email === "hafsaanum91@gmail.com" || loggedInUser.email === "admin@khaliqora.com") {
      setActiveTab("admin");
    } else {
      setActiveTab("home");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("khaliqora_session");
    setActiveCompanyId(null);
    setActiveCompanyName("");
    setActiveTab("home");
  };

  const handleEnterRoom = (companyId: string) => {
    if (!user) {
      setActiveTab("auth");
      return;
    }

    // If staff/manager, verify they belong to this company
    if (user.role !== "super_admin" && user.companyId !== companyId) {
      alert("Unauthorized: Staff members can only enter their designated company room.");
      return;
    }

    const company = companies.find((c) => c.id === companyId);
    if (company) {
      setActiveCompanyId(companyId);
      setActiveCompanyName(company.name);
      setActiveTab("meeting");
    }
  };

  const handleLeaveRoom = () => {
    setActiveCompanyId(null);
    setActiveCompanyName("");
    setActiveTab("home");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Central Notification of server health */}
      {appError && (
        <div className="bg-rose-600 text-white p-3 text-center text-xs font-mono font-bold flex items-center justify-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{appError}</span>
          <button onClick={fetchCompanies} className="underline hover:text-rose-100 flex items-center space-x-1 pl-2">
            <RefreshCw className="h-3 w-3 inline" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        companyName={activeCompanyName || undefined}
      />

      {/* Main Body */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: Dashboard Notice board */}
        {activeTab === "home" && (
          <Dashboard
            companies={companies}
            meetingPosts={meetingPosts}
            onRefresh={fetchMeetingPosts}
            isLoading={isLoading}
            onEnterRoom={handleEnterRoom}
            isLoggedIn={!!user}
          />
        )}

        {/* TAB 2: Authentication portal */}
        {activeTab === "auth" && (
          <AuthPage
            companies={companies}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {/* TAB 3: Admin panels */}
        {activeTab === "admin" && user && (user.role === "super_admin" || user.email === "hafsaanum91@gmail.com" || user.email === "admin@khaliqora.com") && (
          <AdminPanel
            user={user}
            companies={companies}
            onCompanyAdded={() => {
              fetchCompanies();
              fetchMeetingPosts();
            }}
            onPostCreated={fetchMeetingPosts}
          />
        )}

        {/* TAB 4: Active meeting room view */}
        {activeTab === "meeting" && (
          <div>
            {user ? (
              activeCompanyId ? (
                <MeetingRoom
                  user={user}
                  companyId={activeCompanyId}
                  companyName={activeCompanyName}
                  onLeave={handleLeaveRoom}
                />
              ) : (
                <div className="max-w-md mx-auto text-center space-y-6 bg-white border border-slate-200 p-8 rounded-2xl shadow-lg mt-10">
                  <Video className="h-12 w-12 text-slate-400 mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Enter a Company Meeting Room</h3>
                    <p className="text-sm text-slate-500">
                      Select your company room from the directory list on the main Notice Board to initiate or join live sessions.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("home")}
                    className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow hover:shadow-md"
                  >
                    View Notice Board & Directory
                  </button>
                </div>
              )
            ) : (
              <div className="max-w-md mx-auto text-center space-y-4 bg-white border border-slate-200 p-8 rounded-2xl shadow-lg mt-10">
                <p className="text-slate-600 text-sm font-medium">
                  Authentication is required to enter any of Khaliqora Empire's secure meeting rooms.
                </p>
                <button
                  onClick={() => setActiveTab("auth")}
                  className="bg-amber-500 text-slate-950 font-bold px-6 py-2 rounded-xl text-sm transition-all"
                >
                  Go to Login Portal
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-center text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2 justify-center sm:justify-start">
            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
            <span>Khaliqora Empire Secure Communications</span>
          </div>
          <p>© 2026 Khaliqora Empire Group of Industries. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
