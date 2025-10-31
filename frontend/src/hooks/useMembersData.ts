import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { getMembers, getMemberStats } from "../slices/membersSlice";

interface UseMembersOptions {
  fetchMembers?: boolean;
  fetchStats?: boolean;
}

export const useMembersData = (options: UseMembersOptions = {}) => {
  const { fetchMembers = true, fetchStats = true } = options;
  const dispatch = useDispatch<AppDispatch>();
  const { list: members, stats, status } = useSelector(
    (state: RootState) => state.members,
  );

  useEffect(() => {
    if (status === "idle") {
      const tasks: Promise<unknown>[] = [];
      if (fetchMembers) {
        tasks.push(dispatch(getMembers()).unwrap());
      }
      if (fetchStats) {
        tasks.push(dispatch(getMemberStats()).unwrap());
      }
      if (tasks.length > 0) {
        void Promise.all(tasks);
      }
    }
  }, [status, dispatch, fetchMembers, fetchStats]);

  const refreshData = async () => {
    const tasks: Promise<unknown>[] = [];
    if (fetchMembers) {
      tasks.push(dispatch(getMembers()).unwrap());
    }
    if (fetchStats) {
      tasks.push(dispatch(getMemberStats()).unwrap());
    }
    await Promise.all(tasks);
  };

  return { members, stats, status, refreshData };
};
