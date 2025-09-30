import NextAuth from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

type Role = "client" | "admin" | "super_admin";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const result = await convex.mutation(api.services.auth.login, {
            email: credentials.email.toLowerCase(),
            password: credentials.password,
          });

          if (!result.success || !result.user) {
            return null;
          }

          return {
            id: result.user._id,
            email: result.user.email,
            name: `${result.user.firstName} ${result.user.lastName}`,
            role: result.user.role,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.role = (user as any).role || "client";
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
      }

      // Handle Facebook login
      if (account?.provider === "facebook" && profile) {
        try {
          const facebookProfile = profile as any;
          const userData = {
            email:
              facebookProfile.email ||
              `facebook_${facebookProfile.id}@facebook.local`,
            firstName: facebookProfile.first_name || "Facebook",
            lastName: facebookProfile.last_name || "User",
            role: "client" as const,
            isActive: true,
            facebookId: facebookProfile.id,
            profilePicture: facebookProfile.picture?.data?.url,
            loginMethod: "facebook" as const,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          // Try to create or get existing Facebook user
          const result = await convex.mutation(
            api.services.auth.createFacebookUser,
            { userData },
          );

          if (result.success) {
            token.role = result.user.role;
            token.firstName = result.user.firstName;
            token.lastName = result.user.lastName;
            token.id = result.user._id;
          }
        } catch (error) {
          console.error("Error handling Facebook user:", error);
          // Check if user already exists
          if (
            error instanceof Error &&
            error.message.includes("already exists")
          ) {
            try {
              const existingUser = await convex.query(
                api.services.auth.getUserByEmail,
                {
                  email:
                    (profile as any).email ||
                    `facebook_${(profile as any).id}@facebook.local`,
                },
              );

              if (existingUser) {
                token.role = existingUser.role;
                token.firstName = existingUser.firstName;
                token.lastName = existingUser.lastName;
                token.id = existingUser._id;
              }
            } catch (e) {
              console.error("Error getting existing user:", e);
            }
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).firstName = token.firstName;
        (session.user as any).lastName = token.lastName;
        (session.user as any).id = token.id || token.sub;
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      return true; // Allow all sign ins
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
