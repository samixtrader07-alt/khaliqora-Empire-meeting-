import React, { useState, useEffect } from "react";
import { Company, User } from "../types";
import { Building2, Users, CalendarDays, Check, Plus, Trash2, ShieldAlert, Award, Search, CheckCircle, Lock, Unlock } from "lucide-react";

interface AdminPanelProps {
  user: User;
  companies: Company[];
  onCompanyAdded: () => void;
  onPostCreated: () => void;
}

export default function AdminPanel({ user, companies, onCompanyAdded, onPostCreated }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"companies" | "staff" | "posts">(
    user.role === "super_admin" ? "companies" : "staff"
  );
  
  const [staffList, setStaffList] = useState<(User & { companyName?: string })[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forms
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCode, setNewCompanyCode] = useState("");
  
  const [postTitle, setPostTitle] = useState("");
  const [postTiming, setPostTiming] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postTargetCompany, setPostTargetCompany] = useState("all");

  const isSuperAdmin = user.role === "super_admin";

  const fetchStaff = async () => {
    setIsLoadingStaff(true);
    try {
      const url = `/api/staff?adminId=${user.id}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [user.id, activeSubTab]);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newCompanyName.trim() || !newCompanyCode.trim()) {
      setError("Please fill out all company fields.");
      return;
    }

    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCompanyName.trim(),
          code: newCompanyCode.toUpperCase().trim(),
          adminId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add company.");

      setSuccess(`Company "${data.company.name}" added successfully with join code: ${data.company.code}`);
      setNewCompanyName("");
      setNewCompanyCode("");
      onCompanyAdded();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApproveStaff = async (staffId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/staff/${staffId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: user.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(`Staff account "${data.staff.name}" approved successfully!`);
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePromoteStaff = async (staffId: string, currentRole: string) => {
    setError(null);
    setSuccess(null);
    const targetRole = currentRole === "staff" ? "company_manager" : "staff";
    try {
      const response = await fetch(`/api/staff/${staffId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: user.id, role: targetRole })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(`User role updated to ${targetRole === "company_manager" ? "Company Manager" : "Staff"}!`);
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm("Are you sure you want to remove this staff member? This action is irreversible.")) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/staff/${staffId}?adminId=${user.id}`, {
        method: "DELETE"
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess("Staff member removed successfully.");
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleBlockStaff = async (staffId: string, currentStatus: string) => {
    const isBlocking = currentStatus !== "blocked";
    if (!window.confirm(`Are you sure you want to ${isBlocking ? "BLOCK" : "UNBLOCK"} this staff member? ${isBlocking ? "They will be disconnected from any active meetings and prevented from logging in." : "They will be able to log in again."}`)) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/staff/${staffId}/toggle-block`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: user.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(data.message);
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!postTitle.trim() || !postTiming || !postDescription.trim()) {
      setError("Please fill out all meeting schedule details.");
      return;
    }

    try {
      const response = await fetch("/api/meetings/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postTitle.trim(),
          timing: postTiming,
          description: postDescription.trim(),
          companyId: postTargetCompany,
          userId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess("Meeting schedule posted to the central notice board successfully!");
      setPostTitle("");
      setPostTiming("");
      setPostDescription("");
      onPostCreated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter staff by search keyword
  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cnic.includes(searchTerm) ||
      s.mobile.includes(searchTerm) ||
      (s.companyName && s.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-[#121418] border border-white/5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] p-6 sm:p-8 space-y-8">
      {/* Admin Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5 gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Khaliqora Administrator Suite</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isSuperAdmin
              ? "Super Admin level clearance - manage companies, staff credentials, and post global timers"
              : "Company Manager clearance - manage team approvals and schedules"}
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex bg-[#0d0f12] p-1 rounded-xl border border-white/5">
          {isSuperAdmin && (
            <button
              onClick={() => setActiveSubTab("companies")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === "companies"
                  ? "bg-[#1c1f26] text-amber-500 shadow-md border border-white/5"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Add Companies</span>
            </button>
          )}
          <button
            onClick={() => setActiveSubTab("staff")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "staff" ? "bg-[#1c1f26] text-amber-500 shadow-md border border-white/5" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Staff Approvals ({staffList.filter((s) => s.status === "pending").length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("posts")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "posts" ? "bg-[#1c1f26] text-amber-500 shadow-md border border-white/5" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Schedule Posting</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs flex items-start space-x-2">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-rose-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs flex items-start space-x-2">
          <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-500 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* SUB PANELS */}

      {/* 1. Companies Panel (Super Admin only) */}
      {isSuperAdmin && activeSubTab === "companies" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-[#1c1f26] rounded-2xl p-5 border border-white/5 h-fit space-y-4">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5 border-b border-white/5 pb-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              <span>Register New Company</span>
            </h3>

            <form onSubmit={handleAddCompany} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 block">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Khaliqora Cement"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121418] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 block">Unique Join Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KQ-CEM-808"
                  value={newCompanyCode}
                  onChange={(e) => setNewCompanyCode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121418] border border-white/5 rounded-xl text-xs text-amber-400 font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
                <p className="text-[10px] text-slate-500 font-mono leading-normal">
                  Staff must provide this precise code during registration to join this company.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold py-2 px-4 rounded-xl text-xs shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add to Khaliqora Group</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Active Companies ({companies.length} of 106)</h4>
              <span className="text-[10px] bg-[#1c1f26] border border-white/5 text-slate-400 px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">
                {106 - companies.length} Slots Remaining
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {companies.map((c) => (
                <div key={c.id} className="border border-white/5 bg-[#1c1f26] rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="font-bold text-slate-200 text-xs">{c.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">ID: {c.id}</p>
                  </div>
                  <div className="bg-black/30 border border-white/5 px-2.5 py-1 rounded text-center">
                    <p className="text-[8px] text-slate-500 font-mono leading-none uppercase">JOIN CODE</p>
                    <p className="text-xs font-bold text-amber-500 font-mono tracking-wider">{c.code}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Staff Approvals & Management Panel */}
      {activeSubTab === "staff" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              Registered Staff Management
            </h3>

            {/* Staff Search */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search staff, CNIC, mobile, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 placeholder:text-slate-600 transition-all"
              />
            </div>
          </div>

          {isLoadingStaff ? (
            <p className="text-xs text-slate-500 text-center py-8">Loading staff directory...</p>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
              <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No staff accounts found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-white/5 rounded-xl shadow-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0d0f12] border-b border-white/5 text-[9px] text-slate-500 uppercase font-mono tracking-wider">
                    <th className="p-3.5 font-bold">Name & Credentials</th>
                    <th className="p-3.5 font-bold">CNIC & Mobile</th>
                    <th className="p-3.5 font-bold">Company Group</th>
                    <th className="p-3.5 font-bold">Role</th>
                    <th className="p-3.5 font-bold text-center">Status</th>
                    <th className="p-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-[#1c1f26] transition-colors">
                      <td className="p-3.5">
                        <div>
                          <p className="font-bold text-white text-sm">{staff.name}</p>
                          <p className="text-slate-500 font-mono text-[10px]">{staff.email}</p>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] space-y-0.5">
                        <div>
                          <span className="text-slate-500">CNIC: </span>
                          <span className="text-slate-200 font-bold">{staff.cnic}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Mob: </span>
                          <span className="text-slate-300">{staff.mobile}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded text-[11px]">
                          {staff.companyName}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            staff.role === "company_manager"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-slate-800 text-slate-400 border-white/5"
                          }`}
                        >
                          {staff.role === "company_manager" ? "Manager" : "Staff"}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            staff.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : staff.status === "blocked"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                          }`}
                        >
                          {staff.status === "approved" ? "Approved" : staff.status === "blocked" ? "Blocked" : "Pending Approval"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {staff.status === "pending" && (
                          <button
                            onClick={() => handleApproveStaff(staff.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 p-1 rounded-lg transition-all inline-flex items-center justify-center font-bold"
                            title="Approve Staff Member"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {staff.status !== "pending" && (
                          <button
                            onClick={() => handleToggleBlockStaff(staff.id, staff.status)}
                            className={`p-1 rounded-lg transition-all inline-flex items-center justify-center ${
                              staff.status === "blocked"
                                ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                            }`}
                            title={staff.status === "blocked" ? "Unblock Staff Member" : "Block Staff Member"}
                          >
                            {staff.status === "blocked" ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handlePromoteStaff(staff.id, staff.role)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1 rounded-lg transition-all inline-flex items-center justify-center"
                            title={staff.role === "staff" ? "Promote to Manager" : "Demote to Staff"}
                          >
                            <Award className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-1 rounded-lg transition-all inline-flex items-center justify-center"
                          title="Delete Staff"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Meeting Schedule Posting Panel */}
      {activeSubTab === "posts" && (
        <div className="max-w-2xl mx-auto bg-[#1c1f26] border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5 border-b border-white/5 pb-2">
            <CalendarDays className="h-4 w-4 text-amber-500" />
            <span>Post Combined Timing Notification</span>
          </h3>

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 block">Meeting Subject / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Operational Review"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121418] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 placeholder:text-slate-600 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 block">Meeting Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={postTiming}
                  onChange={(e) => setPostTiming(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121418] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 font-mono transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 block">Target Company Room</label>
              <select
                value={postTargetCompany}
                onChange={(e) => setPostTargetCompany(e.target.value)}
                className="w-full px-3 py-2 bg-[#121418] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 appearance-none transition-all"
              >
                <option value="all" className="bg-[#121418]">All Companies (Combined Empire Alert)</option>
                {isSuperAdmin
                  ? companies.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#121418]">
                        {c.name} (Room {c.code})
                      </option>
                    ))
                  : companies
                      .filter((c) => c.id === user.companyId)
                      .map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#121418]">
                          {c.name} (Room {c.code})
                        </option>
                      ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 block">Agenda & Description</label>
              <textarea
                required
                rows={4}
                placeholder="Write clear instructions, meeting link requirements, or agenda items for staff to review before entering the room..."
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value)}
                className="w-full px-3 py-2 bg-[#121418] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 placeholder:text-slate-600 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold py-2.5 px-4 rounded-xl text-xs shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center space-x-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Publish Timing Post</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
