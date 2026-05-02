'use client';

import { useReducer } from 'react';

export type EventType = 'goal' | 'yellow_card' | 'red_card' | 'substitution';
export type TeamSide = 'home' | 'away' | '';
export type CardType = 'yellow_card' | 'red_card';

interface EventFormState {
  activePanel: EventType | null;
  selectedTeam: TeamSide;
  selectedPlayer: string;
  selectedPlayerOut: string;
  selectedAssistPlayer: string;
  cardType: CardType;
  inputMinute: string;
  isOwnGoal: boolean;
}

type EventFormAction =
  | { type: 'SET_ACTIVE_PANEL'; payload: EventType | null }
  | { type: 'SET_SELECTED_TEAM'; payload: TeamSide }
  | { type: 'SET_SELECTED_PLAYER'; payload: string }
  | { type: 'SET_SELECTED_PLAYER_OUT'; payload: string }
  | { type: 'SET_SELECTED_ASSIST_PLAYER'; payload: string }
  | { type: 'SET_CARD_TYPE'; payload: CardType }
  | { type: 'SET_INPUT_MINUTE'; payload: string }
  | { type: 'SET_IS_OWN_GOAL'; payload: boolean }
  | { type: 'RESET' };

const initialState: EventFormState = {
  activePanel: null,
  selectedTeam: '',
  selectedPlayer: '',
  selectedPlayerOut: '',
  selectedAssistPlayer: '',
  cardType: 'yellow_card',
  inputMinute: '',
  isOwnGoal: false,
};

function reducer(state: EventFormState, action: EventFormAction): EventFormState {
  switch (action.type) {
    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: action.payload };
    case 'SET_SELECTED_TEAM':
      return { ...state, selectedTeam: action.payload };
    case 'SET_SELECTED_PLAYER':
      return { ...state, selectedPlayer: action.payload };
    case 'SET_SELECTED_PLAYER_OUT':
      return { ...state, selectedPlayerOut: action.payload };
    case 'SET_SELECTED_ASSIST_PLAYER':
      return { ...state, selectedAssistPlayer: action.payload };
    case 'SET_CARD_TYPE':
      return { ...state, cardType: action.payload };
    case 'SET_INPUT_MINUTE':
      return { ...state, inputMinute: action.payload };
    case 'SET_IS_OWN_GOAL':
      return { ...state, isOwnGoal: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useEventFormState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return {
    state,
    actions: {
      setActivePanel: (payload: EventType | null) =>
        dispatch({ type: 'SET_ACTIVE_PANEL', payload }),
      setSelectedTeam: (payload: TeamSide) =>
        dispatch({ type: 'SET_SELECTED_TEAM', payload }),
      setSelectedPlayer: (payload: string) =>
        dispatch({ type: 'SET_SELECTED_PLAYER', payload }),
      setSelectedPlayerOut: (payload: string) =>
        dispatch({ type: 'SET_SELECTED_PLAYER_OUT', payload }),
      setSelectedAssistPlayer: (payload: string) =>
        dispatch({ type: 'SET_SELECTED_ASSIST_PLAYER', payload }),
      setCardType: (payload: CardType) =>
        dispatch({ type: 'SET_CARD_TYPE', payload }),
      setInputMinute: (payload: string) =>
        dispatch({ type: 'SET_INPUT_MINUTE', payload }),
      setIsOwnGoal: (payload: boolean) =>
        dispatch({ type: 'SET_IS_OWN_GOAL', payload }),
      reset: () => dispatch({ type: 'RESET' }),
    },
  };
}

