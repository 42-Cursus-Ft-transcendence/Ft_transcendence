export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch("/api/me", {
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

/**
 * Fetch user profile data from API
 */
export async function fetchUserProfile(): Promise<{
    userId: number;
    userName: string;
    email: string;
    avatarURL?: string;
    isTotpEnabled: boolean;
} | null> {
    try {
        const res = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include'
        });

        if (res.ok) {
            const userData = await res.json();
            return {
                userId: userData.userId,
                userName: userData.userName,
                email: userData.email,
                avatarURL: userData.avatarURL,
                isTotpEnabled: userData.isTotpEnabled || false
            };
        } else {
            console.error('Failed to fetch user profile');
            return null;
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}