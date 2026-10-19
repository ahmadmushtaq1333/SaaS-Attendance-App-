/**
 * exportExcel.ts
 * --------------
 * Generates an Excel attendance workbook (.xlsx) and triggers the native OS sharing sheet.
 * Uses `xlsx`, `expo-file-system`, and `expo-sharing`.
 */

import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function exportAttendanceReport(report: any, courseName: string = 'Course'): Promise<string> {
  if (!report || !report.students) {
    throw new Error('No attendance report data to export.');
  }

  const sessions = report.session_list || [];
  const students = report.students || [];

  // Build rows for worksheet
  const rows: any[] = [];

  // Title / Metadata rows
  rows.push(['QUORUM ATTENDANCE REPORT']);
  rows.push(['Course:', courseName]);
  rows.push(['Generated At:', new Date().toLocaleString()]);
  rows.push(['Total Sessions:', report.total_sessions || sessions.length]);
  rows.push(['Total Students:', students.length]);
  rows.push([]); // blank separator

  // Header row
  const headerRow = ['Email', 'Registration Number', 'Attended', 'Total Sessions', 'Attendance %', 'Risk Status'];
  sessions.forEach((s: any, idx: number) => {
    headerRow.push(`Session ${s.session_number || idx + 1}`);
  });
  rows.push(headerRow);

  // Student rows
  students.forEach((student: any) => {
    const pct = student.attendance_percentage ?? 0;
    const riskStatus = pct >= 80 ? 'Good' : pct >= 75 ? 'Watch' : 'At Risk';
    const regNo = student.registration_number || (student.email ? student.email.split('@')[0] : '—');

    const row = [
      student.email,
      regNo,
      student.attended_count ?? 0,
      report.total_sessions ?? sessions.length,
      `${pct}%`,
      riskStatus,
    ];

    // Session attendance indicators
    sessions.forEach((s: any) => {
      const isPresent = student.sessions && student.sessions[String(s.id)] === true;
      row.push(isPresent ? 'P' : 'A');
    });

    rows.push(row);
  });

  // Create workbook and worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  // Generate base64 XLSX output
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  // Save to device file system
  const sanitizedName = courseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${sanitizedName}_Attendance_${Date.now()}.xlsx`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Trigger native share sheet if available
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `Export Attendance - ${courseName}`,
      UTI: 'com.microsoft.excel.xlsx',
    });
  }

  return fileUri;
}
