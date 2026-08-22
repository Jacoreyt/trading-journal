// Supabase/Postgrest errors are plain { message, code, ... } objects, not
// `Error` instances, so `err instanceof Error` misses them and swallows the
// actual reason. Handle both shapes.
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "unknown error";
}
