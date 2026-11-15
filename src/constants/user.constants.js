export const GET_USER_ROLES = Object.freeze({
    MEMBER: "MEMBER",
    ADMIN: "ADMIN"
});
export const VALID_USER_ROLES = Object.values(GET_USER_ROLES);


export const GET_USER_TIERS = Object.freeze({
    FREE: "FREE",
    PREMIUM: "PREMIUM"
});
export const VALID_USER_TIERS = Object.values(GET_USER_TIERS);


export const GET_USER_STATUS = Object.freeze({
    BANNED: "BANNED",
    ACTIVE: "ACTIVE",
    RESTRICTED: "RESTRICTED"
});
export const VALID_USER_STATUSES = Object.values(GET_USER_STATUS);


export const GET_USER_PROVIDER = Object.freeze({
    LOCAL: "LOCAL",
    GOOGLE: "GOOGLE",
    GITHUB: "GITHUB"
});
export const VALID_USER_PROVIDERS = Object.values(GET_USER_PROVIDER);

export const FRIEND_REQUEST_RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;