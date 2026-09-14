
// Links from .env (Do not remove, need all links commented or not)
//export const VITE_API_BASE_URL = "https://gymmanagement.dockyardsoftware.com";
export const VITE_API_BASE_URL = "http://localhost:60748";

export const API_BASE_URL = (VITE_API_BASE_URL || 'https://gymmanagement.dtselife.com').replace(/\/+$/, '');

export const ROLES = { ADMIN: 'Admin', TRAINER: 'Trainer', MEMBER: 'Member' };
//export const ROLE_NAMES = { 1: 'Admin', 2: 'Trainer', 3: 'Member' };


