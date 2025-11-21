
import React from 'react';
import { Session } from '../types';
import { IconPlus, IconMessage, IconTrash } from './Icons';

interface SessionSidebarProps {
  sessions: Session[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  isLoading: boolean;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  isLoading
}) => {
  return (
    <div className="w-[260px] flex-shrink-0 flex flex-col h-full bg-[#0b0c10] border-r border-surfaceHighlight/50">
      {/* Header */}
      <div className="p-4">
        <button
          onClick={onCreateSession}
          disabled={isLoading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl transition-all shadow-lg shadow-accent/20 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconPlus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <div className="px-4 py-2 text-xs font-medium text-textMuted uppercase tracking-wider">
          History
        </div>
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => !isLoading && onSelectSession(session.id)}
            className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
              session.id === currentSessionId
                ? 'bg-surfaceHighlight text-textMain'
                : 'text-textMuted hover:bg-white/5 hover:text-textMain'
            } ${isLoading ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <IconMessage className={`w-4 h-4 shrink-0 ${session.id === currentSessionId ? 'text-primary' : 'text-textMuted'}`} />
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {session.title || "Untitled Project"}
              </div>
              <div className="text-[10px] opacity-60">
                {new Date(session.lastModified).toLocaleDateString()}
              </div>
            </div>

            {/* Delete Button - Visible on hover or if active */}
            {sessions.length > 1 && (
                <button
                    onClick={(e) => onDeleteSession(session.id, e)}
                    className={`opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all ${
                        session.id === currentSessionId ? 'opacity-100' : ''
                    }`}
                    title="Delete Session"
                    disabled={isLoading}
                >
                    <IconTrash className="w-3.5 h-3.5" />
                </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-surfaceHighlight/30">
        <div className="flex items-center gap-2 text-xs text-textMuted">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Gemini 2.5 Flash Image</span>
        </div>
      </div>
    </div>
  );
};
