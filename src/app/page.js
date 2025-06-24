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
  Platform // Used for platform-specific styling if needed
} from 'react-native-web';

// Main App Component
const App = () => {
  // State to hold chat messages
  const [messages, setMessages] = useState([]);
  // State for the text input field
  const [inputMessage, setInputMessage] = useState('');
  // Ref for scrolling the chat view to the bottom
  const scrollViewRef = useRef();
  // State to manage loading indicator during LLM call
  const [isLoading, setIsLoading] = useState(false);
  // State to manage visibility of "not supported" message for image upload
  const [showImageNotSupported, setShowImageNotSupported] = useState(false);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Initial greeting message from Woody the chatbot
  useEffect(() => {
    setMessages([
      {
        text: "Howdy partner! What delicious dish are you curious about today? You can type its name or even send me a photo of a menu!",
        isUser: false,
        isBot: true,
      },
    ]);
  }, []); // Run once on component mount

  // Function to handle sending a text message (dish name)
  const handleSendTextMessage = async () => {
    const text = inputMessage.trim();
    if (!text) return; // Don't send empty messages

    // Add user's message to chat immediately
    const newUserMessage = { text: text, isUser: true };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInputMessage(''); // Clear input field

    setIsLoading(true); // Show loading indicator

    try {
      // Make API call to your Next.js backend
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dishName: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Add bot's response to chat
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: data.response, isUser: false, isBot: true },
      ]);
    } catch (error) {
      console.error("Failed to fetch from LLM:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        // Fixed: Escaped apostrophe in "Couldn't"
        { text: "Whoops! Looks like my lasso got tangled. Couldn&#39;t fetch that info right now. Try again, partner!", isUser: false, isBot: true, isError: true },
      ]);
    } finally {
      setIsLoading(false); // Hide loading indicator
    }
  };

  // Function to handle image upload (simulated for V1)
  const handleImageUpload = () => {
    // In a real app, this would trigger file input:
    // const input = document.createElement('input');
    // input.type = 'file';
    // input.accept = 'image/*';
    // input.onchange = (e) => {
    //   const file = e.target.files[0];
    //   if (file) {
    //     const reader = new FileReader();
    //     reader.onloadend = () => {
    //       // Simulate showing thumbnail
    //       const thumbnailUrl = reader.result;
    //       setMessages((prevMessages) => [
    //         ...prevMessages,
    //         { imageUrl: thumbnailUrl, isUser: true, isImage: true },
    //       ]);
    //       setShowImageNotSupported(true); // Show the specific message
    //       // After a delay, hide the message
    //       setTimeout(() => setShowImageNotSupported(false), 5000);
    //     };
    //     reader.readAsDataURL(file);
    //   }
    // };
    // input.click();

    // For V1, we simulate an image being selected and show a placeholder
    const dummyImageUrl = "https://placehold.co/100x75/007bff/ffffff?text=Menu";
    setMessages((prevMessages) => [
      ...prevMessages,
      { imageUrl: dummyImageUrl, isUser: true, isImage: true },
    ]);
    setShowImageNotSupported(true); // Show the specific message
    setTimeout(() => setShowImageNotSupported(false), 5000); // Hide after 5 seconds
  };

  // Function to clear all messages
  const handleClearConversation = () => {
    setMessages([
      {
        text: "Howdy partner! What delicious dish are you curious about today? You can type its name or even send me a photo of a menu!",
        isUser: false,
        isBot: true,
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        {/* Top Left Icon Placeholder */}
        <View style={styles.headerIconLeft}>
          {/* You can replace this with your actual icon later */}
          <Text style={styles.placeholderIconText}>&#x2B50;</Text>
        </View>
        {/* Top Middle Title */}
        <Text style={styles.headerTitle}>Allergen Identifier</Text>
        {/* Top Right Clear Conversation Icon */}
        <TouchableOpacity onPress={handleClearConversation} style={styles.headerIconRight}>
          {/* Refresh icon Unicode character */}
          <Text style={styles.refreshIcon}>&#x21BB;</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Interface */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContentContainer}
      >
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.messageBubbleContainer,
              msg.isUser ? styles.userMessageContainer : styles.botMessageContainer,
            ]}
          >
            {!msg.isUser && (
              <View style={styles.avatarContainer}>
                {/* Chatbot logo placeholder (Woody) */}
                <Image
                  source={{ uri: "https://placehold.co/40x40/FFD700/000000?text=🤠" }} // Placeholder for Woody's icon
                  style={styles.avatar}
                  accessibilityLabel="Chatbot avatar" // Added alt prop
                  onError={(e) => console.log('Image failed to load:', e.nativeEvent.error)}
                />
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                // Apply specific bubble styles based on sender
                msg.isUser ? styles.userBubbleSpecific : styles.botBubbleSpecific,
              ]}
            >
              {msg.isImage && msg.imageUrl ? (
                <Image
                  source={{ uri: msg.imageUrl }}
                  style={styles.imageThumbnail}
                  accessibilityLabel="Uploaded menu image thumbnail" // Added alt prop
                  onError={(e) => console.log('Thumbnail failed to load:', e.nativeEvent.error)}
                />
              ) : (
                <Text style={msg.isError ? styles.errorMessageText : styles.messageText}>
                  {msg.text}
                </Text>
              )}
            </View>
            {msg.isUser && (
              <View style={styles.avatarContainer}>
                {/* User icon placeholder */}
                <Image
                  source={{ uri: "https://placehold.co/40x40/87CEEB/000000?text=👤" }} // Placeholder for user icon
                  style={styles.avatar}
                  accessibilityLabel="User avatar" // Added alt prop
                  onError={(e) => console.log('Image failed to load:', e.nativeEvent.error)}
                />
              </View>
            )}
          </View>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={[styles.messageBubbleContainer, styles.botMessageContainer]}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: "https://placehold.co/40x40/FFD700/000000?text=🤠" }}
                style={styles.avatar}
                accessibilityLabel="Chatbot icon indicating loading" // Added alt prop
              />
            </View>
            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>Thinking... hold your horses, partner!</Text>
            </View>
          </View>
        )}

        {/* Static message for image upload not supported */}
        {showImageNotSupported && (
          <View style={[styles.messageBubbleContainer, styles.botMessageContainer]}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: "https://placehold.co/40x40/FFD700/000000?text=🤠" }}
                style={styles.avatar}
                accessibilityLabel="Chatbot icon" // Added alt prop
              />
            </View>
            <View style={styles.messageBubble}>
              {/* Fixed: Escaped apostrophe in "isn't" */}
              <Text style={styles.messageText}>Hold on there, partner! Menu upload using a photo isn&#39;t supported just yet, but stay tuned!</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Input Tray */}
      <View style={styles.inputTray}>
        {/* Plus Button for Image */}
        <TouchableOpacity onPress={handleImageUpload} style={styles.plusButton}>
          <Text style={styles.plusButtonText}>+</Text>
        </TouchableOpacity>

        {/* Text Input Box */}
        <TextInput
          style={styles.textInput}
          placeholder="Enter a dish name"
          placeholderTextColor="#999"
          value={inputMessage}
          onChangeText={setInputMessage}
          onSubmitEditing={handleSendTextMessage} // Allows sending with Enter key
          returnKeyType="send"
        />

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSendTextMessage}
          style={styles.sendButton}
          disabled={isLoading} // Disable send button while loading
        >
          <Text style={styles.sendButtonText}>&#x27A4;</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Stylesheet for the components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8', // Light background
    // Responsive padding for different screen sizes
    paddingHorizontal: Platform.select({
      web: {
        small: 10, // Mobile
        medium: 20, // Tablet
        large: 30, // Desktop
      },
      default: 10, // Fallback for other platforms
    }),
    paddingTop: 10,
    paddingBottom: 20, // Enough space for input tray
    maxWidth: 800, // Max width for desktop
    alignSelf: 'center', // Center the app on larger screens
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFFFFF', // White header background
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#333',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Inter, sans-serif', // Using Inter font if available
  },
  headerIconRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0', // Light gray background
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 22,
    color: '#555',
  },
  chatArea: {
    flex: 1,
    paddingVertical: 10,
  },
  chatContentContainer: {
    paddingBottom: 20, // Give some padding at the bottom of the scroll view
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align avatars to bottom of bubble
    marginVertical: 5,
  },
  userMessageContainer: {
    alignSelf: 'flex-end', // Align user messages to the right
    marginLeft: 'auto', // Push to the right
  },
  botMessageContainer: {
    alignSelf: 'flex-start', // Align bot messages to the left
    marginRight: 'auto', // Push to the left
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden', // Ensure avatar is circular
    marginHorizontal: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20, // Rounded corners for chat bubbles
    maxWidth: '75%', // Limit bubble width
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22, // Better readability
    fontFamily: 'Inter, sans-serif',
  },
  errorMessageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#D32F2F', // Red for errors
    fontFamily: 'Inter, sans-serif',
  },
  imageThumbnail: {
    width: 150, // Fixed width for thumbnail
    height: 100, // Fixed height for thumbnail
    borderRadius: 10,
    resizeMode: 'cover',
    marginVertical: 5,
  },
  // NEW STYLES: Apply background color and specific corner radius conditionally
  userBubbleSpecific: {
    backgroundColor: '#DCF8C6', // Light green for user messages
    borderBottomRightRadius: 5, // Pointed corner for user
  },
  botBubbleSpecific: {
    backgroundColor: '#E5E5EA', // Light gray for bot messages
    borderBottomLeftRadius: 5, // Pointed corner for bot
  },
  inputTray: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF', // White background for input tray
    borderRadius: 25, // More rounded tray
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  plusButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#007AFF', // Blue color for plus button
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  plusButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 28, // Adjust line height for vertical centering
    fontWeight: 'bold',
  },
  textInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#F0F0F0', // Light gray input background
    borderRadius: 22.5,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Inter, sans-serif',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#00C853', // Green color for send button
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 22, // Adjust line height for vertical centering
    fontWeight: 'bold',
  },
});

export default App;
