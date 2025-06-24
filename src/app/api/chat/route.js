// src/app/api/chat/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server'; // Import NextResponse for App Router APIs

// Ensure the API key is available from environment variables
// This key should be set in a .env.local file for local development
// and as an environment variable in Vercel for deployment.
const API_KEY = process.env.GOOGLE_API_KEY;

// Initialize Google Generative AI
// It's important to instantiate this once to reuse the configuration.
const genAI = new GoogleGenerativeAI(API_KEY);

// Define the POST handler for the API route
// In the App Router, specific HTTP methods are exported as functions (GET, POST, etc.)
export async function POST(request) {
  // Extract the dishName from the request body
  // Request body is now accessed via request.json()
  const { dishName } = await request.json();

  // Basic validation for the input
  if (!dishName) {
    return NextResponse.json({ message: 'Dish name is required.' }, { status: 400 });
  }

  try {
    // Select the generative model.
    // Changing from "gemini-pro" or "gemini-1.0-pro" to "gemini-1.0-flash" for a simpler, potentially faster, free model.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Construct the prompt for the LLM
    // This prompt defines the persona, tone, and specific information required.
    const prompt = `You are a food expert who loves to help folks find out what's in their grub, with a rootin' tootin' fun tone, just like Woody from Toy Story! When given a dish name, tell me all about it in about 100 words: its origin story, why it's so darn popular, and then, the most important part, identify any common food allergens like peanuts, tree nuts, milk, fish, shellfish, egg, soy, wheat, and gluten. Don't forget to keep it light and friendly, partner! The dish name is: "${dishName}"`;

    // Generate content using the model
    const result = await model.generateContent(prompt);
    const responseText = result.response.text(); // Get the plain text response

    // Send the LLM's response back using NextResponse
    return NextResponse.json({ response: responseText }, { status: 200 });

  } catch (error) {
    console.error("Error communicating with Gemini LLM:", error);
    // Return a user-friendly error message
    return NextResponse.json(
      { message: "Whoops! Looks like my lasso got tangled. Couldn't fetch that info right now. Try again, partner!", error: error.message },
      { status: 500 }
    );
  }
}
