import { z } from "zod";

const firebaseLookupResponseSchema = z.object({
  users: z
    .array(
      z.object({
        localId: z.string(),
        email: z.string().email().optional(),
        displayName: z.string().optional(),
        photoUrl: z.string().optional(),
        emailVerified: z.boolean().optional(),
        providerUserInfo: z
          .array(
            z.object({
              providerId: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
});

export type FirebaseVerifiedUser = {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  emailVerified: boolean;
  providerIds: string[];
};

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<FirebaseVerifiedUser> {
  const apiKey =
    process.env.FIREBASE_API_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing Firebase API key.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Firebase token verification failed.");
  }

  const payload = firebaseLookupResponseSchema.parse(await response.json());
  const user = payload.users?.[0];

  if (!user?.localId || !user.email) {
    throw new Error("Firebase token did not contain a usable user.");
  }

  return {
    uid: user.localId,
    email: user.email.toLowerCase(),
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    emailVerified: user.emailVerified ?? false,
    providerIds:
      user.providerUserInfo
        ?.map((provider) => provider.providerId)
        .filter((provider): provider is string => Boolean(provider)) ?? [],
  };
}
