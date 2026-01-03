// src/app/api/chat/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import {
  sanitizeAllergenList,
  validateAndNormalizeText,
} from '../../../lib/inputValidation';
import {
  buildUserTextContent,
  extractModelText,
} from '../../../lib/geminiHelpers';

const API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

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
    console.error('Failed to parse chat request body:', error);
    return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { dishName, selectedAllergens } = body ?? {};

  let sanitizedDishName;
  try {
    sanitizedDishName = validateAndNormalizeText(dishName, { required: true });
  } catch (validationError) {
    return NextResponse.json(
      { message: validationError.message || 'Dish name is invalid.' },
      { status: 400 }
    );
  }

  const safeAllergens = sanitizeAllergenList(selectedAllergens);

  // Convert the array of selected allergens into a comma-separated string for the prompt
  const allergenListString = safeAllergens.length > 0
    ? safeAllergens.map((a) => a.toUpperCase()).join(', ')
    : 'NONE_SELECTED';

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // The prompt enforces the allergen filtering logic.
    const prompt = `You are a food expert who helps people find allergens, speaking in a charismatic style like Alton Brown from the Food Network.
When given a dish name, first provide a brief (around 50 words) description of the dish, its origin, and popularity.
You MUST follow the allergen filtering rules below:
1. **The only allergens you are allowed to mention are from this user's selection list:** [${allergenListString}].
2. **Identify common food allergens** for the dish.
3. **ONLY HIGHLIGHT, in a clear, bulleted list, the allergens that are present in the dish AND are on the user's selection list.** Use the '• ' character for the bulleted list. Each allergen must be bolded (e.g., • **MILK**).
4. If the dish contains **ANY** of the user's selected allergens, list those found allergens.
5. If **NONE** of the user's selected allergens are found in the dish, you must output the single line of text: "**None of your selected allergens found.**"
6. After the allergen output (either the list or the 'None found' message), **assess the specific dish's likelihood of cross-contamination (e.g., high, low, or moderate) based on common kitchen practices and ingredients, then provide a general warning about cross-contamination in shared kitchen environments,** and always advise the user to confirm with the establishment.

The dish name is: "${sanitizedDishName}"`;

    const userContent = buildUserTextContent(prompt);
    const result = await model.generateContent({ contents: [userContent] });
    const responseText = extractModelText(result);

    return NextResponse.json({ response: responseText }, { status: 200 });

  } catch (error) {
    console.error("Error communicating with Gemini LLM:", error);
    return NextResponse.json(
      { message: "A culinary misstep has occurred! Failed to retrieve text information.", error: error.message },
      { status: 500 }
    );
  }
}
