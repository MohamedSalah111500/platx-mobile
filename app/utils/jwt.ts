/**
 * Decode JWT token payload and extract numeric IDs.
 * Used to get the backend's numeric student/staff ID from login tokens.
 */

export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    // base64url → base64
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

export function extractNumericId(token: string): number | undefined {
  const payload = decodeJwtPayload(token);
  console.log('[JWT] Token claims:', JSON.stringify(payload).substring(0, 600));

  // Check common .NET JWT claim keys for numeric IDs
  const candidates = [
    payload.StudentId,
    payload.studentId,
    payload.student_id,
    payload.StaffId,
    payload.staffId,
    payload.staff_id,
    payload.EntityId,
    payload.entityId,
    payload.entity_id,
    payload.Id,
    payload.id,
    payload.sid,
    payload.nameid,
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid'],
    payload.sub,
  ];

  for (const val of candidates) {
    if (val != null) {
      const num = Number(val);
      if (!isNaN(num) && num > 0 && Number.isInteger(num)) return num;
    }
  }
  return undefined;
}
