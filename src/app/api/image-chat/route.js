// src/app/api/image-chat/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import {
  sanitizeAllergenList,
  validateImagePayload,
} from '../../../lib/inputValidation';
import { buildUserTextContent, extractModelText } from '../../../lib/geminiHelpers';

const API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Helper function to convert base64 image data into the format expected by the API
// Convert base64 image data to API-compatible format while preserving MIME type.
function convertToGenerativePart(base64Data, mimeType) {
  return {
    inlineData: {
      data: base64Data.split(',')[1], 
      mimeType,
    },
  };
}

// Define allowed image MIME types for validation
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export async function POST(request) {
  if (!API_KEY) {
    console.error('GOOGLE_API_KEY environment variable is not set.');
    return NextResponse.json(
      { message: 'Server misconfigured: missing Gemini API key.' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error('Failed to parse image-chat request body:', error);
    return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { imageDataUrl, mimeType, selectedAllergens } = body ?? {};

  try {
    // Validate uploaded image file to ensure safe type and size before processing.
    validateImagePayload({ dataUrl: imageDataUrl, mimeType, size: body?.fileSize });

    // Additional file handling comments for image upload validation
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      throw new Error('Only JPEG, PNG, GIF, WEBP, HEIC, or HEIF images are allowed.');
    }
    // Enforce file size limit to prevent denial of service and storage abuse
    if (body?.fileSize > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Image file size exceeds the 10MB limit.');
    }
  } catch (validationError) {
    return NextResponse.json(
      { message: validationError.message || 'Invalid image payload.' },
      { status: 400 }
    );
  }

  const safeAllergens = sanitizeAllergenList(selectedAllergens);

  // Convert the array of selected allergens into a comma-separated string
  const allergenListString = safeAllergens.length > 0
    ? safeAllergens.map(a => a.toUpperCase()).join(', ')
    : 'NONE_SELECTED'; 

  const imagePart = convertToGenerativePart(imageDataUrl, mimeType);

  // Prepare image part for multimodal AI analysis with proper base64 encoding.

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

    const textPart = buildUserTextContent(textPrompt);
    const contents = [
      {
        role: textPart.role,
        parts: [...textPart.parts, imagePart],
      },
    ];

    const result = await model.generateContent({ contents });
    const responseText = extractModelText(result);

    return NextResponse.json({ response: responseText }, { status: 200 });

  } catch (error) {
    console.error("Error communicating with Gemini Multimodal LLM:", error);
    return NextResponse.json(
      { message: "A culinary misstep has occurred! Failed to process the menu image.", error: error.message },
      { status: 500 }
    );
  }
}
