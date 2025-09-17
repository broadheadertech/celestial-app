import NextAuth from 'next-auth';
import type { AdapterUser } from 'next-auth/adapters';
import type { Session } from 'next-auth';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { ConvexAdapter } from '@/lib/convex-adapter';

// Type definitions for better type safety
type Role = 'client' | 'admin';

interface ExtendedToken {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  provider?: string;
  providerAccountId?: string;
  sub?: string;
  userId?: string;
  error?: string;
  facebookId?: string;
  role?: Role;
  firstName?: string;
  lastName?: string;
  loginMethod?: string;
  isActive?: boolean;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown; // Allow additional properties
}

interface ExtendedSession {
  accessToken?: string;
  error?: string;
  userId?: string;
  facebookId?: string;
  role?: Role;
  loginMethod?: string;
  isActive?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

interface SessionUserExtended {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  firstName?: string;
  lastName?: string;
  role?: Role;
  loginMethod?: string;
  isActive?: boolean;
  facebookId?: string;
  profilePicture?: string | null;
  createdAt?: number;
  updatedAt?: number;
}

type ExtendedSessionType = Session & ExtendedSession;

type AdapterUserExtended = AdapterUser & {
  firstName?: string;
  lastName?: string;
  role?: Role;
  loginMethod?: string;
  isActive?: boolean;
  facebookId?: string;
  profilePicture?: string | null;
  createdAt?: number;
  updatedAt?: number;
};

interface FacebookProfileData {
  id?: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  picture?: {
    data?: {
      url?: string;
    };
    url?: string;
  };
  image?: string;
}

interface ConvexAuthResponse {
  success: boolean;
  message?: string;
  user?: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive?: boolean;
    facebookId?: string;
    profilePicture?: string | null;
    loginMethod?: string;
    createdAt: number;
    updatedAt: number;
  };
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
}

const convexClient = new ConvexHttpClient(convexUrl);

// Validate required environment variables
if (!process.env.FACEBOOK_CLIENT_ID || !process.env.FACEBOOK_CLIENT_SECRET) {
  throw new Error('Missing required Facebook OAuth environment variables');
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Missing NEXTAUTH_SECRET environment variable');
}

if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
  console.warn('NEXTAUTH_URL is not set in production. This may cause OAuth callback issues.');
}

const handler = NextAuth({
  adapter: ConvexAdapter(),
  providers: [
    CredentialsProvider({
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          const response = await convexClient.mutation(api.services.auth.login, {
            email: credentials.email.toLowerCase(),
            password: credentials.password,
          });

          const result = response as ConvexAuthResponse;

          if (!result.success || !result.user) {
            throw new Error(result.message || 'Invalid email or password');
          }

          const user = result.user;

          const adapterUser: AdapterUserExtended = {
            id: user._id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim() || user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive ?? true,
            facebookId: user.facebookId,
            profilePicture: user.profilePicture ?? null,
            loginMethod: user.loginMethod ?? 'email',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          };

          return adapterUser;
        } catch (error) {
          console.error('Credentials authorize error:', error);
          throw error instanceof Error ? error : new Error('Authentication failed');
        }
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'email public_profile',
        },
      },
      profile(profile) {
        console.log('Facebook profile data received:', JSON.stringify(profile, null, 2));

        const profileData = {
          id: profile.id,
          name: profile.name || `${profile.first_name || 'Facebook'} ${profile.last_name || 'User'}`,
          email: profile.email || `facebook_${profile.id}@facebook.local`,
          image: profile.picture?.data?.url || profile.picture?.url || null,
          firstName: profile.first_name || 'Facebook',
          lastName: profile.last_name || 'User',
        };

        console.log('Facebook profile data processed:', profileData);
        return profileData;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      const mutableToken = token as ExtendedToken;
      const facebookProfile = profile as FacebookProfileData | undefined;

      if (account) {
        mutableToken.accessToken = account.access_token;
        mutableToken.refreshToken = account.refresh_token;
        mutableToken.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
        mutableToken.provider = account.provider;
        mutableToken.providerAccountId = account.providerAccountId;
      }

      if (user) {
        const adapterUser = user as AdapterUserExtended;
        mutableToken.sub = adapterUser.id ?? mutableToken.sub;
        mutableToken.userId = adapterUser.id ?? mutableToken.userId;
        mutableToken.name = adapterUser.name ?? mutableToken.name;
        mutableToken.email = adapterUser.email ?? mutableToken.email;
        mutableToken.picture = adapterUser.image ?? mutableToken.picture;
        mutableToken.firstName = adapterUser.firstName ?? mutableToken.firstName;
        mutableToken.lastName = adapterUser.lastName ?? mutableToken.lastName;
        mutableToken.role = adapterUser.role ?? mutableToken.role;
        mutableToken.loginMethod = adapterUser.loginMethod ?? mutableToken.loginMethod;
        mutableToken.isActive = adapterUser.isActive ?? mutableToken.isActive;
        mutableToken.createdAt = adapterUser.createdAt ?? mutableToken.createdAt;
        mutableToken.updatedAt = adapterUser.updatedAt ?? mutableToken.updatedAt;
        mutableToken.facebookId = adapterUser.facebookId ?? mutableToken.facebookId;
      }

      if (!mutableToken.facebookId && account?.provider === 'facebook') {
        mutableToken.facebookId = account.providerAccountId || facebookProfile?.id;
      }

      if (!mutableToken.name && facebookProfile) {
        mutableToken.name = facebookProfile.name;
      }

      if (!mutableToken.email && facebookProfile) {
        mutableToken.email = facebookProfile.email || `facebook_${facebookProfile.id}@facebook.local`;
      }

      if (!mutableToken.picture && facebookProfile) {
        mutableToken.picture = facebookProfile.picture?.data?.url || facebookProfile.image;
      }

      if (!mutableToken.firstName && facebookProfile) {
        mutableToken.firstName = facebookProfile.first_name;
      }

      if (!mutableToken.lastName && facebookProfile) {
        mutableToken.lastName = facebookProfile.last_name;
      }

      return mutableToken;
    },

    async session({ session, token }) {
      const extendedSession = session as ExtendedSessionType;
      const typedToken = token as ExtendedToken;

      extendedSession.accessToken = typeof typedToken.accessToken === 'string' ? typedToken.accessToken : undefined;
      extendedSession.error = typeof typedToken.error === 'string' ? typedToken.error : undefined;
      extendedSession.userId = (typedToken.userId || typedToken.sub) as string;
      extendedSession.facebookId = typeof typedToken.facebookId === 'string' ? typedToken.facebookId : undefined;
      extendedSession.role = typedToken.role;
      extendedSession.loginMethod = typeof typedToken.loginMethod === 'string' ? typedToken.loginMethod : undefined;
      extendedSession.isActive = typeof typedToken.isActive === 'boolean' ? typedToken.isActive : undefined;
      extendedSession.createdAt = typeof typedToken.createdAt === 'number' ? typedToken.createdAt : undefined;
      extendedSession.updatedAt = typeof typedToken.updatedAt === 'number' ? typedToken.updatedAt : undefined;

      if (session.user) {
        const sessionUser = session.user as unknown as SessionUserExtended;
        sessionUser.id = (typedToken.userId || typedToken.sub) as string;
        sessionUser.name = (typeof typedToken.name === 'string' ? typedToken.name : undefined) ?? sessionUser.name ?? null;
        sessionUser.email = (typeof typedToken.email === 'string' ? typedToken.email : undefined) ?? sessionUser.email ?? null;
        sessionUser.image = (typeof typedToken.picture === 'string' ? typedToken.picture : undefined) ?? sessionUser.image ?? null;
        sessionUser.firstName = typedToken.firstName ?? sessionUser.firstName;
        sessionUser.lastName = typedToken.lastName ?? sessionUser.lastName;
        sessionUser.role = typedToken.role ?? sessionUser.role;
        sessionUser.loginMethod = typedToken.loginMethod ?? sessionUser.loginMethod;
        sessionUser.isActive = typedToken.isActive ?? sessionUser.isActive;
        sessionUser.facebookId = typedToken.facebookId ?? sessionUser.facebookId;
        sessionUser.profilePicture = (typeof typedToken.picture === 'string' ? typedToken.picture : undefined) ?? sessionUser.profilePicture ?? null;
        sessionUser.createdAt = typedToken.createdAt ?? sessionUser.createdAt;
        sessionUser.updatedAt = typedToken.updatedAt ?? sessionUser.updatedAt;
      }

      return session;
    },

    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', {
        provider: account?.provider,
        userId: user?.id,
        profileId: (profile as FacebookProfileData | undefined)?.id,
        profileEmail: (profile as FacebookProfileData | undefined)?.email
      });

      if (account?.provider === 'facebook') {
        console.log('Facebook user signing in successfully');
        // Always allow Facebook sign in
        return true;
      }

      // Allow sign in for all providers
      return true;
    },

    async redirect({ url, baseUrl }) {
      console.log('NextAuth redirect called:', { url, baseUrl });

      // Allows relative callback URLs
      if (url.startsWith("/")) {
        const fullUrl = `${baseUrl}${url}`;
        console.log('Redirecting to relative URL:', fullUrl);
        return fullUrl;
      }

      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        console.log('Redirecting to same origin URL:', url);
        return url;
      }

      console.log('Redirecting to base URL:', baseUrl);
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };
