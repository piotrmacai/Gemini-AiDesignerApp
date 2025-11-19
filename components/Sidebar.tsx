import React, { useEffect, useRef } from 'react';
import { Message, Sender, ImageAttachment, GeneratedImage } from '../types';
import { IconSparkles, IconImage, IconSend, IconX } from './Icons';

interface SidebarProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  onSend: () => void;
  isLoading: boolean;
  onReuseImage: (img: GeneratedImage) => void;
  activeReferenceImage: ImageAttachment | null;
  onClearReference: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  messages,
  input,
  setInput,
  selectedFile,
  setSelectedFile,
  onSend,
  isLoading,
  onReuseImage,
  activeReferenceImage,
  onClearReference
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const renderMessage = (msg: Message) => {
    const isAI = msg.sender === Sender.AI;
    
    return (
      <div key={msg.id} className={`mb-6 flex ${isAI ? 'justify-start' : 'justify-end'}`}>
        <div className={`flex flex-col max-w-[90%] ${isAI ? 'items-start' : 'items-end'}`}>
          
          {/* Avatar / Identity */}
          {isAI && (
            <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-primary">
              <IconSparkles className="w-4 h-4" />
              <span>ArchGenius AI</span>
            </div>
          )}

          {/* Attachments (User uploaded) */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mb-2">
              {msg.attachments.map((att, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-surfaceHighlight w-48">
                  <img 
                    src={`data:${att.mimeType};base64,${att.data}`} 
                    alt="Attachment" 
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                    Source
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Text Content */}
          {msg.text && (
            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              isAI 
                ? 'bg-surfaceHighlight text-textMain rounded-tl-none' 
                : 'bg-accent text-white rounded-tr-none'
            }`}>
              {msg.text}
            </div>
          )}
          
          {/* Note: Generated images are now only shown in the MainGallery, removed from Sidebar flow. */}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface border-r border-surfaceHighlight w-full md:w-[400px] lg:w-[450px] shrink-0">
      {/* Header */}
      <div className="h-16 flex items-center px-6 border-b border-surfaceHighlight bg-background/50 backdrop-blur">
        <div className="flex items-center gap-2 text-lg font-semibold text-textMain">
          <span className="w-8 h-8 bg-yellow-500 text-black rounded flex items-center justify-center font-bold">A</span>
          <span>New Design Project</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-textMuted text-center p-8 opacity-50">
            <IconSparkles className="w-12 h-12 mb-4 text-primary" />
            <p className="text-sm">Start by describing a building, facade, or uploading an image to edit.</p>
          </div>
        )}
        {messages.map(renderMessage)}
        {isLoading && (
            <div className="flex justify-start mb-6">
                 <div className="bg-surfaceHighlight text-textMain px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/50 backdrop-blur border-t border-surfaceHighlight">
        
        {/* Pending Upload Preview */}
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-surfaceHighlight rounded-lg w-max animate-in fade-in slide-in-from-bottom-1">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-black border border-surfaceHighlight/50">
                <img 
                    src={URL.createObjectURL(selectedFile)} 
                    alt="preview" 
                    className="w-full h-full object-cover opacity-80"
                />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-medium text-textMain max-w-[150px] truncate">{selectedFile.name}</span>
                <span className="text-[10px] text-primary">Ready to upload</span>
            </div>
            <button onClick={() => setSelectedFile(null)} className="ml-2 p-1 text-textMuted hover:text-white hover:bg-white/10 rounded-full">
              <IconX className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Persistent Reference Preview (Only if no file selected) */}
        {!selectedFile && activeReferenceImage && (
           <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-surfaceHighlight/30 border border-primary/20 rounded-xl w-full animate-in fade-in slide-in-from-bottom-2">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-surfaceHighlight">
                    <img 
                        src={`data:${activeReferenceImage.mimeType};base64,${activeReferenceImage.data}`} 
                        alt="Reference" 
                        className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary mb-0.5">Using Reference Image</p>
                    <p className="text-[10px] text-textMuted truncate">Prompts will edit this image</p>
                </div>
                <button 
                    onClick={onClearReference} 
                    className="p-1.5 hover:bg-white/10 rounded-full text-textMuted hover:text-white transition-colors"
                    title="Clear reference"
                >
                    <IconX className="w-3.5 h-3.5" />
                </button>
            </div>
        )}

        <div className="relative flex items-end gap-2 bg-surfaceHighlight rounded-3xl p-2 border border-transparent focus-within:border-gray-600 transition-colors">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-textMuted hover:text-white transition-colors rounded-full hover:bg-white/10"
            title="Upload Image"
          >
            <IconImage className="w-6 h-6" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept="image/*"
          />
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeReferenceImage && !selectedFile ? "Describe changes (e.g., 'add trees', 'make it night')..." : "Describe a building, facade, or environment..."}
            className="flex-1 bg-transparent text-textMain placeholder-textMuted text-sm focus:outline-none py-3 resize-none max-h-32"
            rows={1}
            style={{ minHeight: '44px' }}
          />
          
          <button 
            onClick={onSend}
            disabled={(!input.trim() && !selectedFile) || isLoading}
            className={`p-2 rounded-full transition-all duration-200 ${
              (!input.trim() && !selectedFile) || isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-textMain text-background hover:bg-white'
            }`}
          >
            <IconSend className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};