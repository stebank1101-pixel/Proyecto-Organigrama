/** Stable, language-agnostic codes the backend (api/index.ts) sends in `{ error: ... }`
 * responses. The frontend maps each code to a translated string (see i18n `common.errors`)
 * instead of displaying whatever raw text the server happened to send — otherwise error
 * messages stay in the server's hardcoded language regardless of the UI language selected. */
export const ERROR_CODES = [
  "SESSION_EXPIRED",
  "ADMIN_ONLY",
  "INVALID_CREDENTIALS",
  "NOT_AUTHENTICATED",
  "PROFILE_MISSING_FIELDS",
  "PROFILE_EMAIL_EXISTS",
  "CANNOT_DELETE_SELF",
  "PROFILE_NOT_FOUND",
  "LAST_ADMIN_REQUIRED",
  "INVALID_NODES_FORMAT",
  "WORK_CENTER_NAME_REQUIRED",
  "NEW_NAME_REQUIRED",
  "DIRECTORY_MISSING_FIELDS",
  "DIRECTORY_NOT_FOUND",
  "TARGET_SEDE_REQUIRED",
  "AI_TARGET_SEDE_REQUIRED",
  "AI_INVALID_ATTACHMENT",
  "AI_NOT_CONFIGURED",
  "AI_RESPONSE_FORMAT_ERROR",
  "AI_COMMUNICATION_ERROR",
  "NETWORK_ERROR",
  "SERVER_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
