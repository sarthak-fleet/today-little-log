import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface SavingContextValue {
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
}

const SavingContext = createContext<SavingContextValue>({
  isSaving: false,
  setIsSaving: () => {},
});

export function SavingProvider({ children }: { children: ReactNode }) {
  const [isSaving, setIsSaving] = useState(false);
  return (
    <SavingContext.Provider value={{ isSaving, setIsSaving }}>
      {children}
    </SavingContext.Provider>
  );
}

/** Pages call this to report saving status to the shared Navbar. */
export function useReportSaving(saving: boolean) {
  const { setIsSaving } = useContext(SavingContext);
  useEffect(() => {
    setIsSaving(saving);
    return () => setIsSaving(false);
  }, [saving, setIsSaving]);
}

export function useSaving() {
  return useContext(SavingContext);
}
