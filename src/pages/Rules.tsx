import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { GuestNotice } from '@/components/GuestNotice';
import { useAuth } from '@/hooks/useAuth';
import { useLifeRules } from '@/hooks/useLifeRules';
import { Feather, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Rules = () => {
  const { loading } = useAuth();
  const { rules, isLoading, isSaving, isLoggedIn, addRule, updateRule, deleteRule } = useLifeRules();
  const [newRule, setNewRule] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Feather className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  const handleAddRule = async () => {
    if (!newRule.trim()) return;
    await addRule(newRule.trim());
    setNewRule('');
  };

  const handleStartEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    await updateRule(editingId, editContent.trim());
    setEditingId(null);
    setEditContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isSaving={isSaving} />

      {/* Guest mode notice */}
      {!isLoggedIn && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <GuestNotice message="Log in to save your rules across devices" />
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <h2 className="text-xl font-display font-semibold text-foreground mb-6">Rules for Life</h2>

        {/* Add new rule */}
        <div className="flex gap-2 mb-8">
          <Input
            placeholder="Add a new rule..."
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAddRule)}
            className="flex-1 bg-background"
          />
          <Button onClick={handleAddRule} disabled={!newRule.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Rules list */}
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-display text-lg mb-2">No rules yet</p>
              <p className="text-sm">Add your first rule for life above</p>
            </div>
          ) : (
            rules.map((rule, index) => (
              <div
                key={rule.id}
                className="group flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-card hover:border-border transition-colors"
              >
                <span className="text-muted-foreground font-display font-semibold w-8 text-center">
                  {index + 1}.
                </span>
                
                {editingId === rule.id ? (
                  <Input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                    onBlur={handleSaveEdit}
                    autoFocus
                    className="flex-1 bg-background"
                  />
                ) : (
                  <p
                    className="flex-1 font-sans text-foreground cursor-pointer"
                    onClick={() => handleStartEdit(rule.id, rule.content)}
                  >
                    {rule.content}
                  </p>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Rules;
