import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainGallery } from './components/MainGallery';
import { Message, GeneratedImage, Sender, ImageAttachment } from './types';
import { generateOrEditImage, fileToBase64 } from './services/geminiService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Persistent reference image state
  const [activeReferenceImage, setActiveReferenceImage] = useState<ImageAttachment | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const currentInput = input;
    const currentFile = selectedFile;
    
    // Clear inputs immediately
    setInput('');
    setSelectedFile(null);
    setIsLoading(true);

    let attachmentForRequest: ImageAttachment | undefined = undefined;
    let messageAttachments: ImageAttachment[] = [];
    
    // 1. Process file if exists (this becomes the new active reference)
    if (currentFile) {
      try {
        const base64 = await fileToBase64(currentFile);
        const newAttachment = {
          mimeType: currentFile.type,
          data: base64
        };
        messageAttachments.push(newAttachment);
        attachmentForRequest = newAttachment;
        
        // Update the persistent reference
        setActiveReferenceImage(newAttachment);
      } catch (e) {
        console.error("Failed to process file", e);
        setIsLoading(false);
        return;
      }
    } else {
      // 2. If no new file, check if we have an active reference
      if (activeReferenceImage) {
        attachmentForRequest = activeReferenceImage;
        // We do NOT add it to messageAttachments to avoid cluttering the chat history with duplicates
      }
    }

    // 3. Add User Message
    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      sender: Sender.User,
      text: currentInput,
      attachments: messageAttachments, // Only show what was explicitly uploaded this turn
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);

    // 4. Call API
    try {
      // Gemini 2.5 Flash Image call
      const imageBytesArray = await generateOrEditImage(currentInput, attachmentForRequest);

      // 5. Create AI Response
      const generatedImages: GeneratedImage[] = imageBytesArray.map((bytes, idx) => ({
        id: `${Date.now()}-${idx}`,
        data: bytes,
        prompt: currentInput || (attachmentForRequest ? "Variation of image" : "Generated Image"),
        timestamp: Date.now()
      }));

      let aiText = "";
      if (attachmentForRequest && !currentFile) {
        aiText = `I've updated the reference image based on: "${currentInput}"`;
      } else if (attachmentForRequest && currentFile) {
         aiText = currentInput 
            ? `Here is a variation based on your new image: "${currentInput}"`
            : `Here is a variation of your uploaded image.`;
      } else {
        aiText = `I've generated this for you based on: "${currentInput}"`;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.AI,
        text: aiText,
        generatedImages: generatedImages,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
      setGallery(prev => [...prev, ...generatedImages]);

    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.AI,
        text: `I encountered an error: ${error.message || "Unknown error occurred."}. Please try again.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedFile, isLoading, activeReferenceImage]);

  const handleReuseImage = useCallback((img: GeneratedImage) => {
    fetch(`data:image/png;base64,${img.data}`)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "edited-image.png", { type: "image/png" });
        setSelectedFile(file);
        // We don't pre-fill text, letting user decide the edit
        setInput("");
      });
  }, []);

  const handleClearReference = useCallback(() => {
    setActiveReferenceImage(null);
  }, []);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
        {/* Left Sidebar - Chat */}
        <Sidebar 
            messages={messages}
            input={input}
            setInput={setInput}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            onSend={handleSend}
            isLoading={isLoading}
            onReuseImage={handleReuseImage}
            activeReferenceImage={activeReferenceImage}
            onClearReference={handleClearReference}
        />

        {/* Right Area - Gallery */}
        <MainGallery 
            images={gallery}
            onReuseImage={handleReuseImage}
        />
    </div>
  );
};

export default App;