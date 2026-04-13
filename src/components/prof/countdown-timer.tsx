"use client";

import { useEffect, useState } from "react";
import { Timer as TimerIcon } from "lucide-react";

interface CountdownTimerProps {
    endTime: string;
    onEnd?: () => void;
    isActive: boolean;
}

export function CountdownTimer({ endTime, onEnd, isActive }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!isActive) return;

        const calculateTime = () => {
            const now = new Date().getTime();
            const end = new Date(endTime).getTime();
            const diff = Math.max(0, Math.floor((end - now) / 1000));
            setTimeLeft(diff);

            if (diff === 0 && onEnd) {
                onEnd();
            }
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [endTime, isActive, onEnd]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="text-center">
            <div
                className={`flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 transition-all duration-500 ${isActive && timeLeft > 0
                        ? "border-primary pulse-glow"
                        : "border-border"
                    }`}
            >
                <TimerIcon
                    size={18}
                    className={
                        isActive && timeLeft > 0
                            ? "text-primary"
                            : "text-muted-foreground"
                    }
                />
                <span className="mt-1 block text-xl font-bold text-foreground">
                    {formatTime(timeLeft)}
                </span>
            </div>
        </div>
    );
}
