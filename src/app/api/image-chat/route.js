// src/app/api/image-chat/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

// Initialize Google Generative AI
const API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Helper function to convert base64 image data into the format expected by the API
function convertToGenerativePart(base64Data, mimeType) {
  return {
    inlineData: {
      data: base64Data.split(',')[1], // Strip the 'data:mime/type;base64,' prefix
      mimeType,
    },
  };
}

export async function POST(request) {
  // Expecting image data (base64 URL), the associated prompt, and selected allergens
  const { imageDataUrl, mimeType, selectedAllergens } = await request.json(); 

  if (!imageDataUrl || !mimeType) {
    return NextResponse.json({ message: 'Image data and mime type are required.' }, { status: 400 });
  }

  // Convert the array of selected allergens into a comma-separated string
  const allergenListString = selectedAllergens && selectedAllergens.length > 0 
    ? selectedAllergens.map(a => a.toUpperCase()).join(', ') 
    : 'NONE_SELECTED'; 

  const imagePart = convertToGenerativePart(imageDataUrl, mimeType);

  // The prompt must instruct the model to analyze the image, detect dishes, and apply filtering for each one.
  const textPrompt = `You are a food allergen expert with the charismatic flair of Alton Brown.
Carefully review the supplied image of a menu or list of dishes and extract as many dish names and ingredient details as possible.

User allergen watchlist (uppercase): [${allergenListString}].

Output rules you must follow without exception:
1. **Only mention dishes that include at least one allergen from the user's watchlist.** If a dish does not contain any of the user's selected allergens, do not mention it.
2. When you list a qualifying dish, format it like this:
   • First line: dish name in bold, for example "**Chicken Pot Pie**".
   • Subsequent lines: use the exact bullet prefix "• " followed by the allergen in bold and a concise justification referencing the ingredient or description (for example, "• **MILK** — creamy béchamel sauce").
3. Never mention allergens that are not part of the user's watchlist. If an allergen is suspected but uncertain, explicitly say "possible" in your justification.
4. If **no dishes** contain the user's selected allergens, respond instead with the single line "**Good news:** I didn't spot any of your selected allergens in the visible dishes.".
5. Conclude every response with a brief summary sentence plus a single warning about kitchen cross-contamination, encouraging the user to confirm details with the establishment.`;
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contents = [
      {
        role: "user",
        parts: [
          { text: textPrompt },
          imagePart,
        ],
      },
    ];

    const result = await model.generateContent({ contents });
    const responseText = result.response.text(); 

    return NextResponse.json({ response: responseText }, { status: 200 });

  } catch (error) {
    console.error("Error communicating with Gemini Multimodal LLM:", error);
    return NextResponse.json(
      { message: "A culinary misstep has occurred! Failed to process the menu image.", error: error.message },
      { status: 500 }
    );
  }
}
