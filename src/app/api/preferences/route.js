import { NextResponse } from "next/server";

const PREFERENCES_COOKIE = "allergenPreferences";
// Define cookie name and 30-day expiration for user preference persistence.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function GET(request) {
  // Retrieve the user's allergen preferences from the secure cookie.
  const cookie = request.cookies.get(PREFERENCES_COOKIE);

  if (!cookie?.value) {
    // Return default preferences if no cookie exists yet.
    return NextResponse.json(
      { selectedAllergens: [], hasSelectedInitialAllergens: false },
      { status: 200 }
    );
  }

  try {
    // Parse stored JSON preferences from cookie value.
    const parsed = JSON.parse(cookie.value);
    const selectedAllergens = Array.isArray(parsed.selectedAllergens)
      ? parsed.selectedAllergens
      : [];

    return NextResponse.json(
      {
        selectedAllergens,
        hasSelectedInitialAllergens: Boolean(
          parsed.hasSelectedInitialAllergens
        ),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to parse allergen preferences cookie:", error);
    return NextResponse.json(
      { selectedAllergens: [], hasSelectedInitialAllergens: false },
      { status: 200 }
    );
  }
}

export async function POST(request) {
  try {
    // Save the user's allergen selections to a secure cookie for session persistence.
    const body = await request.json();
    const selectedAllergens = Array.isArray(body.selectedAllergens)
      ? body.selectedAllergens
      : [];

    const hasSelectedInitialAllergens = Boolean(
      body.hasSelectedInitialAllergens
    );

    const response = NextResponse.json({ success: true }, { status: 200 });

    response.cookies.set({
      // Store allergen preferences as JSON in an httpOnly, secure cookie.
      name: PREFERENCES_COOKIE,
      value: JSON.stringify({
        selectedAllergens,
        hasSelectedInitialAllergens,
      }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Failed to persist allergen preferences:", error);
    return NextResponse.json(
      { message: "Failed to persist allergen preferences." },
      { status: 400 }
    );
  }
}
