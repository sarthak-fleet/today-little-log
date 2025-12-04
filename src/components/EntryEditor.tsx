import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, Pencil, X } from 'lucide-react';
import { EntryType, JournalEntry } from '@/hooks/useJournalEntries';

interface EntryEditorProps {
  entry?: JournalEntry;
  entryType: EntryType;
  title: string;
  placeholder: string;
  onSave: (content: string, entryType: EntryType) => void;
}

export function EntryEditor({ entry, entryType, title, placeholder, onSave }: EntryEditorProps) {
  const [content, setContent] = useState(entry?.content || '');
  const [isEditing, setIsEditing] = useState(!entry?.content);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (entry?.content) {
      setContent(entry.content);
      setIsEditing(false);
    }
  }, [entry?.content]);

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim(), entryType);
      setIsEditing(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleCancel = () => {
    setContent(entry?.content || '');
    setIsEditing(false);
  };

  return (
    <div className="journal-paper rounded-xl shadow-card p-6 transition-all duration-300 hover:shadow-glow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-medium text-foreground">{title}</h3>
        {!isEditing && entry?.content && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="min-h-[120px] resize-none border-none bg-transparent text-base font-sans text-journal-ink placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-2">
            {entry?.content && (
              <Button variant="ghost" onClick={handleCancel} className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={!content.trim()} className="gap-2">
              <Check className="h-4 w-4" />
              Save
            </Button>
          </div>
        </>
      ) : entry?.content ? (
        <p className="text-base font-sans text-journal-ink whitespace-pre-wrap leading-7">
          {content}
        </p>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsEditing(true)}
          className="w-full text-muted-foreground"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Write {title.toLowerCase()}
        </Button>
      )}

      {isSaved && (
        <p className="text-sm text-primary mt-2 animate-fade-in">✓ Saved</p>
      )}
    </div>
  );
}
