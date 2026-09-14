export const SESSION_COOKIE = "laviecar_session"
export const LOCAL_USER_KEY = "laviecar_user"
export const LOCAL_LOGS_KEY = "laviecar_access_logs"
export const LEGACY_USER_KEY = "3l_moto_user"
export const LEGACY_LOGS_KEY = "3l_moto_access_logs"

export function getJwtSecret(): string {
  return (
    process.env.INTERNAL_API_SECRET ||
    process.env.NEXT_PUBLIC_INTERNAL_API_SECRET ||
    "fallback-secret-key-laviecar"
  )
}
