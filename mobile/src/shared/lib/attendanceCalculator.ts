/**
 * attendanceCalculator.ts
 * ----------------------
 * Pure attendance safety calculation utility for Quorum Mobile.
 * Decoupled from React and API layers for maximum testability and reuse.
 */

export interface SafetyMetrics {
  currentPct: number;
  targetPct: number;
  status: 'unstarted' | 'edge' | 'safe' | 'warning' | 'critical';
  safeToMiss: number;
  neededToRecover: number;
  badgeText: string;
  badgeColor: string;
  badgeBg: string;
  headline: string;
  description: string;
}

export function calculateSafetyMetrics(
  attendedCount: number = 0,
  totalSessions: number = 0,
  targetPct: number = 75
): SafetyMetrics {
  const target = Math.max(1, Math.min(99, Number(targetPct) || 75));
  const targetRatio = target / 100;
  const total = Math.max(0, Number(totalSessions) || 0);
  const attended = Math.max(0, Math.min(total, Number(attendedCount) || 0));

  if (total === 0) {
    return {
      currentPct: 0,
      targetPct: target,
      status: 'unstarted',
      safeToMiss: 0,
      neededToRecover: 0,
      badgeText: 'No classes yet',
      badgeColor: '#94a3b8',
      badgeBg: 'rgba(255,255,255,0.06)',
      headline: 'No Classes Yet',
      description: 'Attendance will update once classes begin.',
    };
  }

  const currentPct = Math.round((attended / total) * 1000) / 10; // 1 decimal place

  if (currentPct >= target) {
    // Student is at or above target
    const safeToMiss = Math.max(0, Math.floor(attended / targetRatio - total));

    if (safeToMiss === 0) {
      return {
        currentPct,
        targetPct: target,
        status: 'edge',
        safeToMiss: 0,
        neededToRecover: 0,
        badgeText: "Don't miss next class",
        badgeColor: '#f59e0b',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        headline: "Don't Miss the Next Class",
        description: `Your attendance is ${currentPct}%. Missing even 1 class will drop you below ${target}%.`,
      };
    }

    const classWord = safeToMiss === 1 ? 'class' : 'classes';
    return {
      currentPct,
      targetPct: target,
      status: 'safe',
      safeToMiss,
      neededToRecover: 0,
      badgeText: `Can miss ${safeToMiss} ${classWord}`,
      badgeColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      headline: `You can safely miss ${safeToMiss} ${classWord}`,
      description: `You can skip up to ${safeToMiss} more ${classWord} and stay above ${target}%.`,
    };
  }

  // Student is below target
  const oneMinusTarget = 1 - targetRatio;
  const neededToRecover = Math.max(1, Math.ceil((targetRatio * total - attended) / oneMinusTarget));
  const classWord = neededToRecover === 1 ? 'class' : 'classes';

  const isCritical = currentPct < 50;
  return {
    currentPct,
    targetPct: target,
    status: isCritical ? 'critical' : 'warning',
    safeToMiss: 0,
    neededToRecover,
    badgeText: `Attend next ${neededToRecover} ${classWord}`,
    badgeColor: isCritical ? '#ef4444' : '#f59e0b',
    badgeBg: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
    headline: `Attend next ${neededToRecover} ${classWord}`,
    description: `Your attendance is ${currentPct}%. Attend the next ${neededToRecover} ${classWord} in a row to reach ${target}%.`,
  };
}

/**
 * Simulates future attendance if a student attends 'addAttended' and misses 'addMissed' upcoming sessions.
 */
export function simulateFutureAttendance(
  attendedCount: number,
  totalSessions: number,
  addAttended: number = 0,
  addMissed: number = 0
): number {
  const currentTotal = Math.max(0, Number(totalSessions) || 0);
  const currentAttended = Math.max(0, Math.min(currentTotal, Number(attendedCount) || 0));

  const futureAttended = currentAttended + Math.max(0, Number(addAttended) || 0);
  const futureTotal = currentTotal + Math.max(0, Number(addAttended) || 0) + Math.max(0, Number(addMissed) || 0);

  if (futureTotal === 0) return 0;
  return Math.round((futureAttended / futureTotal) * 1000) / 10;
}
