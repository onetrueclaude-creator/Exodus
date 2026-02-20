"use client";

import { useState, useCallback } from 'react';

interface TimeRewindProps {
  serverStartTime: number;
  currentTime: number;
  onTimeChange: (timestamp: number) => void;
}

export default function TimeRewind({ serverStartTime, currentTime, onTimeChange }: TimeRewindProps) {
  const [expanded, setExpanded] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [selectedTime, setSelectedTime] = useState(currentTime);

  const handleSliderChange = useCallback((value: number) => {
    setSelectedTime(value);
    setIsLive(false);
    onTimeChange(value);
  }, [onTimeChange]);

  const handleGoLive = useCallback(() => {
    setIsLive(true);
    setSelectedTime(currentTime);
    onTimeChange(currentTime);
  }, [currentTime, onTimeChange]);

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="glass-card px-3 py-1.5 text-[10px] font-mono text-text-muted hover:text-accent-cyan transition-colors flex items-center gap-2"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-orange-400'}`} />
        {isLive ? 'LIVE' : formatTimestamp(selectedTime)}
      </button>
    );
  }

  return (
    <div className="glass-card p-3 w-72">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Time Control</span>
        <button
          onClick={() => setExpanded(false)}
          className="text-text-muted hover:text-text-primary text-xs"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={handleGoLive}
          className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
            isLive
              ? 'bg-green-400/20 text-green-400 border border-green-400/30'
              : 'text-text-muted hover:text-green-400'
          }`}
        >
          LIVE
        </button>
        <span className="text-[10px] font-mono text-text-muted flex-1 text-right">
          {formatTimestamp(selectedTime)}
        </span>
      </div>

      <input
        type="range"
        min={serverStartTime}
        max={currentTime}
        value={isLive ? currentTime : selectedTime}
        onChange={(e) => handleSliderChange(parseInt(e.target.value))}
        className="w-full h-1 accent-accent-cyan cursor-pointer"
      />

      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-text-muted font-mono">{formatTimestamp(serverStartTime)}</span>
        <span className="text-[9px] text-text-muted font-mono">Now</span>
      </div>
    </div>
  );
}
