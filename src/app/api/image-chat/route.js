// src/app/api/image-chat/route.js
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// Ensure the OpenAI API key is available from environment variables.
// This should be set in .env.local for local development
// and as an environment variable in Vercel for deployment.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Define the POST handler for the API route
export async function POST(request) {
  // Extract the imageDataUrl from the request body
  const { imageDataUrl } = await request.json();

  // Basic validation for the input image data
  if (!imageDataUrl) {
    return NextResponse.json({ message: 'Image data is required.' }, { status: 400 });
  }

  // Extract the base64 string from the data URL
  // Example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..." -> "/9j/4AAQSkZJRgABAQ..."
  const base64Image = imageDataUrl.split(',')[1];
  if (!base64Image) {
    return NextResponse.json({ message: 'Invalid image data format.' }, { status: 400 });
  }

  try {
    // Call the OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // gpt-4o is a good choice for vision, balancing cost and capability
      messages: [
        {
          role: "system",
          content: `You are an expert culinary assistant specializing in identifying dishes and their common allergens from menu images.
          Your task is to analyze the provided image, identify distinct dishes, and for each dish, list its common allergens.
          Focus on these common allergens: peanuts, tree nuts, milk, fish, shellfish, egg, soy, wheat, and gluten.
          
          **Output Format:**
          For each identified dish, output a single line in the format:
          **[Dish Name]** - [List of Allergens, comma-separated]
          
          If a dish has no common allergens from the list, state "No common allergens".
          List each dish on a new line.
          
          **Important:**
          - If the image does not appear to be a menu, or if the text is unreadable, respond with: "I'm sorry, but that doesn't appear to be a readable menu or a menu at all. Please try uploading a clearer image of a menu."
          - Do NOT include any introductory or concluding remarks. Just the list of dishes and allergens, or the error message.
          - If you cannot identify any dishes from the image, state: "No dishes could be identified from this image. Please ensure it's a clear image of a menu."
          `,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Please identify the dishes and their common allergens from this menu image." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`, // Or image/png depending on your input
              },
            },
          ],
        },
      ],
      max_tokens: 500, // Limit the response length to keep it concise
    });

    const llmResponseContent = response.choices[0].message.content;

    // Check for specific error messages from the LLM if it couldn't process the image content
    if (llmResponseContent.includes("I'm sorry, but that doesn't appear to be a readable menu or a menu at all.") ||
        llmResponseContent.includes("No dishes could be identified from this image.")) {
      return NextResponse.json({
        response: llmResponseContent, // Send the LLM's specific error message
        isLlmError: true // Custom flag to indicate this is an LLM-generated error message
      }, { status: 200 }); // Still 200 OK because the LLM processed it, just couldn't recognize
    }

    // Return the LLM's structured response
    return NextResponse.json({ response: llmResponseContent }, { status: 200 });

  } catch (error) {
    console.error("Error calling OpenAI Vision API:", error);
    // Return a generic error message if the API call itself failed
    return NextResponse.json(
      { message: "Menu recognition failed. It seems there was a technical glitch in analyzing the image. Please try again!", error: error.message },
      { status: 500 }
    );
  }
}
