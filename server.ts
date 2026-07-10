import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Helper to read database
function readDB() {
  let db: any;
  if (!fs.existsSync(DB_FILE)) {
    // Seed default DB
    const defaultDB = {
      companies: [
        { id: "comp_1", name: "Khaliqora Logistics", code: "KQ-LOG-101", createdAt: new Date().toISOString() }
      ],
      users: [
        {
          id: "usr_admin",
          name: "Khaliqora Admin (Empire Owner)",
          email: "admin@khaliqora.com",
          password: "admin", // Simple for testing/demo, real applications would hash this
          cnic: "37405-1234567-9",
          mobile: "0300-1234567",
          role: "super_admin",
          status: "approved",
          createdAt: new Date().toISOString()
        }
      ],
      meetingPosts: [
        {
          id: "post_1",
          title: "All-Empire Q3 Quarterly Strategy Meeting",
          timing: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
          description: "A combined review of the quarterly goals for all 106 companies under the Khaliqora Empire. All managers and executive staff are requested to join their respective rooms.",
          companyId: "all",
          companyName: "Khaliqora Empire Group",
          postedBy: "Khaliqora Admin (Empire Owner)",
          createdAt: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
    db = defaultDB;
  } else {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  }

  // Ensure exactly 106 companies exist
  const sectors = [
    { name: "Logistics", code: "LOG" },
    { name: "Textiles", code: "TEX" },
    { name: "Cement", code: "CEM" },
    { name: "Steel Mills", code: "STE" },
    { name: "Power Generation", code: "PWR" },
    { name: "Solar Energy", code: "SLR" },
    { name: "Petrochemicals", code: "PET" },
    { name: "Agro Industries", code: "AGR" },
    { name: "Sugar Mills", code: "SUG" },
    { name: "Paper & Board", code: "PAP" },
    { name: "Information Technology", code: "TEC" },
    { name: "Engineering", code: "ENG" },
    { name: "Synthetics", code: "SYN" },
    { name: "Beverages", code: "BEV" },
    { name: "Dairy Foods", code: "DRY" },
    { name: "Flour Mills", code: "FLR" },
    { name: "Ghee & Cooking Oil", code: "GHE" },
    { name: "Mining & Minerals", code: "MIN" },
    { name: "Pharmaceuticals", code: "PHA" },
    { name: "Construction", code: "CON" },
    { name: "Aviation", code: "AVI" },
    { name: "Shipping Line", code: "SHP" },
    { name: "Lubricants", code: "LUB" },
    { name: "Packaging", code: "PKG" },
    { name: "Real Estate", code: "EST" },
    { name: "Cold Storage", code: "CLD" },
    { name: "Chemical Complex", code: "CHM" },
    { name: "Leather Tannery", code: "LTH" },
    { name: "Garments", code: "GAR" },
    { name: "Fertilizer", code: "FER" },
    { name: "Glass Works", code: "GLS" },
    { name: "Cable & Wire", code: "CBL" },
    { name: "Auto Parts", code: "AUT" },
    { name: "Rice Mills", code: "RIC" },
    { name: "Marble & Granite", code: "MRB" },
    { name: "Trading House", code: "TRD" },
    { name: "Insurance", code: "INS" },
    { name: "Security Services", code: "SEC" },
    { name: "Transport Services", code: "TRN" },
    { name: "Hospitality", code: "HOS" }
  ];

  let dbUpdated = false;
  if (!db.companies || !Array.isArray(db.companies)) {
    db.companies = [];
  }

  for (let i = 1; i <= 106; i++) {
    const companyId = `comp_${i}`;
    const existingCompIndex = db.companies.findIndex((c: any) => c.id === companyId);

    if (existingCompIndex === -1) {
      const sectorIndex = (i - 1) % sectors.length;
      const sector = sectors[sectorIndex];
      const divisionNum = Math.floor((i - 1) / sectors.length) + 1;

      let companyName = `Khaliqora ${sector.name}`;
      if (divisionNum > 1) {
        companyName = `Khaliqora ${sector.name} - Unit ${divisionNum}`;
      }

      if (i === 1) {
        companyName = "Khaliqora Logistics";
      }

      const newComp = {
        id: companyId,
        name: companyName,
        code: `KQ-${sector.code}-${100 + i}`,
        createdAt: new Date().toISOString()
      };

      db.companies.push(newComp);
      dbUpdated = true;
    }
  }

  // Keep them sorted cleanly by id index
  db.companies.sort((a: any, b: any) => {
    const aNum = parseInt(a.id.replace("comp_", ""), 10);
    const bNum = parseInt(b.id.replace("comp_", ""), 10);
    return aNum - bNum;
  });

  if (dbUpdated) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }

  return db;
}

// Helper to write database
function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Memory cache for active meeting rooms
// Map of companyId -> { participants: ParticipantState[], activeSpeakerId, currentSpeakerId, speakerQueue: [], lastUpdated: {} }
interface ActiveRoom {
  participants: any[];
  activeSpeakerId: string | null;
  currentSpeakerId: string | null;
  speakerQueue: string[];
  lastSeen: { [userId: string]: number }; // userId -> timestamp of last poll
  kickedUsers: string[];
  delegatedHostId: string | null;
}
const activeRooms: { [companyId: string]: ActiveRoom } = {};

// Cleanup inactive participants (e.g. not polled for 10 seconds)
setInterval(() => {
  const now = Date.now();
  Object.keys(activeRooms).forEach((companyId) => {
    const room = activeRooms[companyId];
    const originalCount = room.participants.length;
    
    // Filter out participants whose last seen is older than 8 seconds
    room.participants = room.participants.filter((p) => {
      const lastSeenTime = room.lastSeen[p.userId] || 0;
      const isActive = now - lastSeenTime < 8000;
      if (!isActive) {
        delete room.lastSeen[p.userId];
        // If they were current or active speaker, clear it
        if (room.currentSpeakerId === p.userId) {
          room.currentSpeakerId = null;
        }
        if (room.activeSpeakerId === p.userId) {
          room.activeSpeakerId = null;
        }
        room.speakerQueue = room.speakerQueue.filter(id => id !== p.userId);
      }
      return isActive;
    });

    // If active speaker left, choose a new one from remaining or set null
    if (room.activeSpeakerId && !room.participants.some(p => p.userId === room.activeSpeakerId)) {
      const speakers = room.participants.filter(p => p.isSpeaking);
      room.activeSpeakerId = speakers.length > 0 ? speakers[0].userId : null;
    }
  });
}, 3000);

// ================= API ENDPOINTS =================

// Auth: Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  
  if (user.status === "pending") {
    return res.status(403).json({ error: "Your account is pending admin approval." });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    cnic: user.cnic,
    mobile: user.mobile,
    role: user.role,
    companyId: user.companyId,
    status: user.status
  });
});

// Auth: Signup
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, cnic, mobile, role, companyId } = req.body;
  
  if (!name || !email || !password || !cnic || !mobile || !role) {
    return res.status(400).json({ error: "All fields are required including CNIC and Mobile number." });
  }

  // Basic Pakistani CNIC format validator (e.g. 12345-1234567-1 or just numbers)
  const cleanCNIC = cnic.trim();
  if (cleanCNIC.length < 13) {
    return res.status(400).json({ error: "Please enter a valid CNIC number (13 digits)." });
  }

  const db = readDB();
  
  // Check if email already exists
  if (db.users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already registered." });
  }

  // Check CNIC duplicate
  if (db.users.some((u: any) => u.cnic === cleanCNIC)) {
    return res.status(400).json({ error: "CNIC number already registered." });
  }

  const newUser = {
    id: "usr_" + Math.random().toString(36).substr(2, 9),
    name,
    email,
    password,
    cnic: cleanCNIC,
    mobile,
    role, // "company_manager" | "staff"
    companyId,
    status: "pending", // Always pending initially, needs super_admin approval
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ message: "Registration successful! Waiting for Admin approval.", user: { id: newUser.id, name: newUser.name } });
});

// Companies: Get all
app.get("/api/companies", (req, res) => {
  const db = readDB();
  res.json(db.companies);
});

// Companies: Create (Super admin only)
app.post("/api/companies", (req, res) => {
  const { name, code, adminId } = req.body;
  const db = readDB();

  // Validate admin
  const adminUser = db.users.find((u: any) => u.id === adminId && u.role === "super_admin");
  if (!adminUser) {
    return res.status(403).json({ error: "Only the Khaliqora Empire Super Admin can add companies." });
  }

  if (!name || !code) {
    return res.status(400).json({ error: "Company name and join code are required." });
  }

  // Validate duplicates
  if (db.companies.some((c: any) => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: "Company name already exists." });
  }
  if (db.companies.some((c: any) => c.code.toLowerCase() === code.toLowerCase())) {
    return res.status(400).json({ error: "Company code already exists." });
  }

  const newCompany = {
    id: "comp_" + Math.random().toString(36).substr(2, 9),
    name,
    code: code.toUpperCase().trim(),
    createdAt: new Date().toISOString()
  };

  db.companies.push(newCompany);
  writeDB(db);

  res.json({ message: "Company added successfully!", company: newCompany });
});

// Staff Management: List staff
app.get("/api/staff", (req, res) => {
  const { adminId, companyId } = req.query;
  const db = readDB();

  const requestingUser = db.users.find((u: any) => u.id === adminId);
  if (!requestingUser) {
    return res.status(403).json({ error: "Unauthorized access." });
  }

  let list = db.users;

  if (requestingUser.role === "super_admin") {
    // Return everyone except the admin themselves
    list = db.users.filter((u: any) => u.role !== "super_admin");
  } else if (requestingUser.role === "company_manager") {
    // Return staff of their specific company
    list = db.users.filter((u: any) => u.companyId === requestingUser.companyId && u.id !== requestingUser.id);
  } else {
    return res.status(403).json({ error: "Access denied." });
  }

  // Populate company names
  const result = list.map((u: any) => {
    const comp = db.companies.find((c: any) => c.id === u.companyId);
    return {
      ...u,
      companyName: comp ? comp.name : "N/A"
    };
  });

  res.json(result);
});

// Staff Management: Approve staff
app.put("/api/staff/:id/approve", (req, res) => {
  const { adminId } = req.body;
  const { id } = req.params;
  const db = readDB();

  const requestingUser = db.users.find((u: any) => u.id === adminId);
  if (!requestingUser || (requestingUser.role !== "super_admin" && requestingUser.role !== "company_manager")) {
    return res.status(403).json({ error: "Unauthorized to approve staff." });
  }

  const staff = db.users.find((u: any) => u.id === id);
  if (!staff) {
    return res.status(404).json({ error: "Staff member not found." });
  }

  // If company manager, check if they belong to same company
  if (requestingUser.role === "company_manager" && staff.companyId !== requestingUser.companyId) {
    return res.status(403).json({ error: "You can only approve staff for your own company." });
  }

  staff.status = "approved";
  writeDB(db);

  res.json({ message: "Staff approved successfully!", staff });
});

// Staff Management: Update Role
app.put("/api/staff/:id/role", (req, res) => {
  const { adminId, role } = req.body;
  const { id } = req.params;
  const db = readDB();

  const requestingUser = db.users.find((u: any) => u.id === adminId);
  if (!requestingUser || requestingUser.role !== "super_admin") {
    return res.status(403).json({ error: "Only the Empire Super Admin can elevate staff roles." });
  }

  const staff = db.users.find((u: any) => u.id === id);
  if (!staff) {
    return res.status(404).json({ error: "Staff member not found." });
  }

  staff.role = role;
  writeDB(db);

  res.json({ message: "Role updated successfully!", staff });
});

// Staff Management: Delete staff
app.delete("/api/staff/:id", (req, res) => {
  const { adminId } = req.query;
  const { id } = req.params;
  const db = readDB();

  const requestingUser = db.users.find((u: any) => u.id === adminId);
  if (!requestingUser || (requestingUser.role !== "super_admin" && requestingUser.role !== "company_manager")) {
    return res.status(403).json({ error: "Unauthorized." });
  }

  const staffIndex = db.users.findIndex((u: any) => u.id === id);
  if (staffIndex === -1) {
    return res.status(404).json({ error: "Staff member not found." });
  }

  const staff = db.users[staffIndex];
  if (requestingUser.role === "company_manager" && staff.companyId !== requestingUser.companyId) {
    return res.status(403).json({ error: "You can only remove staff from your own company." });
  }

  db.users.splice(staffIndex, 1);
  writeDB(db);

  res.json({ message: "Staff member removed successfully." });
});

// Meetings Posts: Get all combined posts
app.get("/api/meetings/posts", (req, res) => {
  const db = readDB();
  res.json(db.meetingPosts);
});

// Meetings Posts: Create new post
app.post("/api/meetings/posts", (req, res) => {
  const { title, timing, description, companyId, userId } = req.body;
  const db = readDB();

  const user = db.users.find((u: any) => u.id === userId);
  if (!user || (user.role !== "super_admin" && user.role !== "company_manager")) {
    return res.status(403).json({ error: "Only administrators and company managers can post meeting timings." });
  }

  if (!title || !timing || !description || !companyId) {
    return res.status(400).json({ error: "Title, timing, description, and target room/company are required." });
  }

  let companyName = "All Companies (Combined)";
  if (companyId !== "all") {
    const comp = db.companies.find((c: any) => c.id === companyId);
    if (!comp) {
      return res.status(400).json({ error: "Invalid company selected." });
    }
    companyName = comp.name;
  }

  const newPost = {
    id: "post_" + Math.random().toString(36).substr(2, 9),
    title,
    timing: new Date(timing).toISOString(),
    description,
    companyId,
    companyName,
    postedBy: `${user.name} (${user.role === "super_admin" ? "Empire Admin" : "Company Manager"})`,
    createdAt: new Date().toISOString()
  };

  db.meetingPosts.unshift(newPost);
  writeDB(db);

  res.json({ message: "Meeting schedule posted successfully!", post: newPost });
});

// ================= REAL-TIME MEETING ROOM API =================

// Sync Room State (Long poll / regular poll)
app.post("/api/rooms/:companyId/sync", (req, res) => {
  const { companyId } = req.params;
  const { userId, name, role, isCameraOn, isMuted, isRequestingToSpeak, isSpeaking, avatarUrl } = req.body;

  if (!userId || !name) {
    return res.status(400).json({ error: "userId and name are required for room sync." });
  }

  // Initialize room if not exists
  if (!activeRooms[companyId]) {
    activeRooms[companyId] = {
      participants: [],
      activeSpeakerId: null,
      currentSpeakerId: null,
      speakerQueue: [],
      lastSeen: {},
      kickedUsers: [],
      delegatedHostId: null
    };
  }

  const room = activeRooms[companyId];

  // Check if kicked
  if (room.kickedUsers && room.kickedUsers.includes(userId)) {
    return res.json({
      kicked: true,
      roomId: companyId,
      participants: room.participants,
      activeSpeakerId: room.activeSpeakerId,
      currentSpeakerId: room.currentSpeakerId,
      speakerQueue: room.speakerQueue,
      delegatedHostId: room.delegatedHostId || null
    });
  }
  const now = Date.now();

  // Update last seen
  room.lastSeen[userId] = now;

  // Find or add participant
  let participant = room.participants.find((p) => p.userId === userId);
  if (!participant) {
    participant = {
      userId,
      name,
      role,
      isCameraOn: !!isCameraOn,
      isMuted: !!isMuted,
      isRequestingToSpeak: !!isRequestingToSpeak,
      isSpeaking: !!isSpeaking,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId}`
    };
    room.participants.push(participant);
    
    // Auto-assign owner/manager as current speaker if none exists
    if (!room.currentSpeakerId && (role === "super_admin" || role === "company_manager")) {
      room.currentSpeakerId = userId;
    }
  } else {
    // Update fields
    participant.isCameraOn = !!isCameraOn;
    participant.isMuted = !!isMuted;
    participant.isRequestingToSpeak = !!isRequestingToSpeak;
    participant.isSpeaking = !!isSpeaking;
    participant.name = name;
  }

  // If speaking is true, set as active speaker
  if (isSpeaking && !isMuted) {
    // Check if the participant is allowed to speak (either they are owner/manager, or they are current speaker)
    const canSpeak = role === "super_admin" || role === "company_manager" || room.currentSpeakerId === userId || room.currentSpeakerId === null;
    if (canSpeak) {
      room.activeSpeakerId = userId;
      // Also update isSpeaking for everyone else to false
      room.participants.forEach((p) => {
        if (p.userId !== userId) p.isSpeaking = false;
      });
    } else {
      participant.isSpeaking = false; // Force speech off
    }
  } else if (!room.participants.some(p => p.isSpeaking)) {
    // No one is speaking, if active speaker is this user, clear it
    if (room.activeSpeakerId === userId) {
      room.activeSpeakerId = null;
    }
  }

  res.json({
    roomId: companyId,
    participants: room.participants,
    activeSpeakerId: room.activeSpeakerId,
    currentSpeakerId: room.currentSpeakerId,
    speakerQueue: room.speakerQueue,
    delegatedHostId: room.delegatedHostId || null
  });
});

// Manage speak permissions (Managers/Admin/Delegate only)
app.post("/api/rooms/:companyId/permit-speaker", (req, res) => {
  const { companyId } = req.params;
  const { adminId, targetUserId } = req.body;

  const room = activeRooms[companyId];
  if (!room) {
    return res.status(404).json({ error: "Room is currently inactive." });
  }

  const db = readDB();
  const requestingUser = db.users.find((u: any) => u.id === adminId);
  const isDelegate = room && room.delegatedHostId === adminId;

  if (!isDelegate && (!requestingUser || (requestingUser.role !== "super_admin" && requestingUser.role !== "company_manager"))) {
    return res.status(403).json({ error: "Only administrators, managers, or co-hosts can grant speaking permission." });
  }

  room.currentSpeakerId = targetUserId;
  // Clear from queue if they were in it
  if (targetUserId) {
    room.speakerQueue = room.speakerQueue.filter(id => id !== targetUserId);
    // Unmute target in local state
    const part = room.participants.find(p => p.userId === targetUserId);
    if (part) {
      part.isRequestingToSpeak = false;
    }
  }

  res.json({
    success: true,
    currentSpeakerId: room.currentSpeakerId,
    speakerQueue: room.speakerQueue
  });
});

// Request to speak (Raise hand / queue)
app.post("/api/rooms/:companyId/request-speak", (req, res) => {
  const { companyId } = req.params;
  const { userId, action } = req.body; // action: "add" | "remove"

  const room = activeRooms[companyId];
  if (!room) {
    return res.status(404).json({ error: "Room is not active." });
  }

  if (action === "add") {
    if (!room.speakerQueue.includes(userId)) {
      room.speakerQueue.push(userId);
    }
    const part = room.participants.find(p => p.userId === userId);
    if (part) part.isRequestingToSpeak = true;
  } else {
    room.speakerQueue = room.speakerQueue.filter(id => id !== userId);
    const part = room.participants.find(p => p.userId === userId);
    if (part) part.isRequestingToSpeak = false;
  }

  res.json({
    success: true,
    speakerQueue: room.speakerQueue
  });
});

// Mute all / Reset meeting controls
app.post("/api/rooms/:companyId/reset-controls", (req, res) => {
  const { companyId } = req.params;
  const { adminId } = req.body;

  const room = activeRooms[companyId];
  const db = readDB();
  const requestingUser = db.users.find((u: any) => u.id === adminId);
  const isDelegate = room && room.delegatedHostId === adminId;

  if (!isDelegate && (!requestingUser || (requestingUser.role !== "super_admin" && requestingUser.role !== "company_manager"))) {
    return res.status(403).json({ error: "Unauthorized." });
  }

  if (room) {
    room.currentSpeakerId = null;
    room.activeSpeakerId = null;
    room.speakerQueue = [];
    room.participants.forEach(p => {
      p.isSpeaking = false;
      p.isRequestingToSpeak = false;
    });
  }

  res.json({ success: true });
});

// Leave meeting room
app.post("/api/rooms/:companyId/leave", (req, res) => {
  const { companyId } = req.params;
  const { userId } = req.body;

  const room = activeRooms[companyId];
  if (room) {
    room.participants = room.participants.filter(p => p.userId !== userId);
    delete room.lastSeen[userId];
    if (room.currentSpeakerId === userId) {
      room.currentSpeakerId = null;
    }
    if (room.activeSpeakerId === userId) {
      room.activeSpeakerId = null;
    }
    room.speakerQueue = room.speakerQueue.filter(id => id !== userId);
  }

  res.json({ success: true });
});

// Kick participant from meeting
app.post("/api/rooms/:companyId/kick", (req, res) => {
  const { companyId } = req.params;
  const { adminId, targetUserId } = req.body;

  const room = activeRooms[companyId];
  if (!room) {
    return res.status(404).json({ error: "Room not active." });
  }

  const db = readDB();
  const requestingUser = db.users.find((u: any) => u.id === adminId);
  const isDelegate = room.delegatedHostId === adminId;

  if (!isDelegate && (!requestingUser || (requestingUser.role !== "super_admin" && requestingUser.role !== "company_manager"))) {
    return res.status(403).json({ error: "Unauthorized to kick participants." });
  }

  // Add target user to kicked list
  if (!room.kickedUsers.includes(targetUserId)) {
    room.kickedUsers.push(targetUserId);
  }

  // Remove target user from participants immediately
  room.participants = room.participants.filter(p => p.userId !== targetUserId);
  if (room.currentSpeakerId === targetUserId) room.currentSpeakerId = null;
  if (room.activeSpeakerId === targetUserId) room.activeSpeakerId = null;
  room.speakerQueue = room.speakerQueue.filter(id => id !== targetUserId);

  res.json({ success: true, kickedUsers: room.kickedUsers });
});

// Delegate meeting host authority
app.post("/api/rooms/:companyId/delegate", (req, res) => {
  const { companyId } = req.params;
  const { adminId, targetUserId } = req.body; // targetUserId: null to revoke, or a user ID string to delegate

  const room = activeRooms[companyId];
  if (!room) {
    return res.status(404).json({ error: "Room not active." });
  }

  const db = readDB();
  const requestingUser = db.users.find((u: any) => u.id === adminId);

  // ONLY real managers or super admins can delegate. Delegate hosts CANNOT delegate.
  if (!requestingUser || (requestingUser.role !== "super_admin" && requestingUser.role !== "company_manager")) {
    return res.status(403).json({ error: "Unauthorized to delegate host authority." });
  }

  room.delegatedHostId = targetUserId;

  res.json({ success: true, delegatedHostId: room.delegatedHostId });
});

// Staff Management: Toggle block/unblock staff
app.put("/api/staff/:id/toggle-block", (req, res) => {
  const { adminId } = req.body;
  const { id } = req.params;
  const db = readDB();

  const requestingUser = db.users.find((u: any) => u.id === adminId);
  if (!requestingUser || (requestingUser.role !== "super_admin" && requestingUser.role !== "company_manager")) {
    return res.status(403).json({ error: "Unauthorized to block staff." });
  }

  const staff = db.users.find((u: any) => u.id === id);
  if (!staff) {
    return res.status(404).json({ error: "Staff member not found." });
  }

  // If company manager, check if they belong to same company
  if (requestingUser.role === "company_manager" && staff.companyId !== requestingUser.companyId) {
    return res.status(403).json({ error: "You can only block staff for your own company." });
  }

  if (staff.status === "blocked") {
    staff.status = "approved"; // Unblock
  } else {
    staff.status = "blocked"; // Block
    
    // Also kick from any active room if they are currently inside it
    Object.keys(activeRooms).forEach(cId => {
      const room = activeRooms[cId];
      if (room.participants.some(p => p.userId === id)) {
        room.kickedUsers.push(id);
        room.participants = room.participants.filter(p => p.userId !== id);
        if (room.currentSpeakerId === id) room.currentSpeakerId = null;
        if (room.activeSpeakerId === id) room.activeSpeakerId = null;
        room.speakerQueue = room.speakerQueue.filter(qId => qId !== id);
      }
    });
  }

  writeDB(db);

  res.json({ message: `Staff status set to ${staff.status} successfully!`, staff });
});


// ================= VITE OR STATIC STATIC SERVING =================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
