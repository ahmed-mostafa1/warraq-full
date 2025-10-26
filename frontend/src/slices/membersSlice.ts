import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
  normalizeMembershipType,
  normalizeReligion,
  type Member,
  type MemberStats,
} from "../types/member";
import {
  listMembers,
  createMember as createMemberApi,
  updateMember as updateMemberApi,
  deleteMember as deleteMemberApi,
  type ApiMember,
  type MemberPayload,
} from "../services/members";
import { CsvService } from "../services/enhancedCsvService";
import { getStats, type StatsDTO } from "../services/stats";
import type { MembersQueryParams } from "../services/members";

const mapApiMemberToMember = (member: ApiMember): Member => {
  const membershipType = normalizeMembershipType(member.membership_type);
  const createdAt = member.created_at ?? new Date().toISOString();
  const updatedAt = member.updated_at ?? createdAt;
  const dob = member.dob ? new Date(member.dob) : null;

  const age = dob
    ? Math.max(0, Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)))
    : 0;

  const gender =
    member.gender === "female" || member.gender === "أنثى"
      ? "female"
      : "male";

  const religion = normalizeReligion(member.religion);

  const fallbackId = `api-member-${member.national_id ?? Date.now()}`;

  return {
    id: String(member.id ?? fallbackId),
    fullName: member.name ?? "",
    nationalId: member.national_id ?? "",
    gender,
    phoneNumber: member.phone ?? "",
    landlineNumber: "",
    partyUnit: member.unit ?? "",
    email: member.email ?? "",
    membershipNumber: member.membership_number ?? "",
    age,
    address: member.address ?? "",
    job: member.job ?? "",
    membershipType,
    religion,
    photo: member.photo ?? undefined,
    registrationDate: createdAt,
    createdAt,
    updatedAt,
  };
};

const emptyToNull = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const ageToDob = (age: number | string | null | undefined): string | null => {
  if (age === null || age === undefined) {
    return null;
  }

  const numericAge = typeof age === "string" ? Number(age) : age;

  if (!Number.isFinite(numericAge)) {
    return null;
  }

  const sanitizedAge = Math.max(1, Math.floor(numericAge));

  if (sanitizedAge <= 0) {
    return null;
  }

  const today = new Date();
  const birthDate = new Date(
    today.getFullYear() - sanitizedAge,
    today.getMonth(),
    today.getDate(),
  );

  return birthDate.toISOString().split("T")[0];
};

const mapMemberToApiPayload = (member: Partial<Member>): MemberPayload => {
  const payload: MemberPayload = {
    name: member.fullName ?? "",
    national_id: emptyToNull(member.nationalId),
    gender: member.gender ?? null,
    religion: member.religion,
    phone: emptyToNull(member.phoneNumber),
    address: emptyToNull(member.address),
    email: emptyToNull(member.email),
    unit: emptyToNull(member.partyUnit),
    membership_type: member.membershipType ?? null,
  };

  const dob = ageToDob(member.age ?? null);
  payload.dob = dob;

  if (member.membershipNumber !== undefined) {
    payload.membership_number = emptyToNull(member.membershipNumber);
  }

  if (member.job !== undefined) {
    payload.job = emptyToNull(member.job);
  }

  if (member.photo !== undefined) {
    payload.photo = member.photo && member.photo.length > 0 ? member.photo : null;
  }

  return payload;
};

export const getMembers = createAsyncThunk(
  "members/getMembers",
  async (params?: MembersQueryParams) => {
    const response = await listMembers(params);
    return response.rows.map(mapApiMemberToMember);
  },
);

export const addMember = createAsyncThunk(
  "members/addMember",
  async (member: Member) => {
    const payload = mapMemberToApiPayload(member);
    await createMemberApi(payload);
    const refreshed = await listMembers();
    return refreshed.rows.map(mapApiMemberToMember);
  },
);

export const updateMember = createAsyncThunk(
  "members/updateMember",
  async ({ id, member }: { id: string; member: Partial<Member> }) => {
    const payload = mapMemberToApiPayload(member);
    await updateMemberApi(Number(id), payload);
    const refreshed = await listMembers();
    return refreshed.rows.map(mapApiMemberToMember);
  },
);

export const deleteMember = createAsyncThunk(
  "members/deleteMember",
  async (id: string) => {
    await deleteMemberApi(Number(id));
    const refreshed = await listMembers();
    return refreshed.rows.map(mapApiMemberToMember);
  },
);

export const searchMembers = createAsyncThunk(
  "members/searchMembers",
  async (query: string) => {
    return CsvService.getInstance().searchMembers(query);
  },
);

export const filterMembers = createAsyncThunk(
  "members/filterMembers",
  async (filters: {
    gender?: string;
    membershipType?: string;
    ageMin?: number;
    ageMax?: number;
  }) => {
    return CsvService.getInstance().filterMembers(filters);
  },
);

const mapStatsDtoToState = (stats: StatsDTO): MemberStats => {
  const byGender = Object.fromEntries(stats.byGender.map((item) => [item.key, item.count]));

  return {
    totalMembers: stats.total,
    maleMembers: byGender.male ?? 0,
    femaleMembers: byGender.female ?? 0,
    recentRegistrations: 0,
  };
};

export const getMemberStats = createAsyncThunk(
  "members/getMemberStats",
  async () => {
    const stats = await getStats();
    return mapStatsDtoToState(stats);
  },
);

export const importMembers = createAsyncThunk(
  "members/importMembers",
  async (members: Member[]) => {
    const result = await CsvService.getInstance().importFromExcel(members);
    if (result.errors.length > 0) {
      throw new Error(`Import completed with ${result.errors.length} errors`);
    }
    return CsvService.getInstance().getAllMembers();
  },
);

interface MembersState {
  list: Member[];
  filteredList: Member[];
  stats: MemberStats | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  searchQuery: string;
  filters: {
    gender: string;
    membershipType: string;
    ageMin?: number;
    ageMax?: number;
  };
}

const initialState: MembersState = {
  list: [],
  filteredList: [],
  stats: null,
  status: "idle",
  error: null,
  searchQuery: "",
  filters: {
    gender: "all",
    membershipType: "all",
  },
};

const membersSlice = createSlice({
  name: "members",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setFilters: (
      state,
      action: PayloadAction<Partial<typeof initialState.filters>>,
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        gender: "all",
        membershipType: "all",
      };
      state.searchQuery = "";
    },
    clearError: (state) => {
      state.error = null;
    },
    restoreMembers: (state, action: PayloadAction<Member[]>) => {
      state.list = action.payload;
      state.filteredList = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Members
      .addCase(getMembers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getMembers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
        state.filteredList = action.payload;
        state.error = null;
      })
      .addCase(getMembers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load members";
      })

      // Add Member
      .addCase(addMember.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(addMember.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
        state.filteredList = action.payload;
        state.error = null;
      })
      .addCase(addMember.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to add member";
      })

      // Update Member
      .addCase(updateMember.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateMember.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
        state.filteredList = action.payload;
        state.error = null;
      })
      .addCase(updateMember.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to update member";
      })

      // Delete Member
      .addCase(deleteMember.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(deleteMember.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
        state.filteredList = action.payload;
        state.error = null;
      })
      .addCase(deleteMember.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to delete member";
      })

      // Search Members
      .addCase(searchMembers.fulfilled, (state, action) => {
        state.filteredList = action.payload;
      })

      // Filter Members
      .addCase(filterMembers.fulfilled, (state, action) => {
        state.filteredList = action.payload;
      })

      // Get Member Stats
      .addCase(getMemberStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })

      // Import Members
      .addCase(importMembers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(importMembers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
        state.filteredList = action.payload;
        state.error = null;
      })
      .addCase(importMembers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to import members";
      });
  },
});

export const {
  setSearchQuery,
  setFilters,
  clearFilters,
  clearError,
  restoreMembers,
} = membersSlice.actions;
export default membersSlice.reducer;
