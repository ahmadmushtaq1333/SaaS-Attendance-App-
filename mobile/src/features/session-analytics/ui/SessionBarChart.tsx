/**
 * SessionBarChart.tsx
 * -------------------
 * Lightweight SVG bar chart for session-by-session attendance rates.
 * Uses react-native-svg — no additional packages needed.
 * Pure presentational — accepts data, renders chart.
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single session's attendance counts. */
interface SessionDataPoint {
  /** The 1-based session number shown as the bar label. */
  session_number: number;
  /** Number of students (or days) present. */
  present_count: number;
  /** Total number of students (or days) for this session. */
  total_count: number;
}

/** Props accepted by {@link SessionBarChart}. */
interface SessionBarChartProps {
  /** Ordered array of session data points (oldest-first). */
  sessions: SessionDataPoint[];
  /** Total chart height in logical pixels. @default 80 */
  height?: number;
  /** Width of each individual bar in logical pixels. @default 18 */
  barWidth?: number;
  /** Gap between bars in logical pixels. @default 6 */
  barGap?: number;
  /**
   * Attendance percentage (0–100) at which the dashed threshold line is drawn.
   * Also used for colour-coding: bars at or above this value use
   * `presentColor`; bars between 50% (inclusive) and this value use
   * `warningColor`; bars below 50% use `dangerColor`.
   * @default 75
   */
  targetPct?: number;
  /** Colour used for an absent / zero-height bar placeholder. @default '#E0E0E0' */
  emptyColor?: string;
  /** Bar colour when attendance >= targetPct. @default '#4CAF50' */
  presentColor?: string;
  /** Bar colour when 50% <= attendance < targetPct. @default '#FF9800' */
  warningColor?: string;
  /** Bar colour when attendance < 50%. @default '#F44336' */
  dangerColor?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Height reserved at the bottom for session-number labels. */
const LABEL_AREA_HEIGHT = 16;

/** Font size for session-number labels. */
const LABEL_FONT_SIZE = 9;

/** Stroke width of the dashed threshold line. */
const THRESHOLD_STROKE_WIDTH = 1;

/** Dash pattern for the threshold line. */
const THRESHOLD_DASH = '4,3';

/** Colour of the dashed threshold line. */
const THRESHOLD_COLOR = '#9E9E9E';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the bar fill colour based on the attendance percentage and thresholds.
 */
function resolveBarColor(
  pct: number,
  targetPct: number,
  presentColor: string,
  warningColor: string,
  dangerColor: string,
  emptyColor: string,
  totalCount: number,
): string {
  if (totalCount === 0) return emptyColor;
  if (pct >= targetPct) return presentColor;
  if (pct >= 50) return warningColor;
  return dangerColor;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A horizontally-scrollable SVG bar chart that displays per-session
 * attendance rates with colour-coded bars and a dashed threshold line.
 *
 * @example
 * <SessionBarChart
 *   sessions={sessionData}
 *   height={100}
 *   targetPct={75}
 * />
 */
export const SessionBarChart: React.FC<SessionBarChartProps> = React.memo(
  ({
    sessions,
    height = 80,
    barWidth = 18,
    barGap = 6,
    targetPct = 75,
    emptyColor = '#E0E0E0',
    presentColor = '#4CAF50',
    warningColor = '#FF9800',
    dangerColor = '#F44336',
  }) => {
    // The drawable bar area sits above the label area
    const barAreaHeight = height - LABEL_AREA_HEIGHT;

    // Total chart width — at least as wide as the container
    const chartWidth = sessions.length > 0
      ? sessions.length * (barWidth + barGap) + barGap
      : barWidth + barGap * 2;

    // Y position of the dashed threshold line within the bar area
    const thresholdY = barAreaHeight * (1 - targetPct / 100);

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Svg width={chartWidth} height={height}>
          {/* ── Bars ────────────────────────────────────────────────── */}
          <G>
            {sessions.map((session, index) => {
              const x = barGap + index * (barWidth + barGap);

              const pct =
                session.total_count > 0
                  ? (session.present_count / session.total_count) * 100
                  : 0;

              const barHeight =
                session.total_count === 0
                  ? 0
                  : Math.max(1, (pct / 100) * barAreaHeight);

              const barY = barAreaHeight - barHeight;

              const fillColor = resolveBarColor(
                pct,
                targetPct,
                presentColor,
                warningColor,
                dangerColor,
                emptyColor,
                session.total_count,
              );

              // Always render the background placeholder bar so empty sessions
              // are still visible as a thin rectangle.
              const placeholderHeight = Math.max(2, barAreaHeight * 0.05);
              const placeholderY = barAreaHeight - placeholderHeight;

              const labelX = x + barWidth / 2;
              const labelY = height - 2; // inside label area

              return (
                <G key={`session-bar-${session.session_number}-${index}`}>
                  {/* Background / empty placeholder */}
                  <Rect
                    x={x}
                    y={placeholderY}
                    width={barWidth}
                    height={placeholderHeight}
                    fill={emptyColor}
                    rx={2}
                    ry={2}
                  />

                  {/* Actual attendance bar (only rendered when data exists) */}
                  {session.total_count > 0 && barHeight > 0 && (
                    <Rect
                      x={x}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill={fillColor}
                      rx={2}
                      ry={2}
                    />
                  )}

                  {/* Session number label */}
                  <SvgText
                    x={labelX}
                    y={labelY}
                    fontSize={LABEL_FONT_SIZE}
                    fill="#757575"
                    textAnchor="middle"
                  >
                    {session.session_number}
                  </SvgText>
                </G>
              );
            })}
          </G>

          {/* ── Threshold dashed line ────────────────────────────────── */}
          {sessions.length > 0 && (
            <Line
              x1={0}
              y1={thresholdY}
              x2={chartWidth}
              y2={thresholdY}
              stroke={THRESHOLD_COLOR}
              strokeWidth={THRESHOLD_STROKE_WIDTH}
              strokeDasharray={THRESHOLD_DASH}
            />
          )}
        </Svg>
      </ScrollView>
    );
  },
);

SessionBarChart.displayName = 'SessionBarChart';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    alignItems: 'flex-end',
  },
});
