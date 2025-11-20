import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  Save,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  CreditCard,
  ArrowLeft,
  Edit,
  Eye,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import AnimatedSection from "../components/animations/AnimatedSection";
import AnimatedGroup from "../components/animations/AnimatedGroup";
import {
  MEMBERSHIP_TYPE_VALUES,
  RELIGION_VALUES,
  getMembershipTypeTranslationKey,
  getReligionTranslationKey,
  normalizeMembershipType,
  normalizeReligion,
  type MemberFormData,
  type MembershipType,
  type Member,
  type Religion,
} from "../types/member";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { addMember, updateMember } from "../slices/membersSlice";
import { useToastContext } from "../hooks/useToastContext";
import { useActivity } from "../contexts/activityContext";

const MEMBER_IMPORT_COLUMNS = [
  "name",
  "national_id",
  "gender",
  "dob",
  "phone",
  "address",
  "unit",
  "email",
  "membership_type",
  "membership_number",
  "religion",
  "job",
  "photo",
  "status",
  "financial_support",
  "notes",
] as const;

type MemberImportColumn = (typeof MEMBER_IMPORT_COLUMNS)[number];

type ImportRecord = Partial<Record<MemberImportColumn, string>>;

const COLUMN_ALIAS_MAP: Record<MemberImportColumn, string[]> = {
  name: ["name", "full_name", "fullname", "full name", "الاسم"],
  national_id: [
    "national_id",
    "national id",
    "nationalid",
    "ssn",
    "id_number",
    "id number",
    "الرقم القومي",
  ],
  gender: ["gender", "sex", "النوع"],
  dob: ["dob", "date_of_birth", "birthdate", "birth_date", "تاريخ الميلاد"],
  phone: [
    "phone",
    "phone_number",
    "phone number",
    "mobile",
    "mobile_number",
    "mobile number",
    "رقم الهاتف",
    "رقم الموبايل",
  ],
  address: ["address", "العنوان"],
  unit: ["unit", "party_unit", "party unit", "الوحدة"],
  email: ["email", "e-mail", "البريد الالكتروني", "البريد الإلكتروني"],
  membership_type: [
    "membership_type",
    "membership type",
    "نوع العضوية",
  ],
  membership_number: [
    "membership_number",
    "membership number",
    "رقم العضوية",
  ],
  religion: ["religion", "الديانة"],
  job: ["job", "occupation", "work", "الوظيفة"],
  photo: ["photo", "الصورة"],
  status: ["status", "الحالة"],
  financial_support: [
    "financial_support",
    "financial support",
    "الدعم المالي",
  ],
  notes: ["notes", "ملاحظات"],
};

const normalizeAliasKey = (value: unknown): MemberImportColumn | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!cleaned) {
    return null;
  }

  for (const column of MEMBER_IMPORT_COLUMNS) {
    if (COLUMN_ALIAS_MAP[column].some((alias) => alias.replace(/[\s-]+/g, "_") === cleaned)) {
      return column;
    }
  }

  return null;
};

const DataEntryForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToastContext();
  const { trackMemberActivity } = useActivity();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { list: members } = useSelector((state: RootState) => state.members);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<MemberFormData>({
    defaultValues: {
      fullName: "",
      nationalId: "",
      gender: "male",
      religion: "مسلم",
      phoneNumber: "",
      landlineNumber: "",
      partyUnit: "وراق الحضر",
      email: "",
      membershipNumber: "",
      age: 18,
      address: "",
      job: "",
      membershipType: "عضو عادي",
      photo: undefined,
    },
  });

  useEffect(() => {
    if (id) {
      // Check if this is view-only mode by checking URL search params or state
      const urlParams = new URLSearchParams(window.location.search);
      const viewMode = urlParams.get("mode") === "view";

      if (viewMode) {
        setIsViewOnly(true);
        setIsEditing(false);
      } else {
        setIsEditing(true);
        setIsViewOnly(false);
      }

      const member = members.find((m) => m.id === id);
      if (member) {
        setValue("fullName", member.fullName);
        setValue("nationalId", member.nationalId);
        setValue("gender", member.gender);
        setValue("religion", member.religion);
        setValue("phoneNumber", member.phoneNumber);
        setValue("landlineNumber", member.landlineNumber || "");
        setValue("partyUnit", member.partyUnit || "وراق الحضر");
        setValue("email", member.email);
        setValue("membershipNumber", member.membershipNumber);
        setValue("age", member.age);
        setValue("address", member.address);
        setValue("job", member.job);
        setValue("membershipType", member.membershipType);
        setValue("photo", member.photo ?? undefined);
        if (member.photo) {
          setPhotoPreview(member.photo);
        } else {
          setPhotoPreview("");
        }
      }
    } else {
      setIsEditing(false);
      setIsViewOnly(false);
      setValue("photo", undefined);
      setPhotoPreview("");
    }
  }, [id, setValue, members]);

  const onSubmit = async (data: MemberFormData) => {
    setFormError(null);
    setIsLoading(true);
    try {
      const photoValue =
        typeof data.photo === "string" && data.photo.length > 0
          ? data.photo
          : undefined;

      const baseMemberData: Omit<Member, 'id' | 'createdAt'> = {
        fullName: data.fullName,
        nationalId: data.nationalId,
        gender: data.gender,
        phoneNumber: data.phoneNumber,
        landlineNumber: data.landlineNumber,
        partyUnit: data.partyUnit,
        email: data.email,
        membershipNumber: data.membershipNumber,
        age: data.age,
        address: data.address,
        job: data.job,
        membershipType: data.membershipType,
        religion: data.religion,
        registrationDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        photo: photoValue,
      };

      let memberData: Member;

      if (isEditing && id) {
        const existingMember = members.find(m => m.id === id);
        if (existingMember) {
          // For editing, preserve the original ID, createdAt, and registrationDate
            memberData = {
              ...baseMemberData,
              id: id,
              createdAt: existingMember.createdAt,
              registrationDate: existingMember.registrationDate,
              photo: photoValue ?? existingMember.photo,
            };
        } else {
          throw new Error('Member not found for editing');
        }
      } else {
        // For adding new member
        memberData = {
          ...baseMemberData,
          id: `member_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
      }

      if (isEditing) {
        try {
          const originalMember = members.find(m => m.id === id);
          await dispatch(
            updateMember({
              id: id!, // Use the URL parameter id directly
              member: memberData, // Pass the full member data
            }),
          ).unwrap();

          // Track activity after successful update
          if (originalMember) {
            trackMemberActivity('edit', memberData, originalMember);
          }

          addToast({
            title: t("common.success"),
            message: t("members.updateSuccessWithName", {
              name: memberData.fullName,
            }),
            type: "success",
          });
        } catch (error) {
          console.error("Failed to update member", error);
          let errorMessage = t("members.updateDuplicateError");

          if (axios.isAxiosError(error)) {
            const errors = error.response?.data?.errors;
            const backendMessage =
              error.response?.data?.message ||
              error.response?.data?.error ||
              error.response?.data?.error_message;

            if (errors && typeof errors === "object") {
              const firstError = Object.values(errors)
                .flat()
                .find((msg) => typeof msg === "string");
              if (typeof firstError === "string") {
                errorMessage = firstError;
              }
            } else if (typeof backendMessage === "string") {
              errorMessage = backendMessage;
            }
          }

          addToast({
            title: t("common.error"),
            message: errorMessage,
            type: "error",
          });
          setFormError(errorMessage);
          return;
        }
      } else {
        try {
          await dispatch(addMember(memberData)).unwrap();

          // Track activity after successful add
          trackMemberActivity('add', memberData);

          addToast({
            title: t("common.success"),
            message: t("members.addSuccessWithName", {
              name: memberData.fullName,
            }),
            type: "success",
          });
        } catch (error) {
          console.error("Failed to add member", error);
          let errorMessage = t("members.addDuplicateError");

          if (axios.isAxiosError(error)) {
            const errors = error.response?.data?.errors;
            const backendMessage =
              error.response?.data?.message ||
              error.response?.data?.error ||
              error.response?.data?.error_message;

            if (errors && typeof errors === "object") {
              const firstError = Object.values(errors)
                .flat()
                .find((msg) => typeof msg === "string");
              if (typeof firstError === "string") {
                errorMessage = firstError;
              }
            } else if (typeof backendMessage === "string") {
              errorMessage = backendMessage;
            }
          }

          addToast({
            title: t("common.error"),
            message: errorMessage,
            type: "error",
          });
          setFormError(errorMessage);
          return;
        }
      }
      navigate("/members");
    } catch {
      addToast({
        title: t("common.error"),
        message: t("messages.saveError"),
        type: "error",
      });
      setFormError(t("messages.saveError"));
    } finally {
      setIsLoading(false);
    }
  };

  const processImportExcel = async (file: File) => {
    console.log("=== EXCEL IMPORT START ===");
    console.log("File:", file.name, "Size:", file.size, "Type:", file.type);
    setIsImporting(true);

    try {
      const XLSX = await import("xlsx");
      const fileName = file.name.toLowerCase();
      const isCsv = fileName.endsWith(".csv") || file.type === "text/csv";
      const fileContent = isCsv ? await file.text() : await file.arrayBuffer();
      const workbook = XLSX.read(fileContent, { type: isCsv ? "string" : "array" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: "",
        blankrows: false,
        raw: true,
      });

      console.log("Excel data parsed:", jsonData);

      if (jsonData.length === 0) {
        addToast({
          title: t("common.warning"),
          message: t("messages.fileEmpty"),
          type: "warning",
        });
        return;
      }

      const { headerRowIndex, headerMap } = detectHeaderRow(jsonData as unknown[][]);
      const dataRow = findFirstDataRow(
        jsonData as unknown[][],
        headerRowIndex >= 0 ? headerRowIndex + 1 : 0,
      );

      if (!dataRow || dataRow.length === 0) {
        addToast({
          title: t("common.warning"),
          message: "لم يتم العثور على بيانات صالحة في الملف",
          type: "warning",
        });
        return;
      }

      console.log("Raw data row:", dataRow);

      const importRecord = mapRowToImportRecord(dataRow, headerMap);
      const mappedData = mapRecordToForm(importRecord);

      if (!mappedData) {
        addToast({
          title: t("common.error"),
          message: "فشل في قراءة بيانات الملف. تأكد من تنسيق الملف.",
          type: "error",
        });
        return;
      }

      if (!mappedData.fullName || !mappedData.nationalId || !mappedData.phoneNumber || !mappedData.email) {
        addToast({
          title: t("common.warning"),
          message:
            "البيانات المطلوبة مفقودة: الاسم، الرقم القومي، رقم الهاتف، البريد الإلكتروني",
          type: "warning",
        });
        return;
      }

      populateFormWithExcelData(mappedData);

      console.log("Form populated with Excel data:", mappedData);

      addToast({
        title: t("common.success"),
        message: t("messages.importSuccess", { fileName: file.name }),
        type: "success",
      });
    } catch (error) {
      console.error("Excel import error:", error);
      addToast({
        title: t("common.error"),
        message: `فشل في استيراد الملف: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
        type: "error",
      });
    } finally {
      console.log("=== EXCEL IMPORT END ===");
      setIsImporting(false);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    e.target.value = "";
  };

  const cancelImport = () => {
    if (isProcessingImport) return;
    setPendingImportFile(null);
  };

  const confirmImport = async () => {
    if (!pendingImportFile) return;
    setIsProcessingImport(true);
    try {
      await processImportExcel(pendingImportFile);
    } finally {
      setIsProcessingImport(false);
      setPendingImportFile(null);
    }
  };

  const detectHeaderRow = (
    rows: unknown[][],
  ): { headerRowIndex: number; headerMap: Record<number, MemberImportColumn> } => {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const headerMap: Record<number, MemberImportColumn> = {};
      row.forEach((cell, index) => {
        const normalized = normalizeAliasKey(cell);
        if (normalized && headerMap[index] === undefined) {
          headerMap[index] = normalized;
        }
      });

      if (Object.keys(headerMap).length >= 5) {
        return { headerRowIndex: i, headerMap };
      }
    }

    const fallbackMap: Record<number, MemberImportColumn> = {};
    MEMBER_IMPORT_COLUMNS.forEach((column, index) => {
      fallbackMap[index] = column;
    });

    return { headerRowIndex: -1, headerMap: fallbackMap };
  };

  const findFirstDataRow = (rows: unknown[][], startIndex: number): unknown[] | null => {
    for (let i = Math.max(startIndex, 0); i < rows.length; i++) {
      const row = rows[i];
      if (
        Array.isArray(row) &&
        row.some(
          (cell) => cell !== null && cell !== undefined && cell.toString().trim().length > 0,
        )
      ) {
        return row as unknown[];
      }
    }
    return null;
  };

  const mapRowToImportRecord = (
    row: unknown[],
    headerMap: Record<number, MemberImportColumn>,
  ): ImportRecord => {
    const record: ImportRecord = {};

    Object.entries(headerMap).forEach(([indexStr, column]) => {
      const index = Number(indexStr);
      const rawValue = row[index];
      record[column] =
        rawValue !== undefined && rawValue !== null ? rawValue.toString().trim() : "";
    });

    return record;
  };

  const mapRecordToForm = (
    record: ImportRecord,
  ):
    | {
        fullName: string;
        nationalId: string;
        gender: "male" | "female";
        phoneNumber: string;
        partyUnit: string;
        email: string;
        membershipNumber: string;
        age: number;
        address: string;
        job: string;
        membershipType: MembershipType;
        religion: Religion;
      }
    | null => {
    try {
      const age = record.dob ? calculateAgeFromDob(record.dob) : undefined;

      return {
        fullName: record.name ?? "",
        nationalId: record.national_id ?? "",
        gender: parseGenderFromExcel(record.gender),
        religion: parseReligionFromExcel(record.religion),
        age: age ?? 18,
        phoneNumber: record.phone ?? "",
        email: record.email ?? "",
        job: record.job ?? "",
        address: record.address ?? "",
        partyUnit: parsePartyUnitFromExcel(record.unit),
        membershipNumber: record.membership_number ?? "",
        membershipType: parseMembershipTypeFromExcel(record.membership_type),
      };
    } catch (error) {
      console.error("Error mapping Excel data:", error);
      return null;
    }
  };

  // Helper functions for parsing Excel data
  const parseGenderFromExcel = (value: unknown): "male" | "female" => {
    const genderStr = value ? value.toString().trim().toLowerCase() : "";
    if (["ذكر", "male", "m"].includes(genderStr)) {
      return "male";
    }
    if (["أنثى", "انثى", "female", "f"].includes(genderStr)) {
      return "female";
    }
    return "male";
  };

  const parseReligionFromExcel = (value: unknown): Religion =>
    normalizeReligion(value ? value.toString() : "");

  const parsePartyUnitFromExcel = (value: unknown): string => {
    const unitStr = value ? value.toString().trim() : "";
    const validUnits = ["وراق الحضر", "وراق العرب", "جزيرة محمد", "طناش", "عزبة المفتى", "عزبة الخلايفة"];

    if (unitStr && validUnits.includes(unitStr)) {
      return unitStr;
    }

    return "وراق الحضر";
  };

  const calculateAgeFromDob = (value: unknown): number => {
    const clampAge = (age: number) => Math.max(18, Math.min(80, age));

    if (!value) {
      return 18;
    }

    const toDate = (): Date | null => {
      if (value instanceof Date) {
        return value;
      }

      if (typeof value === "number" && Number.isFinite(value)) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const asDate = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        return Number.isNaN(asDate.getTime()) ? null : asDate;
      }

      const parsed = new Date(value.toString());
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const dobDate = toDate();
    if (!dobDate) {
      return 18;
    }

    const diffMs = Date.now() - dobDate.getTime();
    const age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    if (!Number.isFinite(age) || age <= 0) {
      return 18;
    }

    return clampAge(age);
  };

  const parseMembershipTypeFromExcel = (value: unknown): MembershipType =>
    normalizeMembershipType(value ? value.toString() : "");

  // Populate form with Excel data
  const populateFormWithExcelData = (data: {
    fullName: string;
    nationalId: string;
    gender: "male" | "female";
    phoneNumber: string;
    partyUnit: string;
    email: string;
    membershipNumber: string;
    age: number;
    address: string;
    job: string;
    membershipType: MembershipType;
    religion: Religion;
  }) => {
    setValue("fullName", data.fullName);
    setValue("nationalId", data.nationalId);
    setValue("gender", data.gender);
    setValue("phoneNumber", data.phoneNumber);
    setValue("partyUnit", data.partyUnit);
    setValue("email", data.email);
    setValue("membershipNumber", data.membershipNumber);
    setValue("age", data.age);
    setValue("address", data.address);
    setValue("job", data.job);
    setValue("membershipType", data.membershipType);
    setValue("religion", data.religion);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreview(result);
        setValue("photo", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearForm = () => {
    reset({
      fullName: "",
      nationalId: "",
      gender: "male",
      religion: "مسلم",
      phoneNumber: "",
      email: "",
      membershipNumber: "",
      age: 18,
      address: "",
      job: "",
      membershipType: "عضو عادي",
      partyUnit: "وراق الحضر",
      photo: undefined,
    });
    setPhotoPreview("");
    setIsEditing(false);
  };

  const genderOptions = [
    { value: "male", label: t("common.male") },
    { value: "female", label: t("common.female") },
  ];

  const religionOptions = RELIGION_VALUES.map((value) => ({
    value,
    label: t(`common.${getReligionTranslationKey(value)}`),
  }));

  const partyUnitOptions = [
    { value: "وراق الحضر", label: "وراق الحضر" },
    { value: "وراق العرب", label: "وراق العرب" },
    { value: "جزيرة محمد", label: "جزيرة محمد" },
    { value: "طناش", label: "طناش" },
    { value: "عزبة المفتى", label: "عزبة المفتى" },
    { value: "عزبة الخلايفة", label: "عزبة الخلايفة" },
  ];

  const membershipTypeOptions = MEMBERSHIP_TYPE_VALUES.map((value) => ({
    value,
    label: t(
      `members.memberTypes.${getMembershipTypeTranslationKey(value)}`,
    ),
  }));

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-background-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 lg:p-8">
          {/* Import/Export Buttons */}
          {!isViewOnly && (
            <AnimatedSection className="flex flex-wrap gap-3 mb-6" delay={0.1}>
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportFileChange}
                  className="hidden"
                  disabled={isImporting}
                />
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("common.import")}
                </Button>
              </label>
            </AnimatedSection>
          )}

          {/* Header */}
          <AnimatedSection
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0"
            delay={0.2}
          >
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
                {isViewOnly
                  ? t("members.viewMember")
                  : isEditing
                    ? t("members.editMember")
                    : t("members.addMember")}
              </h1>
              <p className="text-gray-600 dark:text-dark-text-secondary mt-2">
                {isViewOnly
                  ? t("members.viewMemberDescription")
                  : t("app.subtitle")}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                onClick={() => navigate("/members")}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                {t("common.back")}
              </Button>
              {isViewOnly && (
                <Button
                  variant="primary"
                  onClick={() => {
                    // Switch to edit mode
                    setIsViewOnly(false);
                    setIsEditing(true);
                    // Update URL to remove view mode
                    navigate(`/entry/${id}`, { replace: true });
                  }}
                  leftIcon={<Edit className="h-4 w-4" />}
                >
                  {t("common.edit")}
                </Button>
              )}
            </div>
          </AnimatedSection>

          {/* Form */}
          <Card className="p-4 lg:p-8">
            {formError && (
              <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-300">
                {formError}
              </div>
            )}
            {Object.keys(errors).length > 0 && (
              <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">
                {t("messages.formErrors")}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {isViewOnly && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                    <Eye className="h-5 w-5" />
                    <span className="font-medium">
                      {t("members.viewOnlyMode")}
                    </span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    {t("members.viewOnlyDescription")}
                  </p>
                </div>
              )}
              <AnimatedGroup
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
                staggerDelay={0.05}
                direction="up"
                distance={10}
              >
                <Input
                  label={t("members.fullName")}
                  type="text"
                  placeholder={t("members.fullName")}
                  leftIcon={<User className="h-5 w-5" />}
                  fullWidth
                  required
                  disabled={isViewOnly}
                  {...register("fullName", {
                    required: t("forms.validation.required"),
                    minLength: {
                      value: 3,
                      message: t("forms.validation.minLength", { min: 3 }),
                    },
                  })}
                  error={errors.fullName?.message}
                />

                <Input
                  label={t("members.nationalId")}
                  type="text"
                  placeholder={t("members.nationalId")}
                  leftIcon={<CreditCard className="h-5 w-5" />}
                  fullWidth
                  required
                  disabled={isViewOnly}
                  {...register("nationalId", {
                    required: t("forms.validation.required"),
                    pattern: {
                      value: /^[23]\d{13}$/,
                      message: t("forms.validation.nationalId"),
                    },
                  })}
                  error={errors.nationalId?.message}
                />

                <Controller
                  name="gender"
                  control={control}
                  rules={{ required: t("forms.validation.required") }}
                  render={({ field, fieldState }) => (
                    <Select
                      label={t("members.gender")}
                      options={genderOptions}
                      placeholder={t("common.select")}
                      fullWidth
                      required
                      disabled={isViewOnly}
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  name="religion"
                  control={control}
                  rules={{ required: t("forms.validation.required") }}
                  render={({ field, fieldState }) => (
                    <Select
                      label={t("members.religion")}
                      options={religionOptions}
                      placeholder={t("common.select")}
                      fullWidth
                      required
                      disabled={isViewOnly}
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Input
                  label={t("members.age")}
                  type="number"
                  placeholder={t("members.age")}
                  leftIcon={<Calendar className="h-5 w-5" />}
                  fullWidth
                  required
                  disabled={isViewOnly}
                  min={18}
                  max={80}
                  {...register("age", {
                    required: t("forms.validation.required"),
                    min: {
                      value: 18,
                      message: t("forms.validation.age"),
                    },
                    max: {
                      value: 80,
                      message: t("forms.validation.age"),
                    },
                    valueAsNumber: true,
                  })}
                  error={errors.age?.message}
                />

                <Input
                  label={t("members.phoneNumber")}
                  type="tel"
                  placeholder={t("members.phoneNumber")}
                  leftIcon={<Phone className="h-5 w-5" />}
                  fullWidth
                  required
                  disabled={isViewOnly}
                  {...register("phoneNumber", {
                    required: t("forms.validation.required"),
                    pattern: {
                      value: /^01\d{9}$/,
                      message: t("forms.validation.phone"),
                    },
                  })}
                  error={errors.phoneNumber?.message}
                />

                <Input
                  label={t("members.emailAddress")}
                  type="email"
                  placeholder={t("members.emailAddress")}
                  leftIcon={<Mail className="h-5 w-5" />}
                  fullWidth
                  required
                  disabled={isViewOnly}
                  allowedEmailDomains={["gmail.com", "outlook.sa.com"]}
                  {...register("email", {
                    required: t("forms.validation.required"),
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: t("forms.validation.email"),
                    },
                  })}
                  error={errors.email?.message}
                />

                <Input
                  label={t("members.job")}
                  type="text"
                  placeholder={t("members.job")}
                  leftIcon={<Building className="h-5 w-5" />}
                  fullWidth
                  required
                  disabled={isViewOnly}
                  {...register("job", {
                    required: t("forms.validation.required"),
                  })}
                  error={errors.job?.message}
                />

                <Input
                  label={t("members.address")}
                  type="text"
                  placeholder={t("members.address")}
                  leftIcon={<MapPin className="h-5 w-5" />}
                  fullWidth
                  required
                  disabled={isViewOnly}
                  {...register("address", {
                    required: t("forms.validation.required"),
                  })}
                  error={errors.address?.message}
                />

                <Controller
                  name="partyUnit"
                  control={control}
                  rules={{ required: t("forms.validation.required") }}
                  render={({ field, fieldState }) => (
                    <Select
                      label={t("members.partyUnit")}
                      options={partyUnitOptions}
                      placeholder={t("common.select")}
                      fullWidth
                      required
                      disabled={isViewOnly}
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Input
                  label={t("members.membershipNumber")}
                  type="text"
                  placeholder={t("members.membershipNumber")}
                  leftIcon={<User className="h-5 w-5" />}
                  fullWidth
                  required
                  disabled={isViewOnly}
                  {...register("membershipNumber", {
                    required: t("forms.validation.required"),
                  })}
                  error={errors.membershipNumber?.message}
                />

                <Controller
                  name="membershipType"
                  control={control}
                  rules={{ required: t("forms.validation.required") }}
                  render={({ field, fieldState }) => (
                    <Select
                      label={t("members.membershipType")}
                      options={membershipTypeOptions}
                      placeholder={t("common.select")}
                      fullWidth
                      required
                      disabled={isViewOnly}
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </AnimatedGroup>

              {/* Photo Upload */}
              <AnimatedSection className="space-y-4" delay={0.4}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("members.memberPhoto")}
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      disabled={isViewOnly}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900 dark:file:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  {photoPreview && (
                    <div className="flex items-center space-x-2">
                      <img
                        src={photoPreview}
                        alt={t("members.photoPreview")}
                        className="w-16 h-16 rounded-lg object-cover border border-gray-300 dark:border-gray-600"
                      />
                      {!isViewOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPhotoPreview("");
                            setValue("photo", undefined);
                          }}
                          leftIcon={<X className="h-4 w-4" />}
                        >
                          {t("common.remove")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </AnimatedSection>

              {/* Form Actions */}
              {!isViewOnly && (
                <AnimatedSection
                  className="flex flex-col sm:flex-row sm:justify-end sm:space-x-4 space-y-3 sm:space-y-0 pt-6 border-t border-gray-200 dark:border-gray-700"
                  delay={0.5}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={clearForm}
                    leftIcon={<X className="h-4 w-4" />}
                  >
                    {t("members.clearForm")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    {isEditing ? t("common.save") : t("members.saveMember")}
                  </Button>
                </AnimatedSection>
              )}
            </form>
          </Card>
        </main>
      </div>
      {pendingImportFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-dark-background-primary">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("members.entry.importConfirmTitle")}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {t("members.entry.importConfirmMessage", {
                  fileName: pendingImportFile.name,
                })}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={cancelImport}
                disabled={isProcessingImport}
              >
                {t("members.entry.importCancel")}
              </Button>
              <Button
                variant="primary"
                onClick={confirmImport}
                isLoading={isProcessingImport}
              >
                {t("members.entry.importConfirmButton")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DataEntryForm;
