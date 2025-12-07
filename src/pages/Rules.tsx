import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLifeRules } from '@/hooks/useLifeRules';
import { Feather, ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect } from 'react';

const Rules = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { rules, isLoading, addRule, updateRule, deleteRule } = useLifeRules();
  const [newRule, setNewRule] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Feather className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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
      {/* Header */}
      <header className="py-6 px-4 border-b border-border/50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display font-semibold text-foreground text-lg">
                Rules for Life
              </h1>
              <p className="text-xs text-muted-foreground font-sans">
                Principles to live by
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
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
