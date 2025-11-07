import React, { useCallback, useState } from "react";
import type { Member } from "../types/member";
import {
  ActivityContext,
  type ActivityItem,
  type ActivityType,
} from "./activityContext";

interface ActivityProviderProps {
  children: React.ReactNode;
}

export const ActivityProvider: React.FC<ActivityProviderProps> = ({
  children,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const addActivity = useCallback(
    (activity: Omit<ActivityItem, "id" | "timestamp">) => {
      const newActivity: ActivityItem = {
        ...activity,
        id: `activity_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        timestamp: new Date(),
      };

      setActivities((prev) => [newActivity, ...prev.slice(0, 19)]);
    },
    [],
  );

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  const trackMemberActivity = useCallback(
    (type: ActivityType, member: Member, originalMember?: Member) => {
      let description = "";
      let details = "";

      switch (type) {
        case "add":
          description = `تم إضافة العضو ${member.fullName}`;
          details = `رقم العضوية: ${member.membershipNumber}`;
          break;
        case "edit":
          description = `تم تعديل بيانات العضو ${member.fullName}`;
          if (originalMember) {
            const changedFields = [];
            if (originalMember.fullName !== member.fullName)
              changedFields.push("الاسم");
            if (originalMember.phoneNumber !== member.phoneNumber)
              changedFields.push("رقم الهاتف");
            if (originalMember.email !== member.email)
              changedFields.push("البريد الإلكتروني");
            if (originalMember.address !== member.address)
              changedFields.push("العنوان");
            if (originalMember.job !== member.job)
              changedFields.push("الوظيفة");
            if (originalMember.partyUnit !== member.partyUnit)
              changedFields.push("وحدة الحزب");
            if (changedFields.length > 0) {
              details = `تم تعديل: ${changedFields.join(", ")}`;
            }
          }
          break;
        case "delete":
          description = `تم حذف العضو ${member.fullName}`;
          details = `رقم العضوية: ${member.membershipNumber}`;
          break;
        case "update":
          description = `تم تحديث بيانات العضو ${member.fullName}`;
          break;
      }

      addActivity({
        type,
        memberName: member.fullName,
        description,
        details: details || undefined,
      });
    },
    [addActivity],
  );

  return (
    <ActivityContext.Provider
      value={{ activities, addActivity, clearActivities, trackMemberActivity }}
    >
      {children}
    </ActivityContext.Provider>
  );
};
