import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MEMBERSHIP_TYPE_VALUES,
  getMembershipTypeTranslationKey,
  type Member,
  type MembershipType,
} from '../../types/member';

interface MemberTypeDistributionChartProps {
  members: Member[];
}

// تعريف جميع أنواع العضوية المتاحة
const ALL_MEMBER_TYPES = MEMBERSHIP_TYPE_VALUES;

const MemberTypeDistributionChart: React.FC<MemberTypeDistributionChartProps> = ({ members }) => {
  const { t } = useTranslation();

  // حساب توزيع أنواع العضوية
  const memberTypeStats = React.useMemo(() => {
    const stats = Object.fromEntries(
      ALL_MEMBER_TYPES.map((type) => [type, 0]),
    ) as Record<MembershipType, number>;

    // حساب الأعداد الفعلية
    members.forEach(member => {
      const type = member.membershipType;
      if (stats[type] !== undefined) {
        stats[type]++;
      }
    });

    return Object.entries(stats)
      .map(([type, count]) => {
        const membershipType = type as MembershipType;
        return {
          type: membershipType,
          count,
          label: t(
            `members.memberTypes.${getMembershipTypeTranslationKey(membershipType)}`,
          ),
        };
      })
      .sort((a, b) => {
        // ترتيب حسب الأولوية: أولاً الأنواع المستخدمة، ثم الباقي
        if (a.count > 0 && b.count === 0) return -1;
        if (a.count === 0 && b.count > 0) return 1;
        return b.count - a.count;
      });
  }, [members, t]);

  const maxCount = Math.max(...memberTypeStats.map(stat => stat.count));
  const totalMembers = members.length;

  if (memberTypeStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        {t('analytics.noDataAvailable')}
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="space-y-4">
        {memberTypeStats.map((stat) => {
          const percentage = totalMembers > 0 ? (stat.count / totalMembers) * 100 : 0;
          const barWidth = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;

          return (
            <div key={stat.type} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stat.label}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.count} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MemberTypeDistributionChart;
