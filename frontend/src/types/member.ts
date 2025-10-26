export const MEMBERSHIP_TYPE_VALUES = [
  "عضو عادي",
  "عضو لجنة",
  "أمين القسم",
  "أمين مساعد",
  "سكرتير التنظيم",
  "سكرتير",
  "سكرتير عام مساعد",
  "سكرتير وحدة قاعدية",
  "سكرتير مساعد وحدة قاعدية",
  "سكرتير تنظيم وحدة قاعدية",
  "سكرتير عام وحدة قاعدية",
  "عضو مميز",
  "عضو مميز جداً",
] as const;

export type MembershipType = (typeof MEMBERSHIP_TYPE_VALUES)[number];

export const MEMBERSHIP_TYPE_KEY_MAP: Record<MembershipType, string> = {
  "عضو عادي": "regular",
  "عضو لجنة": "committee",
  "أمين القسم": "divisionSecretary",
  "أمين مساعد": "assistantSecretary",
  "سكرتير التنظيم": "organizationSecretary",
  "سكرتير": "secretary",
  "سكرتير عام مساعد": "assistantSecretaryGeneral",
  "سكرتير وحدة قاعدية": "baseUnitSecretary",
  "سكرتير مساعد وحدة قاعدية": "baseUnitAssistantSecretary",
  "سكرتير تنظيم وحدة قاعدية": "baseUnitOrganizationSecretary",
  "سكرتير عام وحدة قاعدية": "baseUnitSecretaryGeneral",
  "عضو مميز": "premium",
  "عضو مميز جداً": "vip",
};

const MEMBERSHIP_TYPE_LOOKUP: Record<string, MembershipType> = {
  regular: "عضو عادي",
  "عضو عادي": "عضو عادي",
  "عضو عادى": "عضو عادي",
  committee: "عضو لجنة",
  "عضو لجنة": "عضو لجنة",
  divisionsecretary: "أمين القسم",
  "أمين القسم": "أمين القسم",
  "امين القسم": "أمين القسم",
  assistantsecretary: "أمين مساعد",
  "أمين مساعد": "أمين مساعد",
  "امين مساعد": "أمين مساعد",
  organizationsecretary: "سكرتير التنظيم",
  "سكرتير التنظيم": "سكرتير التنظيم",
  secretary: "سكرتير",
  "سكرتير": "سكرتير",
  assistantsecretarygeneral: "سكرتير عام مساعد",
  "سكرتير عام مساعد": "سكرتير عام مساعد",
  baseunitsecretary: "سكرتير وحدة قاعدية",
  "سكرتير وحدة قاعدية": "سكرتير وحدة قاعدية",
  baseunitassistantsecretary: "سكرتير مساعد وحدة قاعدية",
  "سكرتير مساعد وحدة قاعدية": "سكرتير مساعد وحدة قاعدية",
  baseunitorganizationsecretary: "سكرتير تنظيم وحدة قاعدية",
  "سكرتير تنظيم وحدة قاعدية": "سكرتير تنظيم وحدة قاعدية",
  baseunitsecretarygeneral: "سكرتير عام وحدة قاعدية",
  "سكرتير عام وحدة قاعدية": "سكرتير عام وحدة قاعدية",
  premium: "عضو مميز",
  "عضو مميز": "عضو مميز",
  vip: "عضو مميز جداً",
  "عضو vip": "عضو مميز جداً",
  "عضو مميز جداً": "عضو مميز جداً",
};

export const RELIGION_VALUES = ["مسلم", "مسيحي"] as const;

export type Religion = (typeof RELIGION_VALUES)[number];

export const RELIGION_KEY_MAP: Record<Religion, "muslim" | "christian"> = {
  مسلم: "muslim",
  مسيحي: "christian",
};

const RELIGION_LOOKUP: Record<string, Religion> = {
  muslim: "مسلم",
  "مسلم": "مسلم",
  "مسلمه": "مسلم",
  christian: "مسيحي",
  "مسيحي": "مسيحي",
  "مسيحيه": "مسيحي",
};

export const normalizeMembershipType = (
  value: string | null | undefined,
): MembershipType => {
  if (!value) {
    return "عضو عادي";
  }
  const trimmed = value.trim();
  return (
    MEMBERSHIP_TYPE_LOOKUP[trimmed] ??
    MEMBERSHIP_TYPE_LOOKUP[trimmed.toLowerCase()] ??
    "عضو عادي"
  );
};

export const normalizeReligion = (
  value: string | null | undefined,
): Religion => {
  if (!value) {
    return "مسلم";
  }
  const trimmed = value.trim();
  return (
    RELIGION_LOOKUP[trimmed] ??
    RELIGION_LOOKUP[trimmed.toLowerCase()] ??
    "مسلم"
  );
};

export const getMembershipTypeTranslationKey = (
  value: MembershipType,
): string => MEMBERSHIP_TYPE_KEY_MAP[value] ?? "regular";

export const getReligionTranslationKey = (
  value: Religion,
): "muslim" | "christian" => RELIGION_KEY_MAP[value];

export interface Member {
  id: string;
  fullName: string;
  nationalId: string;
  gender: "male" | "female";
  phoneNumber: string;
  landlineNumber?: string;
  partyUnit?: string;
  email: string;
  membershipNumber: string;
  age: number;
  address: string;
  job: string;
  membershipType: MembershipType;
  religion: Religion;
  photo?: string;
  registrationDate: string;
  createdAt: string;
  updatedAt: string;
  status?: "active" | "inactive";
}

export interface MemberFormData {
  fullName: string;
  nationalId: string;
  gender: "male" | "female";
  phoneNumber: string;
  landlineNumber?: string;
  partyUnit?: string;
  email: string;
  membershipNumber: string;
  age: number;
  address: string;
  job: string;
  membershipType: MembershipType;
  religion: Religion;
  photo?: File | string;
}

export interface MemberFilters {
  search?: string;
  gender?: string;
  membershipType?: string;
  partyUnit?: string;
  ageMin?: number;
  ageMax?: number;
}

export interface MemberStats {
  totalMembers: number;
  maleMembers: number;
  femaleMembers: number;
  recentRegistrations: number;
}
