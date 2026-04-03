"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatus } from "@/services/api";

/**
 * Custom hook to poll the status of a file upload/processing
 * @param {string} promptId - The ID of the prompt to poll
 * @param {string} userId - User ID for authentication
 * @param {boolean} enabled - Whether to start polling
 * @param {number} interval - Polling interval in milliseconds (default: 2000)
 * @returns {Object} { status, data, error, isPolling, stopPolling }
 */
export function useStatusPolling(promptId, userId, enabled = false, interval = 2000) {
  const [status, setStatus] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(enabled);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  useEffect(() => {
    if (!isPolling || !promptId || !userId) {
      return;
    }

    let timeoutId;
    let isMounted = true;

    const poll = async () => {
      try {
        const response = await getStatus(promptId, userId);

        if (!isMounted) return;

        setData(response);
        setStatus(response.ai_processing_status);
        setError(null);

        // Stop polling if status is completed or failed
        if (response.ai_processing_status === "completed" || 
            response.ai_processing_status === "failed") {
          setIsPolling(false);
        } else {
          // Continue polling
          timeoutId = setTimeout(poll, interval);
        }
      } catch (err) {
        if (!isMounted) return;

        console.error("Status polling error:", err);
        setError(err.message);

        // Retry after interval
        timeoutId = setTimeout(poll, interval);
      }
    };

    // Start polling
    poll();

    // Cleanup
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [promptId, userId, isPolling, interval]);

  return {
    status,
    data,
    error,
    isPolling,
    stopPolling,
    startPolling,
  };
}
