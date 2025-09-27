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
  Platform,
} from 'react-native-web';

// --- Configuration ---
const ALLERGEN_OPTIONS = [
    'Peanuts', 'Pistachios', 'Tree Nuts', 'Eggs', 'Shellfish',
    'Wheat', 'Cashews', 'Almonds', 'Milk', 'Fish',
    'Soy', 'Gluten'
];
const ALLERGEN_OPTIONS_FLAT = ALLERGEN_OPTIONS.map(a => a.toLowerCase());


// Helper component to format text with bolding and handle newlines
const FormattedText = ({ text, style, boldStyle, errorStyle }) => {
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

// SVG Icon for Chatbot (Chef Hat)
const ChefHatIcon = ({ size = 24 }) => (
  <Text style={{ fontSize: size, lineHeight: size, color: '#121212' }}>👨‍🍳</Text>
);

// SVG Icon for User (Person Outline)
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
      stroke="#121212"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 14C7.79186 14 4.38075 16.5888 4.02097 20.6582C3.96866 21.229 4.41738 22 5.00040 22H19.0004C19.5834 22 20.0321 21.229 19.9798 20.6582C19.62 16.5888 16.2089 14 12 14Z"
      stroke="#121212"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// SVG Icon for the Menu Button (Hamburger)
const MenuIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6H20" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 12H20" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 18H20" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// --- Allergen Selection Modal Component ---
const AllergenSelectionModal = ({ 
    initialSelection, 
    onClose, 
    onSubmit, 
    isInitialSetup = false 
}) => {
    // Local state to manage temporary selections
    const [selectedAllergens, setSelectedAllergens] = useState(new Set(initialSelection));

    const toggleAllergen = (allergen) => {
        setSelectedAllergens(prev => {
            const newSet = new Set(prev);
            const key = allergen.toLowerCase();
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        const allKeys = new Set(ALLERGEN_OPTIONS_FLAT);
        
        // If all are currently selected, deselect all. Otherwise, select all.
        if (selectedAllergens.size === ALLERGEN_OPTIONS_FLAT.length) {
            setSelectedAllergens(new Set());
        } else {
            setSelectedAllergens(allKeys);
        }
    };

    const isAllSelected = selectedAllergens.size === ALLERGEN_OPTIONS_FLAT.length;
    
    // Convert Set back to Array for submission
    const handleSubmit = () => {
        onSubmit(Array.from(selectedAllergens));
    };

    return (
        <View style={modalStyles.backdrop}>
            <View style={modalStyles.modalCard}>
                
                {/* Header */}
                <View style={modalStyles.header}>
                    <Text style={modalStyles.title}>Select Your Allergens</Text>
                    {!isInitialSetup && (
                        <TouchableOpacity onPress={onClose}>
                            <Text style={modalStyles.closeButton}>&times; Close</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Allergen Grid */}
                <ScrollView style={modalStyles.contentArea} contentContainerStyle={modalStyles.gridContainer}>
                    
                    {ALLERGEN_OPTIONS.map((allergen) => {
                        const key = allergen.toLowerCase();
                        const isChecked = selectedAllergens.has(key);

                        return (
                            <TouchableOpacity
                                key={allergen}
                                style={modalStyles.allergenItem}
                                onPress={() => toggleAllergen(allergen)}
                            >
                                <View style={[
                                    modalStyles.checkbox, 
                                    isChecked && modalStyles.checkboxChecked
                                ]}>
                                    {isChecked && <Text style={modalStyles.checkMark}>✓</Text>}
                                </View>
                                <Text style={modalStyles.allergenText}>{allergen}</Text>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Select All Option */}
                    <TouchableOpacity 
                        style={[modalStyles.allergenItem, modalStyles.selectAllItem]}
                        onPress={handleSelectAll}
                    >
                         <View style={[
                            modalStyles.checkbox, 
                            isAllSelected && modalStyles.checkboxChecked
                        ]}>
                            {isAllSelected && <Text style={modalStyles.checkMark}>✓</Text>}
                        </View>
                        <Text style={modalStyles.allergenTextBold}>Select All</Text>
                    </TouchableOpacity>

                </ScrollView>

                {/* Footer / Submit */}
                <View style={modalStyles.footer}>
                    <Text style={modalStyles.noteText}>Note that you can customize these later via the side menu.</Text>
                    <TouchableOpacity style={modalStyles.submitButton} onPress={handleSubmit}>
                        <Text style={modalStyles.submitButtonText}>
                            {isInitialSetup ? 'Start Chatting' : 'Save Preferences'}
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </View>
    );
};

// --- Main App Component ---
const App = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const scrollViewRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  
  // --- New State for Menu and Allergens ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAllergenModalOpen, setIsAllergenModalOpen] = useState(false);
  // Stores selected allergens as an array of strings (e.g., ['peanuts', 'milk'])
  const [selectedAllergens, setSelectedAllergens] = useState([]); 
  // Tracks if the user has completed the initial selection flow
  const [hasSelectedInitialAllergens, setHasSelectedInitialAllergens] = useState(false); 
  
  // State/Refs for typing effect (re-introduced for smooth UI)
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const fullResponseText = useRef(''); 
  const typingIntervalRef = useRef(null); 
  const fileInputRef = useRef(null);


  // Initial Greeting and Initial Modal Check
  useEffect(() => {
    // Initial Greeting setup
    const initialText = "Greetings, inquisitive eater! I'm Alton Brown, and I'm here to demystify the ingredients in your favorite dishes. What culinary conundrum can I help you unravel today? Simply type the dish name, or upload a menu photo!";
    setMessages([{ text: initialText, isUser: false, isBot: true, isTypingComplete: true }]);

    // Check if initial selection is done (for now, default to true for development)
    // In a real app, this would check localStorage/Firestore.
    // For now, let's open the modal on first load.
    if (!hasSelectedInitialAllergens) {
        setIsAllergenModalOpen(true);
    }
  }, []); // Run once on component mount

  // Auto-scroll to bottom whenever messages change or typing state updates
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, typingText]);


  // Typing Effect Logic (Re-implemented for smooth, modern feel)
  useEffect(() => {
    if (isTyping && fullResponseText.current.length > typingText.length) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      
      typingIntervalRef.current = setInterval(() => {
        setTypingText((prevText) => {
          const nextCharIndex = prevText.length;
          const fullText = fullResponseText.current;

          if (nextCharIndex < fullText.length) {
            return prevText + fullText.charAt(nextCharIndex);
          } else {
            clearInterval(typingIntervalRef.current);
            setIsTyping(false);

            setMessages((prevMessages) => {
                const lastMsgIndex = prevMessages.length - 1;
                if (lastMsgIndex >= 0 && prevMessages[lastMsgIndex].isPlaceholder) {
                    const updatedMessages = [...prevMessages];
                    updatedMessages[lastMsgIndex] = {
                        text: fullText,
                        isUser: false,
                        isBot: true,
                        isTypingComplete: true,
                    };
                    return updatedMessages;
                }
                return prevMessages;
            });
            
            fullResponseText.current = '';
            return '';
          }
        });
      }, 5); // Fast typing speed (5ms per character)
    }

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, [isTyping, typingText]);


  // Function to handle sending a text message
  const handleSendTextMessage = async () => {
    // Block sending if a modal/menu is open or if busy
    if (isTyping || isLoading || isMenuOpen || isAllergenModalOpen) return; 

    const text = inputMessage.trim();
    if (!text) return;

    // 1. Add user's message and bot placeholder
    const newUserMessage = { text: text, isUser: true, isTypingComplete: true };
    const newBotPlaceholder = { isUser: false, isBot: true, isPlaceholder: true }; 
    setMessages((prevMessages) => [...prevMessages, newUserMessage, newBotPlaceholder]);
    setInputMessage(''); 

    setIsLoading(true);

    try {
      // --- NEW: CALLING API WITH ALLERGENS ---
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            dishName: text, 
            selectedAllergens: selectedAllergens 
        }), // Send dish name and current allergen list
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
          throw new Error(data.message || "Failed to get a response from the kitchen.");
      }

      const botResponseText = data.response; // Response from the LLM

      // 3. Start typing effect
      setIsLoading(false); 
      fullResponseText.current = botResponseText;
      setTypingText(''); 
      setIsTyping(true);

    } catch (error) {
      console.error("Failed to fetch from LLM:", error);
      setIsLoading(false);

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

  // Image upload functions (omitted for brevity, assume they work as before)
  const handleImageUpload = () => {
    if (isTyping || isLoading || isMenuOpen || isAllergenModalOpen) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    if (isTyping || isLoading || isMenuOpen || isAllergenModalOpen) return;
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageDataUrl = reader.result;

        const newBotPlaceholder = { isUser: false, isBot: true, isPlaceholder: true };
        setMessages((prevMessages) => [
          ...prevMessages,
          { imageUrl: imageDataUrl, isUser: true, isImage: true, isTypingComplete: true },
          newBotPlaceholder
        ]);

        setIsLoading(true);

        try {
          // Mock API call delay
          await new Promise(resolve => setTimeout(resolve, 800)); 
          
          // --- NEW MOCK LOGIC adhering to user request for image-based chat filtering ---
          const mockDishList = [
              'Chicken Pot Pie', 
              'Vegetable Lasagna', 
              'Chocolate Cake'
          ];
          let botResponseText = `**Mock Menu Analysis**: I've scanned the document and identified a few dishes:\n\n`;
          
          // Reference the selected allergens for context in the mock response
          const allergenList = selectedAllergens.length > 0 ? 
              selectedAllergens.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ') :
              'None specified.';
          
          // Apply the user's rule: "for each dish (multiple dishes), it will say 'None of your selected allergens found'"
          mockDishList.forEach(dish => {
              botResponseText += `**${dish}**:\n• **None of your selected allergens found**.\n\n`;
          });
          
          botResponseText += `This response respects your current allergen profile (**${allergenList}**). **Always confirm ingredients with the restaurant staff.**`;

          // 3. Start typing effect
          setIsLoading(false); 
          fullResponseText.current = botResponseText;
          setTypingText('');
          setIsTyping(true);

        } catch (error) {
          console.error("Failed to process image:", error);
          setIsLoading(false);
          // Error handling logic similar to text message...
        }
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };


  // Function to handle Allergen Modal submission
  const handleAllergenSubmit = (newAllergens) => {
    setSelectedAllergens(newAllergens);
    setIsAllergenModalOpen(false);
    
    // Check if it's the first time setting preferences
    if (!hasSelectedInitialAllergens) {
        setHasSelectedInitialAllergens(true);
    }
    
    setIsMenuOpen(false); // Close side menu when modal is closed/submitted
  };


  // Function to clear all messages
  const handleClearConversation = () => {
    if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
    }
    setIsTyping(false);
    setIsLoading(false);
    setIsMenuOpen(false);
    setIsAllergenModalOpen(false); // Close any open modal
    setTypingText('');
    fullResponseText.current = '';

    const initialText = "Greetings, inquisitive eater! I'm Alton Brown, and I'm here to demystify the ingredients in your favorite dishes. What culinary conundrum can I help you unravel today? Simply type the dish name, or upload a menu photo!";
    setMessages([{ text: initialText, isUser: false, isBot: true, isTypingComplete: true }]);
  };

  // Function for the new Menu button (toggle)
  const handleMenuPress = () => {
    // Only allow opening if not busy and no modal is open
    if (!isLoading && !isTyping && !isAllergenModalOpen) {
        setIsMenuOpen(prev => !prev);
    }
  };

  // Function for menu item presses (placeholder functionality)
  const handleMenuItemPress = (item) => {
    if (item === "Continue Chatting") {
        setIsMenuOpen(false);
    } else if (item === "Select Allergens") {
        setIsAllergenModalOpen(true); // Open the modal with current selections
    }
    // Other items will switch context later.
  };

  // Check if any critical UI element is open/active to disable inputs
  const isOverlayActive = isMenuOpen || isAllergenModalOpen;
  const isInputDisabled = isLoading || isTyping || isOverlayActive;

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

      {/* Main Chat Content */}
      <View style={{ flex: 1 }}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.headerIconLeft} disabled={isInputDisabled}>
            <MenuIcon size={24} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Allergen Identifier</Text>
          
          <TouchableOpacity onPress={handleClearConversation} style={styles.headerIconRight} disabled={isInputDisabled}>
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
                  {msg.isImage && msg.imageUrl ? (
                    <Image
                      source={{ uri: msg.imageUrl }}
                      style={styles.imageThumbnail}
                      accessibilityLabel="Uploaded menu image thumbnail"
                      alt="Uploaded menu image thumbnail"
                      onError={(e) => console.log('Thumbnail failed to load:', e.nativeEvent.error)}
                    />
                  ) : (
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

          {/* Loading Indicator (for API fetch) */}
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
          <TouchableOpacity onPress={handleImageUpload} style={styles.plusButton} disabled={isInputDisabled}>
            <Text style={styles.plusButtonText}>+</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Enter a dish name"
            placeholderTextColor="#A0A0A0"
            value={inputMessage}
            onChangeText={setInputMessage}
            onSubmitEditing={handleSendTextMessage}
            returnKeyType="send"
            editable={!isInputDisabled}
          />

          <TouchableOpacity
            onPress={handleSendTextMessage}
            style={styles.sendButton}
            disabled={isInputDisabled || inputMessage.trim().length === 0}
          >
            <Text style={styles.sendButtonText}>&#x27A4;</Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* --- Side Menu Components (Overlays) --- */}

      {/* Side Menu Backdrop */}
      {isMenuOpen && (
        <TouchableOpacity 
          style={styles.backdrop} 
          onPress={handleMenuPress}
          activeOpacity={1}
        />
      )}

      {/* Side Menu Drawer */}
      <View style={[
        styles.sideMenu,
        isMenuOpen ? styles.sideMenuOpen : styles.sideMenuClosed,
      ]}>
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>Navigation</Text>
          <TouchableOpacity onPress={handleMenuPress} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>&times;</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => handleMenuItemPress("Continue Chatting")}
        >
          <Text style={styles.menuItemText}>Continue Chatting</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => handleMenuItemPress("Select Allergens")}
        >
          <Text style={styles.menuItemText}>Select Allergens</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => handleMenuItemPress("Food Alternative Recommender")}
        >
          <Text style={styles.menuItemText}>Food Alternative Recommender</Text>
        </TouchableOpacity>

      </View>

      {/* --- Allergen Selection Modal --- */}
      {isAllergenModalOpen && (
        <AllergenSelectionModal
            initialSelection={selectedAllergens}
            onClose={() => setIsAllergenModalOpen(false)}
            onSubmit={handleAllergenSubmit}
            isInitialSetup={!hasSelectedInitialAllergens}
        />
      )}
      
    </View>
  );
};

// --- Modal Specific Styles (Omitted for brevity, kept from prior file) ---
const modalStyles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker backdrop to emphasize modal
        zIndex: 200, // Highest zIndex
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: '#1F1F1F', // Dark card background
        borderRadius: 20,
        overflow: 'hidden',
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.9,
        shadowRadius: 20,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2C',
        backgroundColor: '#333333',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFD700', // Gold accent
        fontFamily: 'Inter, sans-serif',
    },
    closeButton: {
        fontSize: 18,
        color: '#E0E0E0',
        padding: 5,
    },
    contentArea: {
        padding: 20,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    allergenItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%', // Two columns, slightly less than 50% for spacing
        marginVertical: 10,
    },
    selectAllItem: {
        width: '100%', // Full width for Select All
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2C',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#00C853', // Green check
        borderColor: '#00C853',
    },
    checkMark: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    allergenText: {
        fontSize: 18,
        color: '#E0E0E0',
        fontFamily: 'Inter, sans-serif',
    },
    allergenTextBold: {
        fontSize: 18,
        color: '#FFD700', // Gold for emphasis
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2C',
    },
    noteText: {
        fontSize: 14,
        color: '#A0A0A0', // Subtle gray
        textAlign: 'center',
        marginBottom: 15,
        fontStyle: 'italic',
    },
    submitButton: {
        backgroundColor: '#00C853', // Green primary action
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 6,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
    },
});

// --- Main App Styles (Omitted for brevity, kept from prior file) ---
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
    borderBottomColor: '#2C2C2C',
    backgroundColor: '#1F1F1F',
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
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E0E0E0',
    fontFamily: 'Inter, sans-serif',
  },
  headerIconRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 22,
    color: '#E0E0E0',
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
    backgroundColor: '#FFD700',
  },
  userAvatarBackground: {
    backgroundColor: '#38B2AC',
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
    color: '#F0F0F0',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  errorMessageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#FF8A80',
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
    backgroundColor: '#004D40',
    borderBottomRightRadius: 5,
  },
  botBubbleSpecific: {
    backgroundColor: '#2A2A2A',
    borderBottomLeftRadius: 5,
  },
  inputTray: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    height: 70,
    paddingHorizontal: 15,
    backgroundColor: '#1F1F1F',
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
    backgroundColor: '#2C2C2C',
    borderRadius: 22.5,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#F0F0F0',
    fontFamily: 'Inter, sans-serif',
    borderWidth: 1,
    borderColor: '#3A3A3A',
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

  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 100,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '70%',
    maxWidth: 300,
    backgroundColor: '#1F1F1F',
    zIndex: 101,
    paddingTop: 10,
    transitionProperty: 'transform',
    transitionDuration: '0.3s',
    transitionTimingFunction: 'ease-in-out',
    borderRightWidth: 1,
    borderRightColor: '#3A3A3A',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 15,
  },
  sideMenuOpen: {
    transform: [{ translateX: 0 }],
  },
  sideMenuClosed: {
    transform: [{ translateX: -300 }],
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    height: 70,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    backgroundColor: '#333333',
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  closeButton: {
    paddingHorizontal: 10,
  },
  closeButtonText: {
    fontSize: 30,
    color: '#E0E0E0',
    lineHeight: 30,
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  menuItemText: {
    fontSize: 18,
    color: '#E0E0E0',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
  },
});

export default App;
