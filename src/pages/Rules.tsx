import { useState } from 'react';
import { useReportSaving } from '@/components/SavingContext';
import { GuestNotice } from '@/components/GuestNotice';
import { useAuth } from '@/hooks/useAuth';
import { useLifeRules } from '@/hooks/useLifeRules';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { RulesSkeleton } from '@/components/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Rules = () => {
  const { loading } = useAuth();
  const { rules, isLoading, isSaving, isLoggedIn, addRule, updateRule, deleteRule } = useLifeRules();
  const [newRule, setNewRule] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

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

  useReportSaving(isSaving);

  if (loading || isLoading) return <RulesSkeleton />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <BookOpen className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Rules</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
          Write them down. <span className="text-primary italic font-medium">Live them.</span>
        </h1>
      </section>

      {!isLoggedIn && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <GuestNotice message="Log in to save your rules across devices" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pb-20">

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
      </div>
    </div>
  );
};

export default Rules;
