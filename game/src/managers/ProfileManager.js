/**
 * ProfileManager.js
 * Client-side user profile management with PBKDF2 password hashing.
 * Designed for future backend auth integration.
 */
export class ProfileManager {
    static PROFILE_KEY = 'artlife_profiles';
    static ACTIVE_KEY = 'artlife_active_profile';

    /**
     * Create a new profile with username and password.
     * @returns {{ id, username, createdAt }}
     */
    static async createProfile(username, password) {
        const profiles = ProfileManager._loadProfiles();

        // Check for duplicate username
        if (profiles.some(p => p.username.toLowerCase() === username.toLowerCase())) {
            throw new Error('Username already exists');
        }

        const id = crypto.randomUUID();
        const salt = ProfileManager._generateSalt();
        const passwordHash = password
            ? await ProfileManager._hashPassword(password, salt)
            : null; // Guest profiles have no password

        const profile = {
            id,
            username,
            passwordHash,
            salt,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        };

        profiles.push(profile);
        ProfileManager._saveProfiles(profiles);
        ProfileManager.setActiveProfile(id);

        return { id, username, createdAt: profile.createdAt };
    }

    /**
     * Authenticate a user by username and password.
     * @returns {{ id, username }} on success, throws on failure
     */
    static async authenticate(username, password) {
        const profiles = ProfileManager._loadProfiles();
        const profile = profiles.find(
            p => p.username.toLowerCase() === username.toLowerCase()
        );

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Guest profiles (no password) always authenticate
        if (!profile.passwordHash) {
            profile.lastLogin = new Date().toISOString();
            ProfileManager._saveProfiles(profiles);
            ProfileManager.setActiveProfile(profile.id);
            return { id: profile.id, username: profile.username };
        }

        const hash = await ProfileManager._hashPassword(password, profile.salt);
        if (hash !== profile.passwordHash) {
            throw new Error('ACCESS DENIED');
        }

        profile.lastLogin = new Date().toISOString();
        ProfileManager._saveProfiles(profiles);
        ProfileManager.setActiveProfile(profile.id);
        return { id: profile.id, username: profile.username };
    }

    /**
     * Get all profiles (without sensitive data).
     * @returns {Array<{ id, username, createdAt, isGuest }>}
     */
    static getProfiles() {
        return ProfileManager._loadProfiles().map(p => ({
            id: p.id,
            username: p.username,
            createdAt: p.createdAt,
            isGuest: !p.passwordHash,
        }));
    }

    /**
     * Delete a profile and all its save data.
     */
    static deleteProfile(profileId) {
        const profiles = ProfileManager._loadProfiles().filter(
            p => p.id !== profileId
        );
        ProfileManager._saveProfiles(profiles);

        // Remove all save slots for this profile
        for (let i = 0; i < 5; i++) {
            localStorage.removeItem(`artlife_profile_${profileId}_slot_${i}`);
        }
        localStorage.removeItem(`artlife_profile_${profileId}_last_slot`);

        // Clear active if it was this profile
        if (ProfileManager.getActiveProfile()?.id === profileId) {
            localStorage.removeItem(ProfileManager.ACTIVE_KEY);
        }
    }

    /**
     * Set the active profile.
     */
    static setActiveProfile(profileId) {
        localStorage.setItem(ProfileManager.ACTIVE_KEY, profileId);
    }

    /**
     * Get the active profile metadata (without password).
     * @returns {{ id, username, createdAt, isGuest } | null}
     */
    static getActiveProfile() {
        const id = localStorage.getItem(ProfileManager.ACTIVE_KEY);
        if (!id) return null;
        const profiles = ProfileManager._loadProfiles();
        const p = profiles.find(pr => pr.id === id);
        if (!p) return null;
        return { id: p.id, username: p.username, createdAt: p.createdAt, isGuest: !p.passwordHash };
    }

    /**
     * Ensure a Guest profile exists. Called on first launch for backward compat.
     */
    static ensureGuestProfile() {
        const profiles = ProfileManager._loadProfiles();
        if (profiles.length === 0) {
            const id = crypto.randomUUID();
            profiles.push({
                id,
                username: 'Guest',
                passwordHash: null,
                salt: null,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
            });
            ProfileManager._saveProfiles(profiles);
            ProfileManager.setActiveProfile(id);
            return id;
        }
        return null;
    }

    // ── Crypto Helpers ──

    static async _hashPassword(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
        );
        const bits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: ProfileManager._hexToBuffer(salt),
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            256
        );
        return ProfileManager._bufferToHex(bits);
    }

    static _generateSalt() {
        const arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        return ProfileManager._bufferToHex(arr.buffer);
    }

    static _bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    static _hexToBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes.buffer;
    }

    // ── Storage Helpers ──

    static _loadProfiles() {
        try {
            const raw = localStorage.getItem(ProfileManager.PROFILE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    static _saveProfiles(profiles) {
        localStorage.setItem(ProfileManager.PROFILE_KEY, JSON.stringify(profiles));
    }
}
