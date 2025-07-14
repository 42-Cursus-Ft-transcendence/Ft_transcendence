export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch("/me", {
      method: "GET",
      credentials: "include",
    });
    console.log(">> Front: checking auth status", res.status);
    return res.ok;
  } catch {
    console.error(">> Front: error checking auth status");
    return false;
  }
}
