import React from 'react';
import { GeneratedImage } from '../types';
import { IconDownload, IconEdit } from './Icons';

interface MainGalleryProps {
  images: GeneratedImage[];
  onReuseImage: (img: GeneratedImage) => void;
}

export const MainGallery: React.FC<MainGalleryProps> = ({ images, onReuseImage }) => {
  return (
    <div className="flex-1 h-full overflow-y-auto p-6 bg-background">
        <div className="max-w-[1600px] mx-auto">
            {images.length === 0 ? (
                <div className="h-[80vh] flex flex-col items-center justify-center text-textMuted">
                    <div className="w-64 h-64 bg-surfaceHighlight/30 rounded-full flex items-center justify-center mb-6">
                         <div className="grid grid-cols-2 gap-2 w-32 h-32 opacity-20">
                            <div className="bg-white rounded-lg"></div>
                            <div className="bg-white rounded-lg"></div>
                            <div className="bg-white rounded-lg"></div>
                            <div className="bg-white rounded-lg"></div>
                         </div>
                    </div>
                    <h2 className="text-xl font-medium mb-2">No creations yet</h2>
                    <p className="text-sm">Your generated images and edits will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {images.slice().reverse().map((img) => (
                        <div key={img.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-surface border border-surfaceHighlight shadow-2xl transition-transform duration-300 hover:scale-[1.01]">
                            <img 
                                src={`data:image/png;base64,${img.data}`} 
                                alt={img.prompt} 
                                className="w-full h-full object-cover"
                            />
                            
                            {/* Overlay Info */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                <p className="text-white text-sm font-medium line-clamp-2 mb-4 opacity-90">
                                    {img.prompt}
                                </p>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => onReuseImage(img)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-2 rounded-lg text-xs font-medium transition-colors border border-white/10"
                                    >
                                        <IconEdit className="w-3 h-3" />
                                        Edit this
                                    </button>
                                    <a 
                                        href={`data:image/png;base64,${img.data}`} 
                                        download={`design-${img.id}.png`}
                                        className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        <IconDownload className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};