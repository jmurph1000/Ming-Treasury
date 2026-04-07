import Keycloak from 'keycloak-connect';
import session from 'express-session';
import { logger } from '../utils/logger.js';

// Keycloak OIDC configuration — all values from environment
const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL || 'http://localhost:8080';
const AUTH_SERVICE_REALM = process.env.AUTH_SERVICE_REALM || 'gusto-internal';
const AUTH_SERVICE_CLIENT_ID = process.env.AUTH_SERVICE_CLIENT_ID || '';
const AUTH_SERVICE_CLIENT_SECRET = process.env.AUTH_SERVICE_CLIENT_SECRET || '';

// Keycloak OIDC well-known endpoints for this realm
const realmUrl = `${AUTH_SERVICE_BASE_URL}/realms/${AUTH_SERVICE_REALM}`;
const oidcBase = `${realmUrl}/protocol/openid-connect`;

export const keycloakEndpoints = {
  authorization: `${oidcBase}/auth`,
  token: `${oidcBase}/token`,
  userinfo: `${oidcBase}/userinfo`,
  logout: `${oidcBase}/logout`,
};

export const keycloakConfig = {
  baseUrl: AUTH_SERVICE_BASE_URL,
  realm: AUTH_SERVICE_REALM,
  clientId: AUTH_SERVICE_CLIENT_ID,
  clientSecret: AUTH_SERVICE_CLIENT_SECRET,
  realmUrl,
};

// Express-session memory store shared with keycloak-connect
const memoryStore = new session.MemoryStore();

// keycloak-connect's .d.ts omits `credentials` from KeycloakConfig but the JS runtime requires it
// for confidential clients. Cast through `any` so TypeScript is satisfied.
const kcConfig: any = {
  realm: AUTH_SERVICE_REALM,
  'auth-server-url': AUTH_SERVICE_BASE_URL,
  'ssl-required': 'external',
  resource: AUTH_SERVICE_CLIENT_ID,
  'confidential-port': 0,
  credentials: { secret: AUTH_SERVICE_CLIENT_SECRET },
};

const keycloak = new Keycloak({ store: memoryStore }, kcConfig);

export { keycloak, memoryStore };

/**
 * Build the full callback URL from the request or env var.
 */
export function getCallbackUrl(): string {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const callbackPath = process.env.AUTH_CALLBACK_URL || '/api/auth/callback';
  return `${backendUrl}${callbackPath}`;
}

/**
 * Validate that required Keycloak env vars are present.
 * Returns null if valid, or an error message string.
 */
export function validateKeycloakConfig(): string | null {
  if (!AUTH_SERVICE_CLIENT_ID) return 'AUTH_SERVICE_CLIENT_ID is not set';
  if (!AUTH_SERVICE_CLIENT_SECRET) return 'AUTH_SERVICE_CLIENT_SECRET is not set';
  if (!AUTH_SERVICE_REALM) return 'AUTH_SERVICE_REALM is not set';
  if (!AUTH_SERVICE_BASE_URL) return 'AUTH_SERVICE_BASE_URL is not set';
  return null;
}

logger.info('Keycloak configuration loaded', {
  realm: AUTH_SERVICE_REALM,
  baseUrl: AUTH_SERVICE_BASE_URL,
  clientId: AUTH_SERVICE_CLIENT_ID,
  callbackUrl: getCallbackUrl(),
});
