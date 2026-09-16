export function isLocalDev(): boolean {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}