import { useMemo, useState } from 'react';
import { useFoodLog, setMacroTargets } from '@/hooks/useFoodLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Apple, Plus, Trash2, Flame } from 'lucide-react';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const Food = () => {
  const { items, todayLogs, totals, targets, isLoaded, addItem, logFood, removeLog } = useFoodLog();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', calories_per_serving: '', protein_g: '', carbs_g: '', fat_g: '' });
  const [editTargets, setEditTargets] = useState(false);
  const [targetDraft, setTargetDraft] = useState({ ...targets });

  const filtered = useMemo(() => {
    if (!search) return items.slice(0, 40);
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 40);
  }, [items, search]);

  const add = async () => {
    const cals = parseFloat(newItem.calories_per_serving);
    if (!newItem.name.trim() || !Number.isFinite(cals)) return;
    const saved = await addItem({
      name: newItem.name.trim(),
      calories_per_serving: cals,
      protein_g: parseFloat(newItem.protein_g) || 0,
      carbs_g: parseFloat(newItem.carbs_g) || 0,
      fat_g: parseFloat(newItem.fat_g) || 0,
      unit: 'serving',
    });
    if (saved) {
      setNewItem({ name: '', calories_per_serving: '', protein_g: '', carbs_g: '', fat_g: '' });
      setShowCreate(false);
      setSearch(saved.name);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Apple className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Fuel</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
          Calories don't lie. <span className="text-primary italic font-medium">Log anyway.</span>
        </h1>
      </section>

      <section className="px-4 max-w-4xl mx-auto pb-8">
        {/* Totals vs targets */}
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Today</span>
            <button onClick={() => setEditTargets((v) => !v)} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
              {editTargets ? 'Done' : 'Edit targets'}
            </button>
          </div>
          {editTargets ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['calories', 'protein_g', 'carbs_g', 'fat_g'] as const).map((k) => (
                <div key={k}>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-widest">{k.replace('_g', '')}</label>
                  <Input
                    type="number"
                    value={String(targetDraft[k] ?? 0)}
                    onChange={(e) => setTargetDraft((prev) => ({ ...prev, [k]: parseFloat(e.target.value) || 0 }))}
                    onBlur={() => setMacroTargets(targetDraft)}
                    className="bg-background mt-1"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MacroTile label="Calories" now={totals.calories} target={targets.calories} tone="primary" />
              <MacroTile label="Protein" now={totals.protein_g} target={targets.protein_g} tone="accent" />
              <MacroTile label="Carbs" now={totals.carbs_g} target={targets.carbs_g} tone="muted" />
              <MacroTile label="Fat" now={totals.fat_g} target={targets.fat_g} tone="muted" />
            </div>
          )}
        </div>
      </section>

      <section className="px-4 max-w-4xl mx-auto pb-8">
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search your foods..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background"
            />
            <Button variant="outline" size="sm" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>

          {showCreate && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2 border-t border-border">
              <Input placeholder="Name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="md:col-span-2 bg-background" />
              <Input type="number" placeholder="Cal" value={newItem.calories_per_serving} onChange={(e) => setNewItem({ ...newItem, calories_per_serving: e.target.value })} className="bg-background" />
              <Input type="number" placeholder="P" value={newItem.protein_g} onChange={(e) => setNewItem({ ...newItem, protein_g: e.target.value })} className="bg-background" />
              <Input type="number" placeholder="C" value={newItem.carbs_g} onChange={(e) => setNewItem({ ...newItem, carbs_g: e.target.value })} className="bg-background" />
              <Input type="number" placeholder="F" value={newItem.fat_g} onChange={(e) => setNewItem({ ...newItem, fat_g: e.target.value })} className="bg-background" />
              <div className="md:col-span-6 flex justify-end">
                <Button size="sm" onClick={add} disabled={!newItem.name.trim() || !newItem.calories_per_serving}>Save item</Button>
              </div>
            </div>
          )}

          {isLoaded && (
            <ul className="divide-y divide-border max-h-60 overflow-y-auto">
              {filtered.map((it) => (
                <li key={it.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">{it.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {it.calories_per_serving} kcal · P{it.protein_g} C{it.carbs_g} F{it.fat_g} / {it.unit}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {MEAL_TYPES.map((m) => (
                      <Button
                        key={m}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] px-2 font-mono uppercase"
                        onClick={() => logFood(it.id, 1, m)}
                      >
                        {m.slice(0, 1)}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => logFood(it.id, 1)}
                    >
                      +1
                    </Button>
                  </div>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="py-4 text-center text-sm text-muted-foreground">
                  {search ? 'No match. Create it.' : 'No foods yet. Add one.'}
                </li>
              )}
            </ul>
          )}
        </div>
      </section>

      <section className="px-4 max-w-4xl mx-auto pb-20">
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Flame className="h-3 w-3" /> Today's log
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{todayLogs.length} entries</span>
          </div>
          {todayLogs.length === 0 ? (
            <div className="text-sm text-muted-foreground italic">Log something. Or lie to the scale later.</div>
          ) : (
            <ul className="divide-y divide-border">
              {todayLogs.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">{l.name}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">×{l.servings}{l.meal_type ? ` · ${l.meal_type}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {(l.calories_per_serving * l.servings).toFixed(0)} kcal
                    </span>
                    <button onClick={() => removeLog(l.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

function MacroTile({ label, now, target, tone }: { label: string; now: number; target: number; tone: 'primary' | 'accent' | 'muted' }) {
  const pct = target > 0 ? Math.min(100, (now / target) * 100) : 0;
  const color = tone === 'primary' ? 'bg-primary' : tone === 'accent' ? 'bg-accent' : 'bg-muted-foreground';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-[11px] font-mono text-muted-foreground">{now.toFixed(0)}/{target}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default Food;
