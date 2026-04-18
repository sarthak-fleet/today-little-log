export const MEMENTO_QUOTES: { text: string; source?: string }[] = [
  { text: 'You could leave life right now. Let that determine what you do and say and think.', source: 'Marcus Aurelius' },
  { text: 'It is not that we have a short time to live, but that we waste a lot of it.', source: 'Seneca' },
  { text: 'Begin at once to live, and count each separate day as a separate life.', source: 'Seneca' },
  { text: 'Remember that you are mortal, so put your hours to use.', source: 'Horace' },
  { text: 'The part of life we really live is small. For all the rest of existence is not life, but merely time.', source: 'Seneca' },
  { text: "You will never find time for anything. If you want time, you must make it.", source: 'Charles Buxton' },
  { text: 'The trouble is, you think you have time.', source: 'Jack Kornfield' },
  { text: 'No man ever steps in the same river twice.', source: 'Heraclitus' },
  { text: 'While we are postponing, life speeds by.', source: 'Seneca' },
  { text: 'Lost time is never found again.', source: 'Benjamin Franklin' },
  { text: 'Dost thou love life? Then do not squander time, for that is the stuff life is made of.', source: 'Benjamin Franklin' },
  { text: 'Death smiles at us all; all a man can do is smile back.', source: 'Marcus Aurelius' },
  { text: 'Memento mori.', source: 'Stoic' },
  { text: 'Time is the substance from which I am made. Time is a river which sweeps me along, but I am the river.', source: 'Borges' },
  { text: 'The two most powerful warriors are patience and time.', source: 'Tolstoy' },
  { text: 'Every minute you spend on something you hate is a minute stolen from something you love.', source: '—' },
  { text: 'You are dying. Small talk kills.', source: '—' },
  { text: 'The scroll will still be there tomorrow. Tomorrow will not.', source: '—' },
];

export function quoteOfDay(date: Date = new Date()): { text: string; source?: string } {
  // Deterministic daily selection: YYYYMMDD mod length
  const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return MEMENTO_QUOTES[key % MEMENTO_QUOTES.length];
}
