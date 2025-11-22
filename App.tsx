
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { SessionSidebar } from './components/SessionSidebar';
import { MainGallery } from './components/MainGallery';
import { Message, GeneratedImage, Sender, ImageAttachment, Session, AspectRatio } from './types';
import { generateOrEditImage, fileToBase64 } from './services/geminiService';

const createNewSession = (): Session => ({
  id: Date.now().toString(),
  title: '',
  messages: [],
  gallery: [],
  activeReferenceImage: null,
  lastModified: Date.now(),
  aspectRatio: '3:4',
  numberOfImages: 1,
});

const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aidesigner_theme') as 'light' | 'dark' || 'dark';
    }
    return 'dark';
  });

  // Apply Theme Class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('aidesigner_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Initialize sessions from localStorage or default to one empty session
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const saved = localStorage.getItem('aidesigner_sessions');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse sessions", e);
    }
    return [createNewSession()];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('aidesigner_current_id');
      return savedId || '';
    } catch (e) {
      return '';
    }
  });

  // Ensure valid current session
  useEffect(() => {
    if (!sessions.find(s => s.id === currentSessionId)) {
      if (sessions.length > 0) {
        setCurrentSessionId(sessions[0].id);
      } else {
        const newS = createNewSession();
        setSessions([newS]);
        setCurrentSessionId(newS.id);
      }
    }
  }, [sessions, currentSessionId]);

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('aidesigner_sessions', JSON.stringify(sessions));
      localStorage.setItem('aidesigner_current_id', currentSessionId);
    } catch (e) {
      console.warn("LocalStorage limit reached.", e);
    }
  }, [sessions, currentSessionId]);

  const activeSession = useMemo(() => 
    sessions.find(s => s.id === currentSessionId) || sessions[0], 
  [sessions, currentSessionId]);

  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateCurrentSession = useCallback((updater: (session: Session) => Session) => {
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...updater(s), lastModified: Date.now() } : s
    ));
  }, [currentSessionId]);

  const handleCreateSession = useCallback(() => {
    const newSession = createNewSession();
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setInput('');
    setSelectedFile(null);
  }, []);

  const handleDeleteSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) return [createNewSession()];
      return filtered;
    });
  }, []);

  const handleAspectRatioChange = useCallback((ratio: AspectRatio) => {
    updateCurrentSession(s => ({ ...s, aspectRatio: ratio }));
  }, [updateCurrentSession]);

  const handleNumberOfImagesChange = useCallback((num: number) => {
    updateCurrentSession(s => ({ ...s, numberOfImages: num }));
  }, [updateCurrentSession]);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const currentInput = input;
    const currentFile = selectedFile;
    const currentAspectRatio = activeSession.aspectRatio;
    const currentNumImages = activeSession.numberOfImages || 1;
    
    setInput('');
    setSelectedFile(null);
    setIsLoading(true);

    let attachmentForRequest: ImageAttachment | undefined = undefined;
    let messageAttachments: ImageAttachment[] = [];
    
    if (currentFile) {
      try {
        const base64 = await fileToBase64(currentFile);
        const newAttachment = {
          mimeType: currentFile.type,
          data: base64
        };
        messageAttachments.push(newAttachment);
        attachmentForRequest = newAttachment;
        
        updateCurrentSession(s => ({ ...s, activeReferenceImage: newAttachment }));
      } catch (e) {
        console.error("Failed to process file", e);
        setIsLoading(false);
        return;
      }
    } else {
      if (activeSession.activeReferenceImage) {
        attachmentForRequest = activeSession.activeReferenceImage;
      }
    }

    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      sender: Sender.User,
      text: currentInput,
      attachments: messageAttachments,
      timestamp: Date.now()
    };

    updateCurrentSession(s => {
      const newMessages = [...s.messages, userMessage];
      let newTitle = s.title;
      if (!newTitle && currentInput) {
        newTitle = currentInput.slice(0, 30) + (currentInput.length > 30 ? '...' : '');
      } else if (!newTitle && currentFile) {
        newTitle = "Image Upload";
      }
      return { ...s, messages: newMessages, title: newTitle };
    });

    try {
      const imageBytesArray = await generateOrEditImage(currentInput, currentAspectRatio, currentNumImages, attachmentForRequest);

      const generatedImages: GeneratedImage[] = imageBytesArray.map((bytes, idx) => ({
        id: `${Date.now()}-${idx}`,
        data: bytes,
        prompt: currentInput || (attachmentForRequest ? "Variation of image" : "Generated Image"),
        timestamp: Date.now()
      }));

      let aiText = "";
      const countText = generatedImages.length > 1 ? ` ${generatedImages.length} images` : '';

      if (attachmentForRequest && !currentFile) {
        aiText = `I've updated the reference image based on: "${currentInput}" (${currentAspectRatio})${countText}`;
      } else if (attachmentForRequest && currentFile) {
         aiText = currentInput 
            ? `Here is a variation based on your new image: "${currentInput}" (${currentAspectRatio})${countText}`
            : `Here is a variation of your uploaded image (${currentAspectRatio})${countText}`;
      } else {
        aiText = `I've generated${countText} for you based on: "${currentInput}" (${currentAspectRatio})`;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.AI,
        text: aiText,
        generatedImages: generatedImages,
        timestamp: Date.now()
      };

      updateCurrentSession(s => ({
        ...s,
        messages: [...s.messages, aiMessage],
        gallery: [...s.gallery, ...generatedImages]
      }));

    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.AI,
        text: `I encountered an error: ${error.message || "Unknown error occurred."}. Please try again.`,
        timestamp: Date.now()
      };
      updateCurrentSession(s => ({ ...s, messages: [...s.messages, errorMessage] }));
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedFile, isLoading, activeSession, updateCurrentSession]);

  const handleReuseImage = useCallback((img: GeneratedImage) => {
    fetch(`data:image/png;base64,${img.data}`)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "edited-image.png", { type: "image/png" });
        setSelectedFile(file);
        setInput("");
      });
  }, []);

  const handleClearReference = useCallback(() => {
    updateCurrentSession(s => ({ ...s, activeReferenceImage: null }));
  }, [updateCurrentSession]);

  if (!activeSession) return <div className="flex h-screen items-center justify-center bg-background text-textMain">Loading...</div>;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          isLoading={isLoading}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <Sidebar 
            messages={activeSession.messages}
            input={input}
            setInput={setInput}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            onSend={handleSend}
            isLoading={isLoading}
            onReuseImage={handleReuseImage}
            activeReferenceImage={activeSession.activeReferenceImage}
            onClearReference={handleClearReference}
            sessionTitle={activeSession.title}
            aspectRatio={activeSession.aspectRatio}
            setAspectRatio={handleAspectRatioChange}
            numberOfImages={activeSession.numberOfImages || 1}
            setNumberOfImages={handleNumberOfImagesChange}
        />

        <MainGallery 
            images={activeSession.gallery}
            onReuseImage={handleReuseImage}
        />
    </div>
  );
};

export default App;