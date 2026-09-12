// Convex verifies the JWTs minted by services/session.ts:issueToken against the public
// key served from convex/http.ts. See services/session.ts for the session flow.
export default {
  providers: [
    {
      type: "customJwt",
      applicationID: "celestial-app",
      issuer: process.env.CONVEX_SITE_URL,
      jwks: `${process.env.CONVEX_SITE_URL}/.well-known/jwks.json`,
      algorithm: "RS256",
    },
  ],
};
