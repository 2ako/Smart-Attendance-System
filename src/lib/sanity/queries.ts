// ============================================================
// GROQ Queries for Sanity Data Fetching
// ============================================================

// ── Auth ──────────────────────────────────────────────────────
export const getUserByUsername = `*[_type == "user" && (username == $username || email == $username)][0]{
  ...,
  "studyField": studyField
}`;

export const getUserById = `*[_type == "user" && _id == $id][0]{
  ...,
  "studyField": studyField
}`;

export const getAllUsers = `*[_type == "user"] | order(name asc)`;

// ── Students ──────────────────────────────────────────────────
export const getAllStudents = `*[_type == "student" && (
  !defined($studyField) || $studyField == "" || $studyField == "all" || 
  studyField == $studyField || 
  studyField._ref == $studyFieldId ||
  studyField match $studyField || 
  user->studyField match $studyField ||
  (lower($studyField) == "info" && (lower(studyField) == "informatique" || lower(user->studyField) == "informatique"))
)]{
  ...,
  "fullName": firstName + " " + lastName,
  user->{ _id, name, email, username, role, avatar }
} | order(lastName asc, firstName asc)`;

export const getStudentByUserId = `*[_type == "student" && user._ref == $userId][0]{
  ...,
  "fullName": firstName + " " + lastName,
  user->{ _id, name, email, username, role, avatar }
}`;

export const getStudentByRfid = `*[_type == "student" && rfidUid == $rfidUid][0]{
  ...,
  "fullName": firstName + " " + lastName,
  user->{ _id, name, username }
}`;

export const getStudentByFingerprint = `*[_type == "student" && fingerprintId == $fingerprintId][0]{
  ...,
  "fullName": firstName + " " + lastName,
  user->{ _id, name, username }
}`;

// ── Professors ────────────────────────────────────────────────
export const getAllProfessors = `*[_type == "professor" && (
  !defined($studyField) || $studyField == "" || 
  department match $studyField || 
  studyField match $studyField || 
  studyField._ref == $studyFieldId ||
  user->studyField match $studyField ||
  (lower($studyField) == "info" && (lower(department) == "informatique" || lower(studyField) == "informatique" || lower(user->studyField) == "informatique")) ||
  (lower($studyField) == "informatique" && (lower(department) == "info" || lower(studyField) == "info" || lower(user->studyField) == "info"))
)]{
  ...,
  user->{ _id, name, email, username, role, avatar }
} | order(employeeId asc)`;

export const getProfessorByUserId = `*[_type == "professor" && user._ref == $userId][0]{
  ...,
  user->{ _id, name, email, username, role, avatar }
}`;

// ── Subjects ──────────────────────────────────────────────────
export const getAllSubjects = `*[_type == "subject" && (
  !defined($studyField) || $studyField == "" || $studyField == "all" || 
  lower(studyField) == lower($studyField) ||
  studyField._ref == $studyFieldId ||
  studyField match $studyField ||
  (lower($studyField) == "info" && lower(studyField) == "informatique") ||
  (lower($studyField) == "informatique" && lower(studyField) == "info")
)]{
  ...,
  professor->{ ..., user->{ name } },
  "scheduleInfo": *[_type == "schedule" && subject._ref == ^._id][0]{
    day,
    startTime,
    endTime,
    room
  }
} | order(code asc)`;

export const getSubjectsByProfessor = `*[_type == "subject" && professor._ref == $professorId]{
  _id,
  name,
  code,
  level,
  degree,
  type
} | order(name asc)`;

export const getStudentCourses = `*[_type == "subject" && academicYear == $academicYear && degree == $degree && level == $level && (
  (!defined(studyField) || studyField == "" || lower(studyField) == "all" || lower(studyField) == lower($studyField) || (lower($studyField) == "info" && lower(studyField) == "informatique") || (lower($studyField) == "informatique" && lower(studyField) == "info")) &&
  (!defined(specialty) || specialty == "" || lower(specialty) == "none" || lower(specialty) == "all" || lower(specialty) == lower($specialty)) &&
  (!defined(group) || group == "" || lower(group) == "all" || group == $group)
)]{
  ...,
  "subjectDetails": {
    "name": name,
    "code": code,
    "semester": semester,
    "creditHours": creditHours,
    "degree": degree,
    "level": level,
    "type": type,
    "studyField": studyField,
    "specialty": specialty
  },
  professor->{ ..., user->{ name } },
  "scheduleInfo": *[_type == "schedule" && subject._ref == ^._id][0]{
    day,
    startTime,
    endTime,
    room
  }
} | order(name asc)`;

// ── Schedules ─────────────────────────────────────────────────
export const getAllSchedules = `*[_type == "schedule" && (
  !defined($studyField) || $studyField == "" || 
  subject->studyField match $studyField ||
  (lower($studyField) == "info" && lower(subject->studyField) == "informatique") ||
  (lower($studyField) == "informatique" && lower(subject->studyField) == "info")
)]{
  ...,
  subject->{ _id, name, code, studyField },
  professor->{ ..., user->{ name } },
  room
} | order(day asc, startTime asc)`;

export const getSchedulesByProfessor = `*[_type == "schedule" && professor._ref == $professorId]{
  ...,
  subject->{ _id, name, code, type },
  room
} | order(day asc, startTime asc)`;

export const getApprovedMakeUpRequestsByProfessor = `*[_type == "makeUpRequest" && professor._ref == $professorId && status == "approved"]{
  ...,
  subject->{ _id, name, code, type }
} | order(requestedDate asc)`;

// ── Rooms ─────────────────────────────────────────────────────
export const getAllRooms = `*[_type == "room" && (!defined($studyField) || $studyField == "" || studyField match $studyField || studyField._ref == $studyFieldId)] | order(name asc)`;

// ── Devices ───────────────────────────────────────────────────
export const getAllDevices = `*[_type == "device" && (
  !defined($studyField) || $studyField == "" || $studyField == "all" || 
  studyField == $studyField ||
  studyField match $studyField || 
  studyField._ref == $studyFieldId ||
  room->studyField == $studyField ||
  room->studyField._ref == $studyFieldId
)]{
  ...,
  room->{ _id, name }
} | order(deviceId asc)`;

export const getDeviceByToken = `*[_type == "device" && deviceToken == $token && isActive == true][0]{
  ...,
  room->{ _id, name, building }
}`;

// ── Sessions ──────────────────────────────────────────────────
export const getActiveSessionBySchedule = `*[_type == "session" && schedule._ref == $scheduleId && status == "open" && dateTime(endTime) > dateTime(now())][0]{
  ...,
  schedule->{ ..., subject->{ name, code, type, level, specialty, group, studyField }, room, professor->{ ..., user->{ name } } }
}`;

export const getFinishedSessionsByStudyField = `*[_type == "session" && (status == "closed" || dateTime(endTime) < dateTime(now())) && 
  (!defined($studyField) || $studyField == "" || 
   schedule->subject->studyField == $studyField || 
   schedule->subject->studyField._ref == $studyField ||
   schedule->subject->studyField match $studyField ||
   (lower($studyField) == "info" && (schedule->subject->studyField match "informatique" || schedule->subject->studyField == "INFORMATIQUE"))
  )
]{
  _id,
  startTime,
  endTime,
  status,
  "subject": schedule->subject->{ _id, name, code, level, specialty, degree, group, studyField },
  "professor": professor->user->{ name },
  "attendanceCount": count(*[_type == "attendance" && session._ref == ^._id && status == "present"]),
  "lateCount": count(*[_type == "attendance" && session._ref == ^._id && status == "late"]),
} | order(startTime desc)`;

export const getSessionCohort = `*[_type == "student" && 
  level == $level && 
  (!defined($studyField) || $studyField == "" || 
   studyField == $studyField || 
   studyField._ref == $studyField || 
   studyField match $studyField ||
   (lower($studyField) == "info" && (studyField match "informatique" || studyField == "INFORMATIQUE"))
  ) && 
  (!defined($specialty) || specialty == $specialty) &&
  (!defined($group) || $group == "All" || group == $group)
]{
  _id,
  matricule,
  "fullName": firstName + " " + lastName,
  "attendance": *[_type == "attendance" && session._ref == $sessionId && student._ref == ^._id][0]{
    status,
    timeIn,
    markedBy
  }
} | order(lastName asc)`;

export const getActiveSessionsByProfessor = `*[_type == "session" && professor._ref == $professorId && status == "open" && dateTime(endTime) > dateTime(now())]{
  ...,
  "subject": coalesce(schedule->subject->{ name, code, type, level, specialty, group, studyField }, subject->{ name, code, type, level, specialty, group, studyField }),
  "roomName": coalesce(schedule->room->name, room),
  "group": coalesce(schedule->group, group),
  schedule->{ ..., subject->{ name, code, type, level, specialty, group, studyField }, room }
} | order(startTime desc)`;

export const getAllSessionsByProfessor = `*[_type == "session" && professor._ref == $professorId]{
  ...,
  "subject": coalesce(schedule->subject->{ name, code, type, level, specialty, group, studyField }, subject->{ name, code, type, level, specialty, group, studyField }),
  "roomName": coalesce(schedule->room->name, room),
  "group": coalesce(schedule->group, group),
  schedule->{ ..., subject->{ name, code, type, level, specialty, group, studyField }, room },
  "attendanceCount": count(*[_type == "attendance" && session._ref == ^._id])
} | order(startTime desc)`;

export const getSessionById = `*[_type == "session" && _id == $sessionId][0]{
  ...,
  "subject": coalesce(schedule->subject->{ name, code, type, level, specialty, group, studyField }, subject->{ name, code, type, level, specialty, group, studyField }),
  "roomName": coalesce(schedule->room->name, room),
  "group": coalesce(schedule->group, group),
  schedule->{ ..., subject->{ name, code, type, level, specialty, group, studyField }, room }
}`;

// ── Attendance ────────────────────────────────────────────────
export const getAttendanceBySession = `*[_type == "attendance" && session._ref == $sessionId]{
  ...,
  student->{ ..., user->{ name, username } }
} | order(timestamp desc)`;

export const getAttendanceByStudent = `*[_type == "attendance" && student._ref == $studentId]{
  ...,
  session->{ ..., schedule->{ ..., subject->{ name, code }, room } }
} | order(timestamp desc)`;

export const getAttendanceCount = `{
  "total": count(*[_type == "attendance" && student._ref == $studentId]),
  "present": count(*[_type == "attendance" && student._ref == $studentId && status == "present"]),
  "late": count(*[_type == "attendance" && student._ref == $studentId && status == "late"]),
  "absent": count(*[_type == "attendance" && student._ref == $studentId && status == "absent"])
}`;
// ── Assignments ───────────────────────────────────────────────
export const getAssignmentsBySubject = `*[_type == "assignment" && type != "affichage" && subject._ref in $subjectIds && status == "published"]{
  ...,
  subject->{ 
    _id, 
    name, 
    code, 
    level, 
    degree,
    specialty,
    professor->{ "fullName": user->name } 
  },
  "attachments": attachments[]{ _key, "url": asset->url, "originalFilename": asset->originalFilename }
} | order(dueDate asc)`;

export const getAssignmentsByProfessor = `*[_type == "assignment" && type != "affichage" && subject._ref in *[_type == "subject" && professor._ref == $professorId]._id]{
  ...,
  subject->{ _id, name, code, level, degree, specialty },
  "attachments": attachments[]{ _key, "url": asset->url, "originalFilename": asset->originalFilename }
} | order(dueDate desc)`;

export const getAssignmentsBySubjectWithStatus = `*[_type == "assignment" && type != "affichage" && status == "published" && targetAudience != "faculty_admins" && (
  subject._ref in $subjectIds || 
  (targetType == "global" && !defined(subject)) ||
  (targetType == "cohort" && level == $studentLevel && (
      !defined(specialty) || 
      (specialty == $studentSpecialty && (!defined(group) || group == $studentGroup))
  )) ||
  (targetType == "individual" && $studentId in targetStudents[]._ref) ||
  (!defined(targetType) && !defined(subject) && (
    !defined(level) || 
    (level == $studentLevel && (
      !defined(specialty) || 
      (specialty == $studentSpecialty && (!defined(group) || group == $studentGroup))
    ))
  ))
) && (!defined(studyField) || studyField == $studentStudyField)]{
  ...,
  subject->{ 
    _id, 
    name, 
    code, 
    level, 
    degree,
    specialty,
    professor->{ "fullName": user->name } 
  },
  "attachments": attachments[]{ _key, "url": asset->url, "originalFilename": asset->originalFilename },
  "submission": *[_type == "submission" && assignment._ref == ^._id && student._ref == $studentId][0]{
    _id,
    status,
    grade,
    feedback
  }
} | order(dueDate asc)`;
// ── Justifications ──────────────────────────────────────────
export const getJustificationsByStudent = `*[_type == "justification" && student._ref == $studentId]{
  ...,
  "fileUrl": file.asset->url
} | order(submissionDate desc)`;

export const getAllJustifications = `*[_type == "justification" && (
  !defined($studyField) || $studyField == "" || 
  student->studyField match $studyField ||
  (lower($studyField) == "info" && lower(student->studyField) == "informatique") ||
  (lower($studyField) == "informatique" && lower(student->studyField) == "info")
)]{
  ...,
  "fileUrl": file.asset->url,
  student->{
    ...,
    user->{ name, username }
  }
} | order(submissionDate desc)`;
// ── Submissions ───────────────────────────────────────────────
export const getSubmissionStatus = `*[_type == "submission" && assignment._ref == $assignmentId && student._ref == $studentId][0]{
  _id,
  status,
  submissionDate,
  grade,
  feedback,
  content,
  appealMessage,
  appealDate,
  appealStatus,
  "fileUrl": file.asset->url
}`;

export const getSubmissionsByAssignment = `*[_type == "submission" && assignment._ref == $assignmentId]{
  ...,
  student->{
    ...,
    user->{ name, username, email, avatar }
  },
  assignment->{ title, points },
  "fileUrl": file.asset->url
} | order(submissionDate desc)`;

// ── Academic Configuration ────────────────────────────────────
export const getAllAcademicConfigs = `*[_type == "academicConfig"] | order(level asc)`;
