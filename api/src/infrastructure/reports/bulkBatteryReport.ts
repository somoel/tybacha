import ExcelJS from 'exceljs';

const TEAL = 'FF006D77';
const TEAL_LIGHT = 'FFE0F2F1';
const WHITE = 'FFFFFFFF';
const TEXT_DARK = 'FF1f2937';
const ZEBRA = 'FFF5F5F5';

const PERF_EXCELLENT = 'FFC8E6C9';
const PERF_ABOVE = 'FFDCEDC8';
const PERF_AVG = 'FFFFF9C4';
const PERF_BELOW = 'FFFFE0B2';
const PERF_BELOW_BELOW = 'FFFFCDD2';

export interface BulkBatteryRow {
  paciente: { nombres: string; apellidos: string; fechaNacimiento: string; genero: string };
  bateria: { fechaAplicacion: string; pesoKg: number | null; estaturaCm: number | null; imc: number | null };
  valores: (number | null)[];       // 6 valores, índice 0 = orden 1 (se omite orden 3)
  porcentajes: (number | null)[];   // 6 porcentajes para calcular color
}

const TEST_HEADERS = [
  'Sentarse y levantarse de una silla (reps)',
  'Flexiones del brazo (reps)',
  'Marcha de dos minutos (pasos)',
  'Flexión del tronco en silla (cm)',
  'Juntar las manos tras la espalda (cm)',
  'Levantarse, caminar y volverse a sentar (s)',
];

function formatDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateTime(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function perfColor(porcentaje: number | null): string | undefined {
  if (porcentaje === null) return undefined;
  if (porcentaje >= 80) return PERF_EXCELLENT;
  if (porcentaje >= 60) return PERF_ABOVE;
  if (porcentaje >= 40) return PERF_AVG;
  if (porcentaje >= 20) return PERF_BELOW;
  return PERF_BELOW_BELOW;
}

function setMergedTitle(ws: ExcelJS.Worksheet, row: number, title: string, colCount: number): void {
  ws.mergeCells(row, 1, row, colCount);
  const cell = ws.getCell(row, 1);
  cell.value = title;
  cell.font = { bold: true, size: 16, color: { argb: WHITE }, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', indent: 1 };
  ws.getRow(row).height = 36;
  for (let c = 1; c <= colCount; c++) {
    ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  }
}

export async function renderBulkBatteryXlsx(
  rows: BulkBatteryRow[],
  exportDate: Date,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tybacha';
  workbook.created = exportDate;

  const ws = workbook.addWorksheet('Resultados consolidados', {
    properties: { defaultColWidth: 14 },
  });

  const COL_COUNT = 13;

  ws.getColumn(1).width = 32;  // Paciente
  ws.getColumn(2).width = 14;  // Fecha nac.
  ws.getColumn(3).width = 12;  // Género
  ws.getColumn(4).width = 20;  // Fecha batería
  ws.getColumn(5).width = 10;  // Peso
  ws.getColumn(6).width = 12;  // Estatura
  ws.getColumn(7).width = 10;  // IMC
  for (let i = 8; i <= 13; i++) ws.getColumn(i).width = 18;

  // Row 1: título
  setMergedTitle(ws, 1, 'Exportación masiva — Resultados SFT', COL_COUNT);

  // Row 2: info
  const dd = String(exportDate.getUTCDate()).padStart(2, '0');
  const mm = String(exportDate.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = exportDate.getUTCFullYear();
  const hh = String(exportDate.getUTCHours()).padStart(2, '0');
  const mi = String(exportDate.getUTCMinutes()).padStart(2, '0');
  const dateStr = `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  ws.mergeCells(2, 1, 2, COL_COUNT);
  const infoCell = ws.getCell(2, 1);
  infoCell.value = `${rows.length} paciente${rows.length !== 1 ? 's' : ''} · Fecha de exportación: ${dateStr}`;
  infoCell.font = { size: 11, color: { argb: TEAL }, name: 'Calibri', italic: true };
  infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LIGHT } };
  infoCell.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 24;
  for (let c = 1; c <= COL_COUNT; c++) {
    ws.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LIGHT } };
  }

  // Row 3: headers
  const headers = [
    'Paciente', 'Fecha nac.', 'Género', 'Fecha batería', 'Peso (kg)',
    'Estatura (cm)', 'IMC',
    ...TEST_HEADERS,
  ];
  const headerRow = ws.getRow(3);
  headerRow.height = 28;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  // Data rows
  rows.forEach((row, idx) => {
    const r = idx + 4;
    const genderLabel = row.paciente.genero === 'masculino' ? 'Masculino' : 'Femenino';

    ws.getCell(r, 1).value = `${row.paciente.nombres} ${row.paciente.apellidos}`;
    ws.getCell(r, 2).value = formatDate(row.paciente.fechaNacimiento);
    ws.getCell(r, 3).value = genderLabel;
    ws.getCell(r, 4).value = formatDateTime(row.bateria.fechaAplicacion);
    ws.getCell(r, 5).value = row.bateria.pesoKg ?? '—';
    ws.getCell(r, 6).value = row.bateria.estaturaCm ?? '—';
    ws.getCell(r, 7).value = row.bateria.imc ?? '—';

    for (let t = 0; t < 6; t++) {
      const cell = ws.getCell(r, 8 + t);
      const val = row.valores[t];
      const pct = row.porcentajes[t];
      cell.value = val !== null ? val : '—';

      const bg = perfColor(pct);
      if (bg) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      }
      cell.font = { bold: true, size: 11, color: { argb: TEXT_DARK }, name: 'Calibri' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Base font & alignment for patient info cells
    for (let c = 1; c <= 7; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { size: 11, color: { argb: TEXT_DARK }, name: 'Calibri' };
      cell.alignment = { vertical: 'middle', indent: c <= 1 ? 1 : 0 };
    }

    // Bold paciente name
    ws.getCell(r, 1).font = { bold: true, size: 11, color: { argb: TEXT_DARK }, name: 'Calibri' };
    // Center date cells
    ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(r, 3).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(r, 4).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(r, 5).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(r, 6).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(r, 7).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Zebra striping
  const lastDataRow = rows.length + 3;
  for (let i = 4; i <= lastDataRow; i++) {
    if ((i - 4) % 2 === 1) {
      ws.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
        if (!cell.fill || cell.fill.type !== 'pattern' || !cell.fill.fgColor) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
        }
      });
    }
  }

  // Thin borders for data rows
  for (let i = 4; i <= lastDataRow; i++) {
    ws.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  }

  // Header borders
  ws.getRow(3).eachCell({ includeEmpty: true }, (cell) => {
    cell.border = {
      bottom: { style: 'medium' },
      top: { style: 'medium' },
    };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
