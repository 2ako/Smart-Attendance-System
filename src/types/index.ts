// ============================================================
// Smart Attendance Management System — Type Definitions
// ============================================================

export type UserRole = "student" | "professor" | "admin";

export type AttendanceStatus = "present" | "late" | "absent";

export type SessionStatus = "open" | "closed";

export type DeviceType = "rfid" | "fingerprint" | "hybrid";

// ── Base Sanity Document ──────────────────────────────────────
export interface SanityDocument {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
}

// ── User ──────────────────────────────────────────────────────
export interface User extends SanityDocument {
  name: string;
  username: string; // matricule or employeeId
  password: string; // hashed
  role: UserRole;
  avatar?: string;
  studyField?: string;
}

// ── Student ───────────────────────────────────────────────────
export interface Student extends SanityDocument {
  user: User | { _ref: string };
  matricule: string;
  firstName: string;
  lastName: string;
  fullName?: string; // Legacy field for backwards compatibility if needed
  dateOfBirth: string;
  group: string;
  studyField?: string;
  specialty?: string;
  degree?: "Licence" | "Master";
  level?: "L1" | "L2" | "L3" | "M1" | "M2";
  academicYear?: string;
  rfidUid?: string;
  fingerprintId?: number;
}

// ── Professor ─────────────────────────────────────────────────
export interface Professor extends SanityDocument {
  user: User | { _ref: string };
  employeeId: string;
  department: string;
  specialization?: string;
}

// ── Subject ───────────────────────────────────────────────────
export interface Subject extends SanityDocument {
  name: string;
  code: string;
  studyField?: string;
  specialty?: string;
  degree?: "Licence" | "Master";
  level?: "L1" | "L2" | "L3" | "M1" | "M2";
  academicYear?: string;
  group?: string;
  type?: "Cours" | "TD" | "TP";
  semester?: number;
  creditHours?: number;
  professor?: Professor;
  scheduleInfo?: {
    day: string;
    startTime: string;
    endTime: string;
    room: string;
  };
}

// ── Room ──────────────────────────────────────────────────────
export interface Room extends SanityDocument {
  name: string;
  building: string;
  capacity: number;
  floor?: number;
}

// ── Schedule ──────────────────────────────────────────────────
export interface Schedule extends SanityDocument {
  subject: Subject | { _ref: string };
  professor: Professor | { _ref: string };
  room: string;
  day: string;
  startTime: string;
  endTime: string;
  group: string;
}

// ── Device ────────────────────────────────────────────────────
export interface Device extends SanityDocument {
  deviceId: string;
  deviceToken: string;
  room: Room | { _ref: string };
  type: DeviceType;
  isActive: boolean;
  lastSeen?: string;
}

// ── Session ───────────────────────────────────────────────────
export interface Session extends SanityDocument {
  schedule: Schedule | { _ref: string };
  professor: Professor | { _ref: string };
  status: SessionStatus;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  subject?: Subject;
  room?: string;
}

// ── Attendance ────────────────────────────────────────────────
export interface Attendance extends SanityDocument {
  session: Session | { _ref: string };
  student: Student | { _ref: string };
  timestamp: string;
  status: AttendanceStatus;
  timeIn: string;
  timeOut?: string;
  markedBy: "device" | "manual";
}

// ── Fingerprint ───────────────────────────────────────────────
export interface Fingerprint extends SanityDocument {
  student: Student | { _ref: string };
  fingerprintId: number;
  templateData: string;
}

// ── RFID Card ─────────────────────────────────────────────────
export interface RfidCard extends SanityDocument {
  student: Student | { _ref: string };
  uid: string;
  isActive: boolean;
}

// ── Auth ──────────────────────────────────────────────────────
export interface JwtPayload {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  studyField?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: UserRole;
  };
}

// ── ESP32 Device Payloads ─────────────────────────────────────
export interface DeviceOpenSessionPayload {
  scheduleId: string;
  duration: number; // minutes
}

export interface DeviceMarkAttendancePayload {
  sessionId: string;
  rfidUid?: string;
  fingerprintId?: number;
}

export interface DeviceEnrollFingerprintPayload {
  studentId: string;
  fingerprintId: number;
  templateData: string;
}
