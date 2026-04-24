// ============================================================
// Sanity Schema Index — Exports all document schemas
// ============================================================

import user from "./user";
import student from "./student";
import professor from "./professor";
import subject from "./subject";
import schedule from "./schedule";
import room from "./room";
import device from "./device";
import session from "./session";
import attendance from "./attendance";
import assignment from "./assignment";
import fingerprint from "./fingerprint";
import rfidCard from "./rfidCard";
import justification from "./justification";
import submission from "./submission";
import notification from "./notification";
import academicConfig from "./academicConfig";
import studyField from "./studyField";
import systemConfig from "./systemConfig";
import makeUpRequest from "./makeUpRequest";

export const schemaTypes = [
    user,
    academicConfig,
    student,
    professor,
    subject,
    schedule,
    room,
    device,
    session,
    attendance,
    fingerprint,
    rfidCard,
    assignment,
    justification,
    submission,
    notification,
    studyField,
    systemConfig,
    makeUpRequest,
];
