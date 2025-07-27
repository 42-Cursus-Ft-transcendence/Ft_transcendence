export async function checkAuth() {
    try {
        const res = await fetch("/api/checkAuth", {
            method: "GET",
            credentials: "include",
        });
        console.log(">> Front: checking auth status", res.status);
        return res.ok;
    }
    catch {
        console.error(">> Front: error checking auth status");
        return false;
    }
}
/**
 * Fetch user profile data from API
 */
export async function fetchUserProfile() {
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
        }
        else {
            console.error('Failed to fetch user profile');
            return null;
        }
    }
    catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}
//# sourceMappingURL=auth.js.map