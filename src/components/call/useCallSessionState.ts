import { useCallback, useReducer } from "react";
import type { CallStatus } from "../../types/signaling";
import {
  initialCallSessionState,
  type CallSessionAction,
  type CallSessionState,
} from "../../types/callSession";

function callSessionReducer(
  state: CallSessionState,
  action: CallSessionAction,
): CallSessionState {
  switch (action.type) {
    case "set-status":
      return { ...state, status: action.status };
    case "set-error":
      return { ...state, errorMessage: action.errorMessage };
    case "set-has-remote-participant":
      return {
        ...state,
        hasRemoteParticipant: action.hasRemoteParticipant,
      };
    case "set-is-initiator":
      return { ...state, isInitiator: action.isInitiator };
    case "reset-for-room-join":
      return {
        ...state,
        hasRemoteParticipant: false,
        errorMessage: null,
        status: "call.status.joining",
      };
    default:
      return state;
  }
}

export function useCallSessionState() {
  const [session, dispatch] = useReducer(
    callSessionReducer,
    initialCallSessionState,
  );

  const setStatus = useCallback((status: CallStatus) => {
    dispatch({ type: "set-status", status });
  }, []);

  const setErrorMessage = useCallback((errorMessage: string | null) => {
    dispatch({ type: "set-error", errorMessage });
  }, []);

  const setHasRemoteParticipant = useCallback(
    (hasRemoteParticipant: boolean) => {
      dispatch({ type: "set-has-remote-participant", hasRemoteParticipant });
    },
    [],
  );

  const setIsInitiator = useCallback((isInitiator: boolean) => {
    dispatch({ type: "set-is-initiator", isInitiator });
  }, []);

  const resetForRoomJoin = useCallback(() => {
    dispatch({ type: "reset-for-room-join" });
  }, []);

  return {
    session,
    setStatus,
    setErrorMessage,
    setHasRemoteParticipant,
    setIsInitiator,
    resetForRoomJoin,
  };
}
