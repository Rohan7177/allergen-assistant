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
  const textPrompt = `You are a food expert who helps people find allergens, speaking in a charismatic style like Alton Brown.
Analyze this image, which contains a menu or a list of dishes.

For **EACH dish** you identify in the image, you MUST follow these allergen filtering rules:
1. **The only allergens you are allowed to mention are from this user's selection list:** [${allergenListString}].
2. Provide a brief introduction and name the dish clearly using bold text (e.g., "**Chicken Pot Pie**").
3. **ONLY HIGHLIGHT, in a clear, bulleted list, the allergens that are present in the dish AND are on the user's selection list.** Use the '• ' character for the bulleted list. Each allergen must be bolded (e.g., • **MILK**).
4. If the dish contains **NONE** of the user's selected allergens, you must output the single line of text: "**None of your selected allergens found.**" for that dish.
5. After analyzing all dishes, provide a general summary and a single, final warning about cross-contamination in shared kitchen environments, advising the user to confirm with the establishment.`;
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // The contents array includes both the text prompt and the image data
    const contents = [imagePart, { text: textPrompt }];

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
