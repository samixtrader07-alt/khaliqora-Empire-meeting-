import React, { useState } from "react";
import { Company, User } from "../types";
import { KeyRound, Mail, User as UserIcon, CreditCard, Phone, Building2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import KhaliqoraLogo from "./KhaliqoraLogo";

interface AuthPageProps {
  companies: Company[];
  onLoginSuccess: (user: User) => void;
}

export default function AuthPage({ companies, onLoginSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<"company_manager" | "staff">("staff");
  const [companyId, setCompanyId] = useState("");
  const [companyCode, setCompanyCode] = useState("");

  // Pre-fill the first company by default on load
  React.useEffect(() => {
    if (companies && companies.length > 0 && !companyId) {
      setCompanyId(companies[0].id);
      setCompanyCode(companies[0].code);
    }
  }, [companies, companyId]);

  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Allow only digits
    if (value.length > 13) value = value.substring(0, 13);
    
    // Auto-format Pakistani CNIC (XXXXX-XXXXXXX-X)
    let formatted = value;
    if (value.length > 5 && value.length <= 12) {
      formatted = `${value.substring(0, 5)}-${value.substring(5)}`;
    } else if (value.length > 12) {
      formatted = `${value.substring(0, 5)}-${value.substring(5, 12)}-${value.substring(12, 13)}`;
    }
    setCnic(formatted);
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Allow only digits
    if (value.length > 11) value = value.substring(0, 11);
    
    // Auto-format mobile number (XXXX-XXXXXXX)
    let formatted = value;
    if (value.length > 4) {
      formatted = `${value.substring(0, 4)}-${value.substring(4)}`;
    }
    setMobile(formatted);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    // Validate fields
    if (!name.trim()) return fail("Full Name is required.");
    if (!email.trim()) return fail("Email address is required.");
    if (password.length < 4) return fail("Password must be at least 4 characters long.");
    
    const rawCnic = cnic.replace(/\D/g, "");
    if (rawCnic.length !== 13) return fail("CNIC must be exactly 13 digits long.");
    
    const rawMobile = mobile.replace(/\D/g, "");
    if (rawMobile.length < 11) return fail("Please enter a valid 11-digit Mobile Number.");
    
    if (!companyId) return fail("Please select your company.");

    // Validate company access code
    const selectedCompany = companies.find((c) => c.id === companyId);
    if (!selectedCompany) return fail("Invalid company selected.");
    if (companyCode.toUpperCase().trim() !== selectedCompany.code) {
      return fail("Incorrect Company Join Code. Please check with your management.");
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          cnic,
          mobile,
          role,
          companyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setSuccess("Your registration was successful! Your account is pending approval. (Tip: You can login as the Super Admin (admin@khaliqora.com / admin) to approve this application instantly in the Admin Suite).");
      setIsLogin(true); // Switch to login
      
      // Keep email filled for convenience
      setPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fail = (msg: string) => {
    setError(msg);
    setIsLoading(false);
  };

  return (
    <div className="max-w-md mx-auto my-8 space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center justify-center py-4 bg-[#121418]/30 rounded-2xl border border-white/5 p-6 shadow-xl backdrop-blur-sm">
        <KhaliqoraLogo size="lg" />
      </div>

      <div className="bg-[#121418] border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden transition-all duration-300">
        {/* Tab Switcher */}
      <div className="flex border-b border-white/5 bg-[#0d0f12]">
        <button
          onClick={() => {
            setIsLogin(true);
            setError(null);
          }}
          className={`w-1/2 py-4 text-center font-bold text-xs uppercase tracking-wider transition-all ${
            isLogin ? "text-amber-500 bg-[#121418] border-b-2 border-amber-500" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          LOG IN
        </button>
        <button
          onClick={() => {
            setIsLogin(false);
            setError(null);
          }}
          className={`w-1/2 py-4 text-center font-bold text-xs uppercase tracking-wider transition-all ${
            !isLogin ? "text-amber-500 bg-[#121418] border-b-2 border-amber-500" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          PORTAL SIGNUP
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-white tracking-tight">
            {isLogin ? "Khaliqora Staff Sign-In" : "Staff Registration"}
          </h3>
          <p className="text-xs text-slate-500">
            {isLogin
              ? "Access meeting rooms, timelines, and company panels"
              : "Register your CNIC, mobile and credentials for approval"}
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-start space-x-2 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>{success}</span>
          </div>
        )}

        {isLogin ? (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 block">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none placeholder:text-slate-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:bg-slate-800 disabled:text-slate-600 flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? "Signing In..." : "SIGN IN"}</span>
            </button>

            <div className="text-center pt-3 border-t border-white/5">
              <p className="text-[11px] text-slate-500 leading-normal">
                Default Super Admin Credentials for Empire Owner:<br />
                Email: <strong className="text-slate-300">admin@khaliqora.com</strong> | Password: <strong className="text-slate-300">admin</strong>
              </p>
            </div>
          </form>
        ) : (
          /* Signup Form */
          <form onSubmit={handleSignup} className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 block">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Bilal Ahmed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="bilal@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 block">CNIC Number (13 Digits)</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="XXXXX-XXXXXXX-X (Pakistani CNIC)"
                  value={cnic}
                  onChange={handleCnicChange}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none font-mono placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 block">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="03XX-XXXXXXX"
                  value={mobile}
                  onChange={handleMobileChange}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none font-mono placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Your Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "company_manager" | "staff")}
                  className="w-full px-3 py-2.5 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none appearance-none transition-all"
                >
                  <option value="staff" className="bg-[#121418]">Staff Member</option>
                  <option value="company_manager" className="bg-[#121418]">Company Manager</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Company Group</label>
                <select
                  required
                  value={companyId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setCompanyId(selectedId);
                    const selectedComp = companies.find((c) => c.id === selectedId);
                    if (selectedComp) {
                      setCompanyCode(selectedComp.code);
                    } else {
                      setCompanyCode("");
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none appearance-none transition-all"
                >
                  <option value="" className="bg-[#121418]">Select Company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#121418]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none placeholder:text-slate-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Company Join Code</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. KQ-LOG-101"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-[#1c1f26] border border-white/5 rounded-xl text-xs text-amber-400 font-mono placeholder:text-slate-600 focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none font-bold uppercase transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:bg-slate-800 disabled:text-slate-600 flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? "Submitting Application..." : "REGISTER APPLICATION"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
    </div>
  );
}
