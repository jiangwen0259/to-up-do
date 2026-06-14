import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from "react";
import type { Todo, AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

export interface AppState {
  todos: Todo[];
  settings: AppSettings;
  loading: boolean;
  filter: {
    status: "all" | "todo" | "in_progress" | "done" | "overdue";
    source: "all" | "manual" | "tapd";
    search: string;
  };
}

const initialState: AppState = {
  todos: [],
  settings: DEFAULT_SETTINGS,
  loading: true,
  filter: {
    status: "all",
    source: "all",
    search: "",
  },
};

export type Action =
  | { type: "SET_TODOS"; payload: Todo[] }
  | { type: "ADD_TODO"; payload: Todo }
  | { type: "UPDATE_TODO"; payload: Todo }
  | { type: "DELETE_TODO"; payload: number }
  | { type: "SET_SETTINGS"; payload: AppSettings }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_FILTER"; payload: Partial<AppState["filter"]> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_TODOS":
      return { ...state, todos: action.payload, loading: false };
    case "ADD_TODO":
      return { ...state, todos: [...state.todos, action.payload] };
    case "UPDATE_TODO":
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };
    case "DELETE_TODO":
      return { ...state, todos: state.todos.filter((t) => t.id !== action.payload) };
    case "SET_SETTINGS":
      return { ...state, settings: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_FILTER":
      return { ...state, filter: { ...state.filter, ...action.payload } };
    default:
      return state;
  }
}

const AppContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<Dispatch<Action>>(() => {});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}

export function useAppDispatch() {
  return useContext(AppDispatchContext);
}
