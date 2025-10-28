import React from "react";
import { useTranslation } from "react-i18next";
import {
  MEMBERSHIP_TYPE_VALUES,
  getMembershipTypeTranslationKey,
  type Member,
  type MembershipType,
} from "../../types/member";

interface FinancialSupportChartProps {
  members: Member[];
}

const FinancialSupportChart: React.FC<FinancialSupportChartProps> = ({
  members,
}) => {
  const { t } = useTranslation();

  const focusTypes = React.useMemo<MembershipType[]>(
    () => MEMBERSHIP_TYPE_VALUES.slice(0, 3),
    [],
  );

  const stats = React.useMemo(() => {
    const total = members.length;

    return focusTypes.map((type) => {
      const count = members.filter((member) => member.membershipType === type).length;
      const percentage = total > 0 ? (count / total) * 100 : 0;

      return {
        type,
        count,
        percentage,
        label: t(
          `members.memberTypes.${getMembershipTypeTranslationKey(type)}`,
        ),
      };
    });
  }, [focusTypes, members, t]);

  const colors = ["bg-green-500", "bg-blue-500", "bg-amber-500"] as const;

  const totalMembers = members.length;

  return (
    <div className="w-full h-full">
      <div className="space-y-6">
        {stats.map((stat, index) => (
          <div key={stat.type} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stat.label}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {stat.count} ({stat.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`${colors[index % colors.length]} h-3 rounded-full transition-all duration-300`}
                style={{ width: `${stat.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {totalMembers === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"></div>
      )}
    </div>
  );
};

export default FinancialSupportChart;
