'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ReservationContextType {
  isVisible: boolean;
  isMinimized: boolean;
  reservationCode: string | undefined;
  showReservation: (code: string) => void;
  hideReservation: () => void;
  minimizeReservation: () => void;
  maximizeReservation: () => void;
}

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [reservationCode, setReservationCode] = useState<string | undefined>();

  const showReservation = (code: string) => {
    setReservationCode(code);
    setIsVisible(true);
    setIsMinimized(false);
  };

  const hideReservation = () => {
    setIsVisible(false);
    setIsMinimized(false);
    setReservationCode(undefined);
  };

  const minimizeReservation = () => {
    setIsMinimized(true);
  };

  const maximizeReservation = () => {
    setIsMinimized(false);
  };

  return (
    <ReservationContext.Provider
      value={{
        isVisible,
        isMinimized,
        reservationCode,
        showReservation,
        hideReservation,
        minimizeReservation,
        maximizeReservation,
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
}

export function useReservation() {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error('useReservation must be used within a ReservationProvider');
  }
  return context;
}