"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/context";

interface ProfDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    professor?: any;
    onSuccess: () => void;
}

export function ProfDialog({
    open, onOpenChange, professor, onSuccess }: ProfDialogProps) {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [studyFields, setStudyFields] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        employeeId: "",
        department: "",
        specialization: "",
        rfidUid: "",
    });

    useEffect(() => {
        if (open) {
            if (professor) {
                const fullName = professor.user?.name || "";
                const [firstName, ...lastNameParts] = fullName.split(" ");
                const lastName = lastNameParts.join(" ");

                setFormData({
                    firstName: firstName || "",
                    lastName: lastName || "",
                    email: professor.user?.email || "",
                    password: "",
                    employeeId: professor.employeeId || "",
                    department: professor.department || "",
                    specialization: professor.specialization || "",
                    rfidUid: professor.rfidUid || "",
                });
            } else {
                setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                    employeeId: `EMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                    department: currentUser?.studyField || "",
                    specialization: "",
                    rfidUid: "",
                });
            }

            fetch("/api/admin/study-fields")
                .then(res => res.json())
                .then(data => {
                    const fields = data.studyFields || [];
                    setStudyFields(fields);

                    if (!professor && currentUser?.studyField) {
                        const match = fields.find((f: any) =>
                            f.code?.toUpperCase() === currentUser.studyField?.toUpperCase() ||
                            f._id === currentUser.studyField ||
                            (currentUser.studyField === 'INFO' && f.code?.toUpperCase() === 'INFORMATIQUE') ||
                            (currentUser.studyField === 'INFORMATIQUE' && f.code?.toUpperCase() === 'INFO')
                        );

                        if (match) {
                            setFormData(prev => ({
                                ...prev,
                                department: match.code
                            }));
                        }
                    }
                })
                .catch(err => console.error("Error fetching study fields:", err));
        }
    }, [professor, open, currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const method = professor ? "PUT" : "POST";
            const name = `${formData.firstName} ${formData.lastName}`.trim();
            const payload = professor ? { ...formData, name, _id: professor._id } : { ...formData, name };

            const res = await fetch("/api/professors", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || t("error"));
            }

            toast.success(professor ? t("success_prof_updated") : t("success_prof_created"));
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] overflow-hidden rounded-3xl border-none p-0 bg-background shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

                <form onSubmit={handleSubmit} className="relative z-10">
                    <DialogHeader className="p-6 sm:p-8 pb-4">
                        <div className="flex items-center gap-3 mb-2 text-primary">
                            <div className="p-2 rounded-xl bg-primary/10">
                                {professor ? <User size={24} /> : <UserPlus size={24} />}
                            </div>
                            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                                {professor ? t("edit_account") : t("new_professor")}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="px-6 sm:px-8 py-4 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-none">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("first_name")}</Label>
                                <Input
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    placeholder="e.g. John"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("last_name")}</Label>
                                <Input
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    placeholder="e.g. Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("email_address")}</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    placeholder="prof@univ.edu"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("access_password")}</Label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all"
                                    placeholder={professor ? t("password_keep_hint") : "••••••••"}
                                    required={!professor}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("employee_id_label")}</Label>
                                <Input
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-mono opacity-70"
                                    placeholder="EMP-2024-001"
                                    readOnly
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("department")}</Label>
                                {!!currentUser?.studyField && !professor ? (
                                    <div className="h-12 bg-muted/30 border-none rounded-2xl px-4 flex items-center gap-2 opacity-80">
                                        <span className="text-xs font-black uppercase tracking-widest text-foreground">
                                            {studyFields.find((f: any) =>
                                                f.code?.toUpperCase() === formData.department?.toUpperCase() || f._id === formData.department
                                            )?.name || formData.department || t("loading")}
                                        </span>
                                        <span className="ml-auto text-[8px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">Auto</span>
                                    </div>
                                ) : (
                                    <Select
                                        value={formData.department}
                                        onValueChange={(val) => setFormData({
                                            ...formData,
                                            department: val
                                        })}
                                    >
                                        <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium">
                                            <SelectValue placeholder={t("select_dept")} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                            {studyFields.map((f: any) => (
                                                <SelectItem key={f._id} value={f.code} className="rounded-xl font-medium">
                                                    {f.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("specialization")}</Label>
                                {(() => {
                                    const currentField = studyFields.find((f: any) =>
                                        f.code?.toUpperCase() === formData.department?.toUpperCase() || f._id === formData.department
                                    );
                                    const specialties = currentField?.specialties || [];

                                    return (
                                        <Select
                                            value={formData.specialization || "none"}
                                            onValueChange={(val) => setFormData({ ...formData, specialization: val === "none" ? "" : val })}
                                        >
                                            <SelectTrigger className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-medium uppercase text-xs">
                                                <SelectValue placeholder={t("select_specialization")} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border bg-background shadow-xl">
                                                <SelectItem value="none" className="rounded-xl font-medium uppercase text-xs text-muted-foreground">
                                                    {t("no_specialization")}
                                                </SelectItem>
                                                {specialties.map((s: any) => {
                                                    const specName = typeof s === 'string' ? s : s.name;
                                                    return (
                                                        <SelectItem key={specName} value={specName} className="rounded-xl font-medium uppercase text-xs">
                                                            {specName}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    );
                                })()}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ltr:ml-1 rtl:mr-1">{t("rfid_uid")}</Label>
                                <Input
                                    value={formData.rfidUid}
                                    onChange={(e) => setFormData({ ...formData, rfidUid: e.target.value })}
                                    className="h-12 bg-muted/30 border-none rounded-2xl focus:bg-background transition-all font-mono"
                                    placeholder="e.g. 1A2B3C4D"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 sm:p-8 pt-4 flex-col-reverse sm:flex-row gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-12 px-6"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t("processing")}
                                </span>
                            ) : (
                                t("confirm")
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
