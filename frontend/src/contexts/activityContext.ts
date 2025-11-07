import { createContext, useContext } from "react";
import type { Member } from "../types/member";

export type ActivityType = "add" | "edit" | "delete" | "update";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  memberName: string;
  description: string;
  timestamp: Date;
  details?: string;
}

export interface ActivityContextValue {
  activities: ActivityItem[];
  addActivity: (activity: Omit<ActivityItem, "id" | "timestamp">) => void;
  clearActivities: () => void;
  trackMemberActivity: (
    type: ActivityType,
    member: Member,
    originalMember?: Member,
  ) => void;
}

export const ActivityContext = createContext<ActivityContextValue | undefined>(
  undefined,
);

export const useActivity = (): ActivityContextValue => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
};
