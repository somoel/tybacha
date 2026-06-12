import ExcelJS from 'exceljs';

const TEAL = 'FF006D77';
const TEAL_LIGHT = 'FFE0F2F1';
const ZEBRA = 'FFF5F5F5';
const WHITE = 'FFFFFFFF';
const TEXT_DARK = 'FF1f2937';
const TEXT_MEDIUM = 'FF6b7280';

const PERF_EXCELLENT = 'FFC8E6C9';
const PERF_ABOVE = 'FFDCEDC8';
const PERF_AVG = 'FFFFF9C4';
const PERF_BELOW = 'FFFFE0B2';
const PERF_BELOW_BELOW = 'FFFFCDD2';

export interface BatteryReportData {
  paciente: {
    nombres: string;
    apellidos: string;
    fechaNacimiento: string;
    genero: string;
  };
  bateria: {
    idAplicacionSft: number;
    fechaAplicacion: string;
    pesoKg: number | null;
    estaturaCm: number | null;
    imc: number | null;
    observaciones: string | null;
    estado: string;
  };
  resultados: {
    prueba: string;
    valor: number;
    unidad: string;
    desempeno: string;
    porcentaje: number;
    observaciones: string | null;
  }[];
}

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

function perfColor(porcentaje: number): string {
  if (porcentaje >= 80) return PERF_EXCELLENT;
  if (porcentaje >= 60) return PERF_ABOVE;
  if (porcentaje >= 40) return PERF_AVG;
  if (porcentaje >= 20) return PERF_BELOW;
  return PERF_BELOW_BELOW;
}

function titleRow(ws: ExcelJS.Worksheet, title: string, colSpan: number): void {
  ws.mergeCells(1, 1, 1, colSpan);
  const cell = ws.getCell('A1');
  cell.value = title;
  cell.font = { bold: true, size: 16, color: { argb: WHITE }, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', indent: 1 };
  ws.getRow(1).height = 36;
}

function sectionHeader(ws: ExcelJS.Worksheet, row: number, title: string, colSpan: number): void {
  ws.mergeCells(row, 1, row, colSpan);
  const cell = ws.getCell(row, 1);
  cell.value = title;
  cell.font = { bold: true, size: 12, color: { argb: TEAL }, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LIGHT } };
  cell.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(row).height = 28;
  for (let c = 1; c <= colSpan; c++) {
    ws.getCell(row, c).border = { bottom: { style: 'medium', color: { argb: TEAL } } };
  }
}

function headerRow(ws: ExcelJS.Worksheet, row: number): void {
  const r = ws.getRow(row);
  r.height = 26;
  r.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', indent: 1 };
    cell.border = {
      bottom: { style: 'medium' },
      top: { style: 'medium' },
    };
  });
}

function thinBorders(ws: ExcelJS.Worksheet, fromRow: number, toRow: number): void {
  for (let i = fromRow; i <= toRow; i++) {
    ws.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  }
}

function zebraFill(ws: ExcelJS.Worksheet, fromRow: number, toRow: number): void {
  for (let i = fromRow; i <= toRow; i++) {
    if ((i - fromRow) % 2 === 1) {
      ws.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
        if (!cell.fill || cell.fill.type !== 'pattern' || !cell.fill.fgColor) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
        }
      });
    }
  }
}

export async function renderBatteryXlsx(data: BatteryReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tybacha';
  workbook.created = new Date();

  // ── Hoja 1: Resumen ──
  const summary = workbook.addWorksheet('Resumen', { properties: { defaultColWidth: 20 } });
  summary.getColumn(1).width = 30;
  summary.getColumn(2).width = 42;

  titleRow(summary, 'Reporte de Batería SFT', 2);

  const genderLabel = data.paciente.genero === 'masculino' ? 'Masculino' : 'Femenino';
  const estadoLabel = data.bateria.estado === 'finalizada' ? 'Finalizada' : data.bateria.estado;

  // Sección: Datos del paciente
  let r = 3;
  sectionHeader(summary, r, 'Datos del paciente', 2);
  r++;
  const patientFields: [string, string | number][] = [
    ['Paciente', `${data.paciente.nombres} ${data.paciente.apellidos}`],
    ['Fecha de nacimiento', formatDate(data.paciente.fechaNacimiento)],
    ['Género', genderLabel],
  ];
  for (const [label, value] of patientFields) {
    summary.getCell(r, 1).value = label;
    summary.getCell(r, 1).font = { bold: true, size: 11, color: { argb: TEXT_DARK }, name: 'Calibri' };
    summary.getCell(r, 1).alignment = { indent: 1 };
    summary.getCell(r, 2).value = value;
    summary.getCell(r, 2).font = { size: 11, color: { argb: TEXT_DARK }, name: 'Calibri' };
    summary.getCell(r, 2).alignment = { indent: 1 };
    r++;
  }
  thinBorders(summary, 4, r - 1);

  // Sección: Datos de la evaluación
  r++; // fila vacía
  sectionHeader(summary, r, 'Datos de la evaluación', 2);
  r++;
  const batteryFields: [string, string | number | null][] = [
    ['Fecha de aplicación', formatDateTime(data.bateria.fechaAplicacion)],
    ['Estado', estadoLabel],
    ['Peso (kg)', data.bateria.pesoKg ?? '—'],
    ['Estatura (cm)', data.bateria.estaturaCm ?? '—'],
    ['IMC', data.bateria.imc ?? '—'],
    ['Observaciones', data.bateria.observaciones ?? '—'],
  ];
  for (const [label, value] of batteryFields) {
    summary.getCell(r, 1).value = label;
    summary.getCell(r, 1).font = { bold: true, size: 11, color: { argb: TEXT_DARK }, name: 'Calibri' };
    summary.getCell(r, 1).alignment = { indent: 1 };
    summary.getCell(r, 2).value = value;
    summary.getCell(r, 2).font = { size: 11, color: { argb: TEXT_DARK }, name: 'Calibri' };
    summary.getCell(r, 2).alignment = { indent: 1 };
    r++;
  }
  const evalStart = r - batteryFields.length;
  thinBorders(summary, evalStart, r - 1);

  // ── Hoja 2: Resultados ──
  const results = workbook.addWorksheet('Resultados', { properties: { defaultColWidth: 16 } });
  results.getColumn(1).width = 42;
  results.getColumn(2).width = 12;
  results.getColumn(3).width = 12;
  results.getColumn(4).width = 24;
  results.getColumn(5).width = 14;
  results.getColumn(6).width = 36;

  titleRow(results, 'Resultados por Prueba', 6);
  headerRow(results, 2);

  const headers = ['Prueba', 'Valor', 'Unidad', 'Desempeño', 'Porcentaje', 'Observaciones'];
  headers.forEach((h, i) => {
    results.getCell(2, i + 1).value = h;
  });

  data.resultados.forEach((r, idx) => {
    const rowNum = idx + 3;
    results.getCell(rowNum, 1).value = r.prueba;
    results.getCell(rowNum, 2).value = r.valor;
    results.getCell(rowNum, 3).value = r.unidad;
    results.getCell(rowNum, 4).value = r.desempeno;
    results.getCell(rowNum, 5).value = `${r.porcentaje}%`;
    results.getCell(rowNum, 6).value = r.observaciones ?? '';

    // Fuente base
    for (let c = 1; c <= 6; c++) {
      results.getCell(rowNum, c).font = { size: 11, color: { argb: TEXT_DARK }, name: 'Calibri' };
      results.getCell(rowNum, c).alignment = { vertical: 'middle', indent: c <= 1 || c === 6 ? 1 : 0 };
    }

    // Valor bold
    results.getCell(rowNum, 2).font = { bold: true, size: 12, color: { argb: TEXT_DARK }, name: 'Calibri' };
    results.getCell(rowNum, 2).alignment = { horizontal: 'center', vertical: 'middle' };
    results.getCell(rowNum, 3).alignment = { horizontal: 'center', vertical: 'middle' };
    results.getCell(rowNum, 5).alignment = { horizontal: 'center', vertical: 'middle' };

    // Color de desempeño
    const bg = perfColor(r.porcentaje);
    results.getCell(rowNum, 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    results.getCell(rowNum, 4).font = { bold: true, size: 11, color: { argb: TEXT_DARK }, name: 'Calibri' };
    results.getCell(rowNum, 4).alignment = { horizontal: 'center', vertical: 'middle' };
    results.getCell(rowNum, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    results.getCell(rowNum, 5).font = { bold: true, size: 11, color: { argb: TEXT_DARK }, name: 'Calibri' };
  });

  if (data.resultados.length > 0) {
    thinBorders(results, 3, data.resultados.length + 2);
    zebraFill(results, 3, data.resultados.length + 2);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
