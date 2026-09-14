/**
 * exportExcel.js
 * Professional attendance report using ExcelJS.
 * Single-page layout combining summary metrics with the session-by-session matrix.
 * Styled with official UET Peshawar brand colors (Deep Blue & Orange).
 */

import { Workbook } from "exceljs";

/* ─── Palette (UET Peshawar Brand Colors) ──────────────────── */
const NAVY   = "23376D";    // UET Primary Deep Blue
const ORANGE = "FD7A00";    // UET Secondary Orange
const LGRAY  = "F1F5F9";
const DGRAY  = "E2E8F0";
const GREEN  = "065F46";
const GFILL  = "D1FAE5";
const RED    = "991B1B";
const RFILL  = "FEE2E2";
const PFILL  = "DCFCE7";    // present cell
const PTEXT  = "166534";
const ABFILL = "FEF2F2";    // absent cell
const ABTEXT = "991B1B";
const WHITE  = "FFFFFF";
const DARK   = "1E293B";
const MUTED  = "64748B";

/* ─── Style factories ─────────────────────────────────────── */
const fill = (hex) => ({
  type: "pattern", pattern: "solid",
  fgColor: { argb: `FF${hex}` },
});

const font = ({ hex = DARK, sz = 10, bold = false, italic = false, name = "Calibri" } = {}) => ({
  name, size: sz, bold, italic,
  color: { argb: `FF${hex}` },
});

const border = (style = "thin", hex = "CBD5E1") => ({
  top:    { style, color: { argb: `FF${hex}` } },
  bottom: { style, color: { argb: `FF${hex}` } },
  left:   { style, color: { argb: `FF${hex}` } },
  right:  { style, color: { argb: `FF${hex}` } },
});

const thickBorder = border("medium", NAVY);
const thinBorder  = border("thin",  "CBD5E1");

const align = (h = "left", v = "middle", wrap = false) => ({
  horizontal: h, vertical: v, wrapText: wrap,
});

/* ─── Helpers ─────────────────────────────────────────────── */
const regNo = (email = "") => email.split("@")[0];

const fmtDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return "";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtShortDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return "";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const fmtDateTime = () =>
  new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

function style(cell, { f, fnt, aln, brdr } = {}) {
  if (f)    cell.fill      = f;
  if (fnt)  cell.font      = fnt;
  if (aln)  cell.alignment = aln;
  if (brdr) cell.border    = brdr;
}

/* ══════════════════════════════════════════════════════════
   PUBLIC ENTRY POINT
══════════════════════════════════════════════════════════ */
export async function exportAttendanceExcel(report, courses, activeCourseId) {
  const courseObj = courses.find((c) => String(c.id) === String(activeCourseId)) || {};
  const meta = {
    institution: courseObj.institution || "",
    department:  courseObj.department  || "",
    section:     courseObj.section     || "",
  };

  const wb = new Workbook();
  wb.creator  = "Attendance Management System";
  wb.created  = new Date();
  
  const ws = wb.addWorksheet("Attendance Report", {
    pageSetup: {
      orientation:  "landscape",
      fitToPage:    true,
      fitToWidth:   1,
      fitToHeight:  0,
      paperSize:    9,   // A4
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddFooter: `&L&"Calibri,Italic"&8Attendance Management System&C&8Page &P of &N&R&8${fmtDateTime()}`,
    },
  });

  const sessions = report.session_list || [];
  const students = report.students     || [];

  /* ── Column widths ── */
  const cols = [
    { key: "a", width: 5  },   // #
    { key: "b", width: 22 },   // Reg No.
  ];
  sessions.forEach(() => cols.push({ width: 9 })); // Session P/A columns
  cols.push(
    { width: 10 }, // Total
    { width: 12 }, // %
    { width: 14 }  // Status
  );
  ws.columns = cols;
  const totalCols = cols.length;
  const layoutCols = Math.max(totalCols, 7); // Ensure enough width for the meta block

  /* ── ROW 1: Main title banner (Navy) ── */
  ws.getRow(1).height = 36;
  ws.mergeCells(1, 1, 1, layoutCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "STUDENT ATTENDANCE REPORT";
  style(titleCell, {
    f:   fill(NAVY),
    fnt: font({ hex: WHITE, sz: 18, bold: true }),
    aln: align("center", "middle"),
    brdr: thickBorder,
  });

  /* ── ROW 2: spacer ── */
  ws.getRow(2).height = 6;
  ws.mergeCells(2, 1, 2, layoutCols);
  ws.getCell(2, 1).fill = fill(LGRAY);

  /* ── Meta block rows (3-row layout, 3 items per row) ── */
  const metaGrid = [
    [
      { l: "Institution: ",    v: meta.institution || "—" },
      { l: "Department: ",     v: meta.department  || "—" },
      { l: "Course Name: ",    v: report.course_name || "—" },
    ],
    [
      { l: "Course Code: ",    v: "__________" },
      { l: "Instructor: ",     v: "__________" },
      { l: "Semester: ",       v: "__________" },
    ],
    [
      { l: "Section: ",        v: meta.section || "__________" },
      { l: "Report Date: ",    v: fmtDate(new Date()) },
      { l: "Total Sessions: ", v: String(report.total_sessions || 0) },
    ],
  ];

  // Divide layoutCols into 3 equal(ish) chunks
  const chunkSize = Math.floor(layoutCols / 3);
  const chunks = [
    { start: 1,               end: chunkSize },
    { start: chunkSize + 1,   end: chunkSize * 2 },
    { start: chunkSize * 2 + 1, end: layoutCols },
  ];

  let r = 3;
  metaGrid.forEach((rowItems, idx) => {
    ws.getRow(r).height = 18;
    const bgFill = fill(idx % 2 === 0 ? LGRAY : WHITE);

    for (let i = 0; i < 3; i++) {
      const cStart = chunks[i].start;
      const cEnd   = chunks[i].end;

      if (cStart < cEnd) ws.mergeCells(r, cStart, r, cEnd);

      const cell = ws.getCell(r, cStart);
      cell.fill      = bgFill;
      cell.border    = thinBorder;
      cell.alignment = align("left", "middle");

      if (i < rowItems.length) {
        const item     = rowItems[i];
        const vIsBlank = item.v.includes("___");
        const vColor   = item.isAlert && parseInt(item.v) > 0 ? RED : (vIsBlank ? MUTED : DARK);

        cell.value = {
          richText: [
            { font: { bold: true,  color: { argb: `FF${NAVY}` }, size: 10, name: "Calibri" }, text: item.l },
            { font: { bold: !!item.isAlert, italic: vIsBlank, color: { argb: `FF${vColor}` }, size: 10, name: "Calibri" }, text: item.v },
          ],
        };
      }
    }
    r++;
  });


  /* ── Spacer row ── */
  ws.getRow(r).height = 8;
  ws.mergeCells(r, 1, r, layoutCols);
  ws.getCell(r, 1).fill = fill(LGRAY);
  r++;

  /* ── Table column headers ── */
  ws.getRow(r).height = 32;
  const hCells = ["#", "Registration No."];
  sessions.forEach((s, si) => hCells.push(`S-${s.session_number ?? si + 1}\n${fmtShortDate(s.start_time)}`));
  hCells.push("Total", "Attend %", "Status");

  hCells.forEach((h, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = h;
    style(c, {
      f:   fill(NAVY),
      fnt: font({ hex: WHITE, sz: 10, bold: true }),
      aln: align("center", "middle", true), // true = wrapText for dates
      brdr: thickBorder,
    });
  });

  const dataStartRow = r;
  ws.autoFilter = { from: { row: r, column: 1 }, to: { row: r, column: totalCols } };
  r++;

  /* ── Student data rows (sorted by reg number) ── */
  const sortedStudents = [...students].sort((a, b) =>
    regNo(a.email).localeCompare(regNo(b.email), undefined, { numeric: true, sensitivity: "base" })
  );

  sortedStudents.forEach((s, idx) => {
    ws.getRow(r).height = 18;
    
    const attended = sessions.filter((sess) => s.sessions?.[String(sess.id)] === true).length;
    const pct = report.total_sessions > 0 ? (attended / report.total_sessions) * 100 : 0;
    const isClear = pct >= 75;
    const status = isClear ? "Clear" : "Short";

    // #
    const cNum = ws.getCell(r, 1);
    cNum.value = idx + 1;
    style(cNum, { f: fill(WHITE), fnt: font({ hex: DARK, sz: 10 }), aln: align("center", "middle"), brdr: thinBorder });

    // Reg No
    const cReg = ws.getCell(r, 2);
    cReg.value = regNo(s.email);
    style(cReg, { f: fill(WHITE), fnt: font({ hex: DARK, sz: 10 }), aln: align("left", "middle"), brdr: thinBorder });

    let colIdx = 3;
    
    // Session P/A cells
    sessions.forEach((sess) => {
      const present = s.sessions?.[String(sess.id)] === true;
      const c = ws.getCell(r, colIdx++);
      c.value = present ? "P" : "A";
      style(c, {
        f:   fill(present ? PFILL : ABFILL),
        fnt: font({ hex: present ? PTEXT : ABTEXT, sz: 10, bold: true }),
        aln: align("center", "middle"),
        brdr: thinBorder,
      });
    });

    // Total
    const cTot = ws.getCell(r, colIdx++);
    cTot.value = `${attended}/${report.total_sessions}`;
    style(cTot, {
      f:   fill(isClear ? GFILL : RFILL),
      fnt: font({ hex: isClear ? GREEN : RED, sz: 10, bold: true }),
      aln: align("center", "middle"),
      brdr: thinBorder,
    });

    // %
    const cPct = ws.getCell(r, colIdx++);
    cPct.value = `${pct.toFixed(1)}%`;
    style(cPct, {
      f:   fill(isClear ? GFILL : RFILL),
      fnt: font({ hex: isClear ? GREEN : RED, sz: 10, bold: true }),
      aln: align("center", "middle"),
      brdr: thinBorder,
    });

    // Status
    const cStat = ws.getCell(r, colIdx++);
    cStat.value = status;
    style(cStat, {
      f:   fill(isClear ? GFILL : RFILL),
      fnt: font({ hex: isClear ? GREEN : RED, sz: 10, bold: true }),
      aln: align("center", "middle"),
      brdr: thinBorder,
    });

    r++;
  });

  /* ── Outer thick border around the data table ── */
  for (let row = dataStartRow; row < r; row++) {
    for (let c = 1; c <= totalCols; c++) {
      const cell = ws.getCell(row, c);
      cell.border = {
        ...cell.border,
        top:    row === dataStartRow ? { style: "medium", color: { argb: `FF${NAVY}` } } : cell.border?.top,
        bottom: row === r - 1        ? { style: "medium", color: { argb: `FF${NAVY}` } } : cell.border?.bottom,
        left:   c === 1              ? { style: "medium", color: { argb: `FF${NAVY}` } } : cell.border?.left,
        right:  c === totalCols      ? { style: "medium", color: { argb: `FF${NAVY}` } } : cell.border?.right,
      };
    }
  }

  /* ── Class Average row (Orange) ── */
  ws.getRow(r).height = 20;
  ws.mergeCells(r, 1, r, 2 + sessions.length);
  const avgLabel = ws.getCell(r, 1);
  avgLabel.value = "Class Average";
  style(avgLabel, {
    f:   fill(ORANGE),
    fnt: font({ hex: WHITE, sz: 11, bold: true }),
    aln: align("right", "middle"),
    brdr: thickBorder,
  });
  
  const totalPct = students.length
    ? students.reduce((a, s) => a + (s.attendance_percentage || 0), 0) / students.length
    : 0;

  const avgPct = ws.getCell(r, totalCols - 1);
  avgPct.value = `${totalPct.toFixed(1)}%`;
  style(avgPct, {
    f:   fill(ORANGE),
    fnt: font({ hex: WHITE, sz: 11, bold: true }),
    aln: align("center", "middle"),
    brdr: thickBorder,
  });
  
  const avgStat = ws.getCell(r, totalCols);
  avgStat.value = "";
  style(avgStat, { f: fill(ORANGE), brdr: thickBorder });

  /* ── Freeze panes: logo + headers top, Reg No. left ── */
  ws.views = [
    { state: "frozen", xSplit: 2, ySplit: dataStartRow, topLeftCell: `C${dataStartRow + 1}` }
  ];

  /* ── Trigger browser download ── */
  const buffer   = await wb.xlsx.writeBuffer();
  const blob     = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url      = URL.createObjectURL(blob);
  const anchor   = document.createElement("a");
  const safeName = (report.course_name || `course_${activeCourseId}`).replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const dateTag  = new Date().toISOString().slice(0, 10);
  
  anchor.href     = url;
  anchor.download = `Attendance_${safeName}_${dateTag}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
