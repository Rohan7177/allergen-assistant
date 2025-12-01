import { NextResponse } from "next/server";

const PREFERENCES_COOKIE = "allergenPreferences";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function GET(request) {
  const cookie = request.cookies.get(PREFERENCES_COOKIE);

  if (!cookie?.value) {
    return NextResponse.json(
      { selectedAllergens: [], hasSelectedInitialAllergens: false },
      { status: 200 }
    );
  }

  try {
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
    const body = await request.json();
    const selectedAllergens = Array.isArray(body.selectedAllergens)
      ? body.selectedAllergens
      : [];

    const hasSelectedInitialAllergens = Boolean(
      body.hasSelectedInitialAllergens
    );

    const response = NextResponse.json({ success: true }, { status: 200 });

    response.cookies.set({
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
