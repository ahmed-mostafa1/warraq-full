import * as XLSX from "xlsx";
import {
  RELIGION_VALUES,
  normalizeMembershipType,
  normalizeReligion,
  type Member,
  type MembershipType,
} from "../types/member";

const HEADER_ALIASES = {
  fullName: [
    "name",
    "full_name",
    "fullname",
    "full name",
    "member_name",
    'O\u0015U,O\u0015O3U. O"O\u0015U,U�O\u0015U.U,',
  ],
  nationalId: [
    "national_id",
    "national id",
    "nationalid",
    "id_number",
    "id",
    "identity",
    "رقم قومي",
    "الرقم القومي",
    "O\u0015U,O�U,U. O\u0015U,U,U^U.US",
  ],
  gender: ["gender", "sex", "O\u0015U,O�U+O3"],
  dob: ["dob", "date_of_birth", "birthdate", "birth_date", "تاريخ الميلاد"],
  age: ["age", "O\u0015U,O1U.O�"],
  phoneNumber: [
    "phone",
    "phone_number",
    "phone number",
    "mobile",
    "mobile_number",
    "O�U,U. O\u0015U,U�O\u0015O�U?",
  ],
  landlineNumber: [
    "landline",
    "landline_number",
    "telephone",
    "telephone_number",
    "O�U,U. O\u0015U,U�O\u0015O�U? O\u0015U,O�O�O\u0014US",
  ],
  email: ["email", "email_address", 'O\u0015U,O"O�USO_ O\u0015U,O�U,U�O�O�U^U+US'],
  job: ["job", "occupation", "role", "المهنة", "O\u0015U,U^O,USU?Oc"],
  address: ["address", "العنوان", "O\u0015U,O1U+U^O\u0015U+"],
  partyUnit: [
    "unit",
    "party_unit",
    "party unit",
    "organization_unit",
    "O\u0015U,U^O-O_Oc O\u0015U,O-O�O\"USOc",
  ],
  membershipNumber: [
    "membership_number",
    "membership number",
    "membershipno",
    "member_number",
    "O�U,U. O\u0015U,O1O\u0014U^USOc",
  ],
  membershipType: [
    "membership_type",
    "membership type",
    "member_type",
    "U+U^O1 O\u0015U,O1O\u0014U^USOc",
  ],
  religion: ["religion", "الديانة", "O\u0015U,O_USO\u0015U+Oc"],
  photo: ["photo", "image", "avatar"],
  status: ["status", "الحالة"],
  notes: ["notes", "note", "ملاحظات"],
  registrationDate: [
    "registration_date",
    "registered_at",
    "created_at",
    "registration date",
    "O�O\u0015O�USOr O\u0015U,O�O3O�USU,",
  ],
  financialSupport: ["financial_support", "financial support"],
} as const;

const FEMALE_GENDER_VALUES = ["female", "f", "انثى", "أنثى", "امرأة", "O\u0015U+O\u0015U%"];
const MALE_GENDER_PATTERN = ["male", "m", "ذكر", "O\u0015U�O�"];

export class ExcelService {
  // Export members to Excel
  static async exportToExcel(
    members: Member[],
    filename: string = "أعضاء_الحزب.xlsx",
  ): Promise<void> {
    this.exportMembers(members, filename);
  }

  static exportMembers(
    members: Member[],
    filename: string = "أعضاء_الحزب.xlsx",
  ): void {
    try {
      const workbook = XLSX.utils.book_new();
      const exportData = members.map((member) => ({
        "الاسم بالكامل": member.fullName,
        "الرقم القومي": member.nationalId,
        الجنس: member.gender === "male" ? "ذكر" : "أنثى",
        الديانة: normalizeReligion(member.religion),
        العمر: member.age,
        "رقم الهاتف": member.phoneNumber,
        "البريد الإلكتروني": member.email,
        الوظيفة: member.job,
        العنوان: member.address,
        "الوحدة الحزبية": member.partyUnit || "",
        "رقم العضوية": member.membershipNumber,
        "نوع العضوية": this.getMembershipTypeText(member.membershipType),
        "تاريخ التسجيل": new Date(member.registrationDate).toLocaleDateString(
          "ar-EG",
        ),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet["!cols"] = [
        { wch: 20 }, // الاسم بالكامل
        { wch: 15 }, // الرقم القومي
        { wch: 8 },  // الجنس
        { wch: 10 }, // الديانة
        { wch: 6 },  // العمر
        { wch: 15 }, // رقم الهاتف
        { wch: 25 }, // البريد الإلكتروني
        { wch: 20 }, // الوظيفة
        { wch: 30 }, // العنوان
        { wch: 15 }, // الوحدة الحزبية
        { wch: 12 }, // رقم العضوية
        { wch: 12 }, // نوع العضوية
        { wch: 15 }, // تاريخ التسجيل
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "أعضاء الحزب");
      XLSX.writeFile(workbook, filename);
    } catch {
      throw new Error("فشل في تصدير البيانات");
    }
  }

  static async importMembers(file: File): Promise<Member[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const data = new Uint8Array(
            (e.target?.result as ArrayBufferLike) || new ArrayBuffer(0),
          );
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (!jsonData || jsonData.length === 0) {
            throw new Error("الملف فارغ أو لا يحتوي على بيانات");
          }

          const members: Member[] = [];
          (jsonData as Record<string, unknown>[]).forEach(
            (row: Record<string, unknown>, index: number) => {
              try {
                const member = this.parseMemberFromExcel(row, index);
                members.push(member);
              } catch (error) {
                console.error(`Error parsing row ${index + 1}:`, error);
              }
            },
          );

          if (members.length === 0) {
            reject(new Error("لم يتم العثور على بيانات صحيحة في الملف"));
          } else {
            resolve(members);
          }
        } catch (error) {
          reject(
            new Error(
              `فشل في استيراد البيانات: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
            ),
          );
        }
      };
      reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
      reader.readAsArrayBuffer(file);
    });
  }

  static createTemplate(): void {
    const templateData = [
      {
        "الاسم بالكامل": "مثال: أحمد محمد علي",
        "الرقم القومي": "12345678901234",
        الجنس: "ذكر",
        الديانة: "مسلم",
        العمر: "25",
        "رقم الهاتف": "01234567890",
        "البريد الإلكتروني": "example@email.com",
        الوظيفة: "مثال: مهندس",
        العنوان: "مثال: القاهرة، مصر",
        "الوحدة الحزبية": "وراق الحضر",
        "رقم العضوية": "M001",
        "نوع العضوية": "عضو عادي",
        "تاريخ التسجيل": new Date().toLocaleDateString("ar-EG"),
      },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 20 }, // الاسم بالكامل
      { wch: 15 }, // الرقم القومي
      { wch: 8 },  // الجنس
      { wch: 10 }, // الديانة
      { wch: 6 },  // العمر
      { wch: 15 }, // رقم الهاتف
      { wch: 25 }, // البريد الإلكتروني
      { wch: 20 }, // الوظيفة
      { wch: 30 }, // العنوان
      { wch: 15 }, // الوحدة الحزبية
      { wch: 12 }, // رقم العضوية
      { wch: 12 }, // نوع العضوية
      { wch: 15 }, // تاريخ التسجيل
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "قالب_أعضاء_الحزب");
    XLSX.writeFile(workbook, "قالب_استيراد_أعضاء_الحزب.xlsx");
  }

  private static parseMemberFromExcel(
    row: Record<string, unknown>,
    index: number,
  ): Member {
    const normalizedRow = this.normalizeRowKeys(row);

    const fullName = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.fullName),
    );
    if (!fullName) {
      throw new Error("O\u0015U,O\u0015O3U. O\"O\u0015U,U?O\u0015U.U, O?USO? O?O-USO-");
    }

    const rawNationalId = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.nationalId),
    );
    const cleanNationalId = this.extractDigits(rawNationalId);
    if (cleanNationalId.length !== 14) {
      throw new Error("O\u0015U,O?U,U. O\u0015U,U,U^U.US USO?O\" O?U+ USU?U^U+ 14 O?U,U.");
    }

    const email = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.email),
    );
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("O?U+O3USU, O\u0015U,O\"O?USO_ O\u0015U,O?U,U?O?O?U^U+US O?USO? O?O-USO-");
    }

    const rawPhoneNumber = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.phoneNumber),
    );
    const cleanPhoneNumber = this.extractDigits(rawPhoneNumber);
    if (!/^01\d{9}$/.test(cleanPhoneNumber)) {
      throw new Error("O?U,U. O\u0015U,U?O\u0015O?U? O?USO? O?O-USO-");
    }

    const rawLandline = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.landlineNumber),
    );
    const landlineDigits = this.extractDigits(rawLandline);
    const landlineNumber = landlineDigits.length > 0 ? landlineDigits : undefined;

    const religionValue = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.religion),
    );
    if (!religionValue) {
      throw new Error("O\u0015U,O_USO\u0015U+Oc USO?O\" O?U+ O?U?U^U+ U.O3U,U. O?U^ U.O3USO-US");
    }

    const normalizedReligion = normalizeReligion(religionValue);
    if (!RELIGION_VALUES.includes(normalizedReligion)) {
      throw new Error("O\u0015U,O_USO\u0015U+Oc USO?O\" O?U+ O?U?U^U+ U.O3U,U. O?U^ U.O3USO-US");
    }

    const partyUnit = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.partyUnit),
    );

    const membershipNumberFromSheet = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.membershipNumber),
    );
    const membershipNumber =
      membershipNumberFromSheet || `M${Date.now()}${index}`;

    const job = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.job),
    );
    const address = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.address),
    );
    const photo = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.photo),
    );

    const membershipTypeRaw = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.membershipType),
    );
    const membershipType = normalizeMembershipType(membershipTypeRaw);

    const genderRaw = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.gender),
    );
    const gender = this.normalizeGenderValue(genderRaw);

    const dobValue = this.getCellValue(normalizedRow, HEADER_ALIASES.dob);
    const ageValue = this.getCellValue(normalizedRow, HEADER_ALIASES.age);
    const age = this.resolveAge(dobValue, ageValue);

    const registrationDateValue = this.getCellValue(
      normalizedRow,
      HEADER_ALIASES.registrationDate,
    );
    const registrationDate =
      this.parseDateValue(registrationDateValue)?.toISOString() ??
      new Date().toISOString();

    const statusValue = this.toStringValue(
      this.getCellValue(normalizedRow, HEADER_ALIASES.status),
    );
    const status = this.normalizeStatus(statusValue);

    return {
      id: `imported_${Date.now()}_${index}`,
      fullName,
      nationalId: cleanNationalId,
      gender,
      phoneNumber: cleanPhoneNumber,
      landlineNumber,
      partyUnit: partyUnit || undefined,
      email,
      membershipNumber,
      age,
      address,
      job,
      membershipType,
      religion: normalizedReligion,
      photo: photo || undefined,
      registrationDate,
      createdAt: registrationDate,
      updatedAt: registrationDate,
      status,
    };
  }
  private static getMembershipTypeText(type: string): MembershipType | string {
    return normalizeMembershipType(type);
  }

  private static normalizeRowKeys(
    row: Record<string, unknown>,
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    Object.entries(row).forEach(([rawKey, value]) => {
      if (typeof rawKey !== "string") {
        return;
      }

      const trimmedKey = rawKey.trim();
      const lowerKey = trimmedKey.toLowerCase();
      if (normalized[lowerKey] === undefined) {
        normalized[lowerKey] = value;
      }

      const normalizedKey = this.normalizeHeaderKey(trimmedKey);
      if (normalizedKey && normalized[normalizedKey] === undefined) {
        normalized[normalizedKey] = value;
      }
    });

    return normalized;
  }

  private static normalizeHeaderKey(key: string): string {
    return key
      .trim()
      .toLowerCase()
      .replace(/[\s_\-]/g, "")
      .replace(/["',\.]/g, "");
  }

  private static getCellValue(
    row: Record<string, unknown>,
    candidates: readonly string[],
  ): unknown {
    for (const candidate of candidates) {
      const normalizedKey = this.normalizeHeaderKey(candidate);
      if (row[normalizedKey] !== undefined) {
        return row[normalizedKey];
      }

      const lowerKey = candidate.trim().toLowerCase();
      if (row[lowerKey] !== undefined) {
        return row[lowerKey];
      }
    }

    return undefined;
  }

  private static toStringValue(value: unknown): string {
    if (value === undefined || value === null) {
      return "";
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }

    return String(value).trim();
  }

  private static extractDigits(value: string): string {
    return value.replace(/\D/g, "");
  }

  private static normalizeGenderValue(value: string): "male" | "female" {
    if (!value) {
      return "male";
    }

    const normalized = value.trim().toLowerCase();
    if (
      FEMALE_GENDER_VALUES.some(
        (candidate) => candidate.toLowerCase() === normalized,
      )
    ) {
      return "female";
    }

    if (
      MALE_GENDER_PATTERN.some(
        (candidate) => candidate.toLowerCase() === normalized,
      )
    ) {
      return "male";
    }

    return normalized.startsWith("f") ? "female" : "male";
  }

  private static resolveAge(
    dobValue: unknown,
    fallbackAgeValue: unknown,
  ): number {
    const dobDate = this.parseDateValue(dobValue);
    if (dobDate) {
      return this.calculateAge(dobDate);
    }

    const fallbackAge = Number(this.toStringValue(fallbackAgeValue));
    if (Number.isFinite(fallbackAge) && fallbackAge > 0) {
      return Math.min(120, Math.max(1, Math.round(fallbackAge)));
    }

    return 18;
  }

  private static parseDateValue(value: unknown): Date | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      if (XLSX.SSF && typeof XLSX.SSF.parse_date_code === "function") {
        const excelDate = XLSX.SSF.parse_date_code(value);
        if (excelDate) {
          return new Date(excelDate.y, (excelDate.m ?? 1) - 1, excelDate.d ?? 1);
        }
      }
    }

    const stringValue = this.toStringValue(value);
    if (!stringValue) {
      return null;
    }

    const timestamp = Date.parse(stringValue);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp);
    }

    return null;
  }

  private static calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < dob.getDate())
    ) {
      age--;
    }

    return Math.min(120, Math.max(1, age));
  }

  private static normalizeStatus(
    value: string,
  ): "active" | "inactive" | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (
      normalized === "inactive" ||
      normalized === "0" ||
      normalized.includes("???") ||
      normalized.includes("?????")
    ) {
      return "inactive";
    }

    if (normalized === "active" || normalized === "1") {
      return "active";
    }

    return undefined;
  }
}
