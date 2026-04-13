"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface DeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string | React.ReactNode;
    onConfirm: () => Promise<void> | void;
}

export function DeleteDialog({ open, onOpenChange, title, description, onConfirm }: DeleteDialogProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async () => {
        setIsLoading(true);

        try {
            await onConfirm();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || t("error"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] rounded-2xl p-8 text-start">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                    <AlertTriangle size={24} />
                </div>
                <DialogHeader className="text-center">
                    <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                    <DialogDescription className="pt-2 text-muted-foreground font-medium text-sm">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 rounded-xl h-11 font-semibold"
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="flex-1 rounded-xl h-11 font-bold uppercase tracking-widest text-[10px]"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            t("confirm")
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
