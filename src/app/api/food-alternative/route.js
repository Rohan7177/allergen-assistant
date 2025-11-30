import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export async function POST(request) {
  const { userPrompt, selectedAllergens } = await request.json();

  if (!userPrompt || typeof userPrompt !== "string") {
    return NextResponse.json(
      { message: "A prompt describing the dish or craving is required." },
      { status: 400 }
    );
  }

  const allergenList = Array.isArray(selectedAllergens) ? selectedAllergens : [];
  const allergenListString = allergenList.length
    ? allergenList.map((a) => a.toUpperCase()).join(", ")
    : "NONE_SELECTED";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a Michelin-level chef and food scientist channeling the charismatic narration of Alton Brown. A user will describe a dish they currently cannot eat or an experience they are craving, along with the allergens they must avoid.

User allergen watchlist (uppercase): [${allergenListString}]
User description: "${userPrompt}"

Your task is to propose satisfying alternative dishes, cooking techniques, or ingredient swaps that mimic the experience while avoiding every allergen on the user's watchlist.

Absolute rules:
1. If the watchlist is not "NONE_SELECTED", DO NOT suggest anything containing those allergens. Confirm explicitly which flagged allergens each alternative avoids.
2. Provide between one and three alternatives formatted as:
   • **Alternative Name** — short sensory description, interesting culinary insight, and a sentence explaining how it avoids the flagged allergens.
3. When relevant, suggest ingredient swaps or preparation tips to keep the experience exciting and safe.
4. If the user's idea already appears safe relative to their watchlist, acknowledge that and offer optional improvements or serving ideas.
5. If you truly cannot find an allergen-safe analogue, be honest, explain why, and suggest how to consult a professional chef or allergist.
6. End every response with a concise reminder about cross-contamination and checking with the establishment.

Keep the tone warm, curious, and empowering. Avoid repeating the user's exact words verbatim unless clarifying their request.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText }, { status: 200 });
  } catch (error) {
    console.error("Error communicating with Gemini LLM (food alternative):", error);
    return NextResponse.json(
      {
        message:
          "A culinary misstep has occurred! Failed to retrieve an allergen-safe alternative recommendation.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
