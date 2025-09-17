import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
}

const convex = new ConvexHttpClient(convexUrl);

type Role = 'client' | 'admin';

interface ConvexUserRecord {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
  facebookId?: string;
  profilePicture?: string;
  loginMethod?: 'email' | 'facebook';
  createdAt: number;
  updatedAt: number;
}

interface AdapterUserLike {
  _id?: string;
  id?: string;
  email?: string | null;
  firstName?: string;
  lastName?: string;
  name?: string | null;
  profilePicture?: string | null;
  image?: string | null;
  role?: Role;
  isActive?: boolean;
  facebookId?: string;
  loginMethod?: 'email' | 'facebook';
  createdAt?: number;
  updatedAt?: number;
}

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
  sub?: string;
}

interface ConvexAuthMutationResult {
  success: boolean;
  message?: string;
  user: ConvexUserRecord;
}

const isConvexUserRecord = (value: unknown): value is ConvexUserRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<ConvexUserRecord>;
  return typeof record._id === 'string' && typeof record.email === 'string';
};

const isConvexAuthMutationResult = (value: unknown): value is ConvexAuthMutationResult => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<ConvexAuthMutationResult>;
  return typeof record.success === 'boolean' && isConvexUserRecord(record.user);
};

const mapConvexUserToNextAuth = (user: AdapterUserLike) => {
  const id = user._id ?? user.id;
  const firstName = user.firstName ?? (typeof user.name === 'string' ? user.name.split(' ')[0] : undefined);
  const lastName = user.lastName ?? (typeof user.name === 'string' ? user.name.split(' ').slice(1).join(' ') : undefined);

  return {
    id,
    email: typeof user.email === 'string' ? user.email : undefined,
    name: user.name ?? `${firstName ?? ''} ${lastName ?? ''}`.trim() || user.email ?? undefined,
    image: user.profilePicture ?? user.image ?? null,
    firstName,
    lastName,
    role: user.role ?? 'client',
    isActive: user.isActive ?? true,
    facebookId: user.facebookId,
    profilePicture: user.profilePicture ?? user.image ?? null,
    loginMethod: user.loginMethod ?? (user.facebookId ? 'facebook' : 'email'),
    createdAt: typeof user.createdAt === 'number' ? user.createdAt : Date.now(),
    updatedAt: typeof user.updatedAt === 'number' ? user.updatedAt : Date.now(),
  };
};

export function ConvexAdapter() {
  return {
    async createUser(profile: Record<string, unknown>) {
      try {
        console.log('ConvexAdapter: Creating user with profile:', profile);

        // Extract Facebook profile data with fallbacks
        const profileData = profile as FacebookProfileData;
        const fullName = profileData.name || '';
        const nameParts = typeof fullName === 'string' ? fullName.split(' ') : [];
        const firstName = profileData.first_name || nameParts[0] || 'Facebook';
        const lastName = profileData.last_name || nameParts.slice(1).join(' ') || 'User';
        const profileId = profileData.id || profileData.sub || 'unknown';
        const email = profileData.email || `${profileId}@facebook.local`;

        // Extract profile picture URL safely
        let profilePicture: string | undefined;
        if (profileData.picture?.data?.url) {
          profilePicture = profileData.picture.data.url;
        } else if (profileData.image) {
          profilePicture = profileData.image;
        }

        // Prepare user data for Convex
        const userData = {
          email: email.toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: 'client' as const,
          isActive: true,
          facebookId: profileId,
          profilePicture,
          loginMethod: 'facebook' as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        console.log('ConvexAdapter: Creating Facebook user with data:', userData);

        // Create user using Convex mutation
        const result = await convex.mutation(api.services.auth.createFacebookUser, { userData });

        if (!isConvexAuthMutationResult(result)) {
          throw new Error('ConvexAdapter: Invalid response when creating Facebook user');
        }

        if (!result.success) {
          console.error('ConvexAdapter: Failed to create Facebook user:', result.message);
          throw new Error(result.message || 'Failed to create user');
        }

        console.log('ConvexAdapter: User created successfully:', result.user);

        // Return user in NextAuth format
        return {
          ...mapConvexUserToNextAuth(result.user),
          emailVerified: null, // Facebook users don't have email verification dates
        };
      } catch (error) {
        console.error('ConvexAdapter: Error creating user:', error);

        if (error instanceof Error && error.message.includes('already exists')) {
          console.log('ConvexAdapter: User already exists, attempting to fetch existing record');

          const profileData = profile as FacebookProfileData;
          const email = typeof profileData?.email === 'string' ? profileData.email.toLowerCase() : '';

          if (email) {
            const existingByEmail = await convex.query(api.services.auth.getUserByEmail, { email });

            if (isConvexUserRecord(existingByEmail)) {
              return {
                ...mapConvexUserToNextAuth(existingByEmail),
                emailVerified: null,
              };
            }
          }

          if (profileData?.id) {
            const existingByFacebook = await convex.query(api.services.auth.getUserByFacebookId, {
              facebookId: profileData.id,
            });

            if (isConvexUserRecord(existingByFacebook)) {
              return {
                ...mapConvexUserToNextAuth(existingByFacebook),
                emailVerified: null,
              };
            }
          }
        }

        throw error;
      }
    },

    async getUser(id: string) {
      try {
        console.log('ConvexAdapter: Getting user by ID:', id);

        const user = await convex.query(api.services.auth.getCurrentUser, { userId: id as Id<'users'> });

        if (!isConvexUserRecord(user)) {
          console.log('ConvexAdapter: User not found');
          return null;
        }

        console.log('ConvexAdapter: User found:', user);

        // Return user in NextAuth format
        return {
          ...mapConvexUserToNextAuth(user),
          emailVerified: null,
        };
      } catch (error) {
        console.error('ConvexAdapter: Error getting user:', error);
        return null;
      }
    },

    async getUserByEmail(email: string) {
      try {
        console.log('ConvexAdapter: Getting user by email:', email);

        const user = await convex.query(api.services.auth.getUserByEmail, { email: email.toLowerCase() });

        if (!isConvexUserRecord(user)) {
          console.log('ConvexAdapter: User not found by email');
          return null;
        }

        console.log('ConvexAdapter: User found by email:', user);

        // Return user in NextAuth format
        return {
          ...mapConvexUserToNextAuth(user),
          emailVerified: null, // Facebook users don't have email verification dates
        };
      } catch (error) {
        console.error('ConvexAdapter: Error getting user by email:', error);
        return null;
      }
    },

    async getUserByAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      if (provider === 'facebook') {
        try {
          console.log('ConvexAdapter: Getting user by Facebook ID:', providerAccountId);

          const user = await convex.query(api.services.auth.getUserByFacebookId, { facebookId: providerAccountId });

          if (!isConvexUserRecord(user)) {
            console.log('ConvexAdapter: User not found by Facebook ID');
            return null;
          }

          console.log('ConvexAdapter: User found by Facebook ID:', user);

          // Return user in NextAuth format
          return {
            ...mapConvexUserToNextAuth(user),
            emailVerified: null,
          };
        } catch (error) {
          console.error('ConvexAdapter: Error getting user by Facebook ID:', error);
          return null;
        }
      }
      return null;
    },

    async updateUser(user: Record<string, unknown>) {
      try {
        console.log('ConvexAdapter: Updating user:', user);

        // Update user Facebook data if needed
        const targetUserId = user.id ?? user._id;

        if (user.facebookId && targetUserId) {
          await convex.mutation(api.services.auth.updateUserFacebookData, {
            userId: targetUserId as Id<'users'>,
            facebookId: user.facebookId,
            profilePicture: typeof user.image === 'string' ? user.image : undefined,
            loginMethod: 'facebook',
          });
        }

        console.log('ConvexAdapter: User updated successfully');

        // Return user in NextAuth format
        return {
          ...mapConvexUserToNextAuth(user),
          emailVerified: null,
        };
      } catch (error) {
        console.error('ConvexAdapter: Error updating user:', error);
        throw error;
      }
    },

    async deleteUser(userId: string) {
      try {
        console.log('ConvexAdapter: Deleting user:', userId);

        // For now, just deactivate the user instead of deleting
        await convex.mutation(api.services.auth.deactivateAccount, { userId: userId as Id<'users'> });

        console.log('ConvexAdapter: User deactivated successfully');
        // NextAuth expects null or undefined for successful deletion
        return null;
      } catch (error) {
        console.error('ConvexAdapter: Error deleting user:', error);
        throw error;
      }
    },

    async linkAccount(account: Record<string, unknown>) {
      console.log('ConvexAdapter: Linking account:', account);
      // Account linking is handled during user creation/update
      return account;
    },

    async unlinkAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      console.log('ConvexAdapter: Unlinking account:', provider, providerAccountId);
      // Handle unlinking if needed
      return true;
    },
  };
}
