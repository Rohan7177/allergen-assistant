"use client"; // This MUST be the very first line of the file!

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform
} from 'react-native-web';

// Helper component to format text with bolding and handle newlines
const FormattedText = ({ text, style, boldStyle, errorStyle }) => {
  // FIX: Ensure 'text' is always treated as a string to prevent 'undefined.split' error.
  const safeText = text || ''; 
  const parts = safeText.split(/(\*\*.*?\*\*)/g); // Split by **bold text** retaining the delimiters

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Render bold text
          return (
            <Text key={index} style={boldStyle}>
              {part.substring(2, part.length - 2)} {/* Remove ** */}
            </Text>
          );
        } else {
          // Render regular text, handling newlines if present
          const lines = part.split('\n');
          return lines.map((line, lineIndex) => (
            <React.Fragment key={`${index}-${lineIndex}`}>
              <Text style={errorStyle ? errorStyle : style}>{line}</Text>
              {lineIndex < lines.length - 1 && <Text>{"\n"}</Text>} {/* Add newline for line breaks */}
            </React.Fragment>
          ));
        }
      })}
    </Text>
  );
};

// SVG Icon for Chatbot (Chef Hat) - Dark color for contrast on bright avatar background
const ChefHatIcon = ({ size = 24 }) => (
  <Text style={{ fontSize: size, lineHeight: size, color: '#121212' }}>👨‍🍳</Text>
);

// SVG Icon for User (Person Outline) - Dark color for contrast on bright avatar background
const PersonIcon = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
      stroke="#121212" // Dark stroke for contrast
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 14C7.79186 14 4.38075 16.5888 4.02097 20.6582C3.96866 21.229 4.41738 22 5.00040 22H19.0004C19.5834 22 20.0321 21.229 19.9798 20.6582C19.62 16.5888 16.2089 14 12 14Z"
      stroke="#121212" // Dark stroke for contrast
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Main App Component
const App = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const scrollViewRef = useRef();
  const [isLoading, setIsLoading] = useState(false);

  // State and Refs for the typing effect
  const [isTyping, setIsTyping] = useState(false); // True while characters are streaming out
  const [typingText, setTypingText] = useState(''); // The text currently being displayed
  const fullResponseText = useRef(''); // Stores the full response text from the API
  const typingIntervalRef = useRef(null); // Reference to the setInterval ID
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom whenever messages change or typing state updates
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, typingText]);

  // Initial greeting message
  useEffect(() => {
    // Cleanup any existing interval on mount/unmount
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    const initialText = "Greetings, inquisitive eater! I'm Alton Brown, and I'm here to demystify the ingredients in your favorite dishes. What culinary conundrum can I help you unravel today? Simply type the dish name, or upload a menu photo!";
    // Set the initial message instantly without typing effect
    setMessages([{ text: initialText, isUser: false, isBot: true, isTypingComplete: true }]);
  }, []);

  // Typing Effect Logic
  useEffect(() => {
    // Only run if we are in the middle of typing and there's more text to show
    if (isTyping && fullResponseText.current.length > typingText.length) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      
      // *** FIX: Increased Typing Speed to 5ms for near-instant effect ***
      typingIntervalRef.current = setInterval(() => {
        setTypingText((prevText) => {
          const nextCharIndex = prevText.length;
          const fullText = fullResponseText.current;

          if (nextCharIndex < fullText.length) {
            // Append the next character
            return prevText + fullText.charAt(nextCharIndex);
          } else {
            // Typing complete
            clearInterval(typingIntervalRef.current);
            setIsTyping(false);

            // 1. Find the placeholder message and replace it with the complete text
            setMessages((prevMessages) => {
                const lastMsgIndex = prevMessages.length - 1;
                // Only replace if the last message is the placeholder
                if (lastMsgIndex >= 0 && prevMessages[lastMsgIndex].isPlaceholder) {
                    const updatedMessages = [...prevMessages];
                    updatedMessages[lastMsgIndex] = {
                        text: fullText, // Use the full text
                        isUser: false,
                        isBot: true,
                        isTypingComplete: true,
                    };
                    return updatedMessages;
                }
                return prevMessages; // Should not happen if flow is correct
            });
            
            // 2. Reset refs for the next response
            fullResponseText.current = '';
            return ''; // Reset typingText state
          }
        });
      }, 5); // SUPER fast typing speed (5ms per character)
    }

    return () => {
      // Cleanup function to clear the interval on unmount or dependency change
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, [isTyping, typingText]);


  // Function to handle sending a text message
  const handleSendTextMessage = async () => {
    if (isTyping || isLoading) return; // Prevent new send while active

    const text = inputMessage.trim();
    if (!text) return;

    // 1. Add user's message to chat immediately
    const newUserMessage = { text: text, isUser: true, isTypingComplete: true };
    setInputMessage(''); // Clear input field

    // 2. Add bot placeholder message (this will be replaced after typing finishes)
    // We don't need 'text' here as the FormattedText component now guards against 'undefined'
    const newBotPlaceholder = { isUser: false, isBot: true, isPlaceholder: true }; 
    setMessages((prevMessages) => [...prevMessages, newUserMessage, newBotPlaceholder]);

    setIsLoading(true); // Show loading indicator (for API fetch)

    try {
      // Make API call
      const response = await fetch('/api/chat', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botResponseText = data.response;

      // 3. API response received, stop showing general loading, start typing
      setIsLoading(false); 
      
      fullResponseText.current = botResponseText;
      setTypingText(''); 
      setIsTyping(true); // Start the typing effect

    } catch (error) {
      console.error("Failed to fetch from LLM:", error);
      setIsLoading(false); // Hide loading indicator

      // Replace the placeholder message with the error message
      setMessages((prevMessages) => {
        const lastMsgIndex = prevMessages.length - 1;
        if (lastMsgIndex >= 0 && prevMessages[lastMsgIndex].isPlaceholder) {
            const updatedMessages = [...prevMessages];
            updatedMessages[lastMsgIndex] = {
                text: "A culinary misstep has occurred! It seems there's a glitch in our data stream, and I couldn&#39;t quite retrieve that information. Let's try that again, shall we?",
                isUser: false,
                isBot: true,
                isError: true,
                isTypingComplete: true,
            };
            return updatedMessages;
        }
        return prevMessages;
      });
    }
  };

  // Function to handle image upload
  const handleImageUpload = () => {
    if (isTyping || isLoading) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Function to handle file selection
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageDataUrl = reader.result;

        // 1. Display the user's image thumbnail immediately
        // 2. Add bot placeholder message
        // We don't need 'text' here as the FormattedText component now guards against 'undefined'
        const newBotPlaceholder = { isUser: false, isBot: true, isPlaceholder: true };
        setMessages((prevMessages) => [
          ...prevMessages,
          { imageUrl: imageDataUrl, isUser: true, isImage: true, isTypingComplete: true },
          newBotPlaceholder
        ]);

        setIsLoading(true);

        try {
          const response = await fetch('/api/image-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl }),
          });

          const data = await response.json();
          setIsLoading(false); 

          if (!response.ok || data.isLlmError) {
            const errorMessage = data.response || "Menu recognition failed. It seems there was a technical glitch in analyzing the image. Please try again!";

            // Replace placeholder with error message
            setMessages((prevMessages) => {
                const lastMsgIndex = prevMessages.length - 1;
                if (lastMsgIndex >= 0 && prevMessages[lastMsgIndex].isPlaceholder) {
                    const updatedMessages = [...prevMessages];
                    updatedMessages[lastMsgIndex] = {
                        text: errorMessage,
                        isUser: false,
                        isBot: true,
                        isError: true,
                        isTypingComplete: true,
                    };
                    return updatedMessages;
                }
                return prevMessages;
            });
          } else {
            // Success: Start typing
            const botResponseText = data.response;
            fullResponseText.current = botResponseText;
            setTypingText('');
            setIsTyping(true);
          }
        } catch (error) {
          console.error("Failed to process image:", error);
          setIsLoading(false);

          // Replace placeholder with generic error message
          setMessages((prevMessages) => {
            const lastMsgIndex = prevMessages.length - 1;
            if (lastMsgIndex >= 0 && prevMessages[lastMsgIndex].isPlaceholder) {
                const updatedMessages = [...prevMessages];
                updatedMessages[lastMsgIndex] = {
                    text: "Menu recognition failed. It seems there was a technical glitch in analyzing the image. Please try again!",
                    isUser: false,
                    isBot: true,
                    isError: true,
                    isTypingComplete: true,
                };
                return updatedMessages;
            }
            return prevMessages;
          });
        }
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  // Function to clear all messages
  const handleClearConversation = () => {
    // Stop any active processes
    if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
    }
    setIsTyping(false);
    setIsLoading(false);
    setTypingText('');
    fullResponseText.current = '';

    const initialText = "Greetings, inquisitive eater! I'm Alton Brown, and I'm here to demystify the ingredients in your favorite dishes. What culinary conundrum can I help you unravel today? Simply type the dish name, or upload a menu photo!";
    setMessages([{ text: initialText, isUser: false, isBot: true, isTypingComplete: true }]);
  };

  return (
    <View style={styles.container}>
      {/* Hidden file input for image selection */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Header Section */}
      <View style={styles.header}>
        {/* Top Left Icon Placeholder */}
        <View style={styles.headerIconLeft}>
          <Text style={styles.placeholderIconText}>&#x2B50;</Text>
        </View>
        {/* Top Middle Title */}
        <Text style={styles.headerTitle}>Allergen Identifier</Text>
        {/* Top Right Clear Conversation Icon */}
        <TouchableOpacity onPress={handleClearConversation} style={styles.headerIconRight}>
          <Text style={styles.refreshIcon}>&#x21BB;</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Interface */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContentContainer}
      >
        {messages.map((msg, index) => {
          // Determine if this is the last message (placeholder) and typing is active
          const isCurrentlyTypingMessage = msg.isPlaceholder && isTyping && index === messages.length - 1;

          return (
            <View
              key={index}
              style={[
                styles.messageBubbleContainer,
                msg.isUser ? styles.userMessageContainer : styles.botMessageContainer,
              ]}
            >
              {!msg.isUser && (
                <View style={[styles.avatarContainer, styles.botAvatarBackground]}>
                  <ChefHatIcon size={24} />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.isUser ? styles.userBubbleSpecific : styles.botBubbleSpecific,
                ]}
              >
                {/* Render Image if available, otherwise render FormattedText */}
                {msg.isImage && msg.imageUrl ? (
                  <Image
                    source={{ uri: msg.imageUrl }}
                    style={styles.imageThumbnail}
                    accessibilityLabel="Uploaded menu image thumbnail"
                    alt="Uploaded menu image thumbnail"
                    onError={(e) => console.log('Thumbnail failed to load:', e.nativeEvent.error)}
                  />
                ) : (
                  // CORE FIX: If it's the active typing message, use typingText state.
                  // Otherwise, use the message's stored text (which is safe due to FormattedText guard).
                  <FormattedText
                    text={isCurrentlyTypingMessage ? typingText : msg.text}
                    style={styles.messageText}
                    boldStyle={styles.boldText}
                    errorStyle={msg.isError ? styles.errorMessageText : null}
                  />
                )}
              </View>
              {msg.isUser && (
                <View style={[styles.avatarContainer, styles.userAvatarBackground]}>
                  <PersonIcon size={24} />
                </View>
              )}
            </View>
          )
        })}

        {/* Loading Indicator (Only shown while waiting for API response, not during typing) */}
        {isLoading && (
          <View style={[styles.messageBubbleContainer, styles.botMessageContainer]}>
            <View style={[styles.avatarContainer, styles.botAvatarBackground]}>
              <ChefHatIcon size={24} />
            </View>
            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>Calibrating culinary calculations... Stand by!</Text>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Bottom Input Tray */}
      <View style={styles.inputTray}>
        {/* Plus Button for Image */}
        <TouchableOpacity onPress={handleImageUpload} style={styles.plusButton} disabled={isLoading || isTyping}>
          <Text style={styles.plusButtonText}>+</Text>
        </TouchableOpacity>

        {/* Text Input Box */}
        <TextInput
          style={styles.textInput}
          placeholder="Enter a dish name"
          placeholderTextColor="#A0A0A0" // Light placeholder text for dark theme
          value={inputMessage}
          onChangeText={setInputMessage}
          onSubmitEditing={handleSendTextMessage}
          returnKeyType="send"
          editable={!isLoading && !isTyping}
        />

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSendTextMessage}
          style={styles.sendButton}
          disabled={isLoading || isTyping || inputMessage.trim().length === 0}
        >
          <Text style={styles.sendButtonText}>&#x27A4;</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Stylesheet for the components (DARK THEME)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#121212', // Very Dark Background
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Platform.select({ web: { small: 10, medium: 20, large: 30 }, default: 10 }),
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    height: 70,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C', // Dark border
    backgroundColor: '#1F1F1F', // Dark header background
    borderRadius: 15,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  headerIconLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700', // Gold-like background for placeholder
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIconText: {
    fontSize: 20,
    color: '#121212', // Dark text on bright background
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E0E0E0', // Light text
    fontFamily: 'Inter, sans-serif',
  },
  headerIconRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333', // Dark gray background
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 22,
    color: '#E0E0E0', // Light icon color
  },
  chatArea: {
    flex: 1,
  },
  chatContentContainer: {
    paddingVertical: 10,
    paddingBottom: 20,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 5,
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botAvatarBackground: {
    backgroundColor: '#FFD700', // Gold (Bright)
  },
  userAvatarBackground: {
    backgroundColor: '#38B2AC', // Teal (Bright)
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Inter, sans-serif',
    color: '#F0F0F0', // Light text for dark theme
  },
  boldText: {
    fontWeight: 'bold',
    color: '#FFD700', // Gold for bold text
  },
  errorMessageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#FF8A80', // Lighter red for dark theme
    fontFamily: 'Inter, sans-serif',
  },
  imageThumbnail: {
    width: 150,
    height: 100,
    borderRadius: 10,
    resizeMode: 'cover',
    marginVertical: 5,
  },
  userBubbleSpecific: {
    backgroundColor: '#004D40', // Dark Teal/Green
    borderBottomRightRadius: 5,
  },
  botBubbleSpecific: {
    backgroundColor: '#2A2A2A', // Slightly lighter dark grey
    borderBottomLeftRadius: 5,
  },
  inputTray: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    height: 70,
    paddingHorizontal: 15,
    backgroundColor: '#1F1F1F', // Dark input tray background
    borderRadius: 25,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  plusButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
  },
  plusButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 28,
    fontWeight: 'bold',
  },
  textInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#2C2C2C', // Dark input field background
    borderRadius: 22.5,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#F0F0F0', // Light input text
    fontFamily: 'Inter, sans-serif',
    borderWidth: 1,
    borderColor: '#3A3A3A', // Subtle border
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 22,
    fontWeight: 'bold',
  },
});

export default App;
