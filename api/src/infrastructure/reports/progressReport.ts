import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface ProgressReportData {
  adultoMayor: {
    idAdultoMayor: number;
    nombres: string;
    apellidos: string;
    fechaNacimiento: string;
    genero: string;
    estado: string;
  };
  sft: {
    fechaAplicacion: string;
    prueba: string;
    valor: string;
    unidad: string | null;
  }[];
  planes: {
    titulo: string;
    estado: string;
    nivelDificultad: string;
    creadoEn: string;
  }[];
  progreso: {
    periodo: string;
    fechaInicio: string;
    fechaFin: string;
    programados: number;
    completados: number;
    omitidos: number;
    cumplimiento: number;
  }[];
}

export async function renderProgressPdf(data: ProgressReportData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(20).text('Reporte de progreso', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Adulto mayor: ${data.adultoMayor.nombres} ${data.adultoMayor.apellidos}`);
  doc.text(`Fecha de nacimiento: ${data.adultoMayor.fechaNacimiento}`);
  doc.text(`Genero: ${data.adultoMayor.genero}`);
  doc.text(`Estado: ${data.adultoMayor.estado}`);
  doc.moveDown();

  doc.fontSize(16).text('Resultados SFT recientes');
  doc.moveDown(0.5);
  if (data.sft.length === 0) {
    doc.fontSize(11).text('Sin resultados SFT registrados.');
  } else {
    data.sft.forEach((row) => {
      doc.fontSize(10).text(`${row.fechaAplicacion} - ${row.prueba}: ${row.valor} ${row.unidad ?? ''}`);
    });
  }
  doc.moveDown();

  doc.fontSize(16).text('Planes de ejercicio');
  doc.moveDown(0.5);
  if (data.planes.length === 0) {
    doc.fontSize(11).text('Sin planes registrados.');
  } else {
    data.planes.forEach((row) => {
      doc.fontSize(10).text(`${row.creadoEn} - ${row.titulo} (${row.estado}, ${row.nivelDificultad})`);
    });
  }
  doc.moveDown();

  doc.fontSize(16).text('Cumplimiento');
  doc.moveDown(0.5);
  if (data.progreso.length === 0) {
    doc.fontSize(11).text('Sin estadisticas de progreso.');
  } else {
    data.progreso.forEach((row) => {
      doc
        .fontSize(10)
        .text(`${row.fechaInicio} a ${row.fechaFin}: ${row.cumplimiento.toFixed(2)}% (${row.completados}/${row.programados})`);
    });
  }

  doc.end();
  return done;
}

export async function renderProgressXlsx(data: ProgressReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tybacha';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Resumen');
  summary.columns = [
    { header: 'Campo', key: 'field', width: 28 },
    { header: 'Valor', key: 'value', width: 40 },
  ];
  summary.addRows([
    { field: 'ID adulto mayor', value: data.adultoMayor.idAdultoMayor },
    { field: 'Nombres', value: data.adultoMayor.nombres },
    { field: 'Apellidos', value: data.adultoMayor.apellidos },
    { field: 'Fecha nacimiento', value: data.adultoMayor.fechaNacimiento },
    { field: 'Genero', value: data.adultoMayor.genero },
    { field: 'Estado', value: data.adultoMayor.estado },
  ]);

  const sft = workbook.addWorksheet('SFT');
  sft.columns = [
    { header: 'Fecha', key: 'fechaAplicacion', width: 24 },
    { header: 'Prueba', key: 'prueba', width: 36 },
    { header: 'Valor', key: 'valor', width: 16 },
    { header: 'Unidad', key: 'unidad', width: 16 },
  ];
  sft.addRows(data.sft);

  const plans = workbook.addWorksheet('Planes');
  plans.columns = [
    { header: 'Titulo', key: 'titulo', width: 36 },
    { header: 'Estado', key: 'estado', width: 18 },
    { header: 'Dificultad', key: 'nivelDificultad', width: 18 },
    { header: 'Creado en', key: 'creadoEn', width: 24 },
  ];
  plans.addRows(data.planes);

  const progress = workbook.addWorksheet('Progreso');
  progress.columns = [
    { header: 'Periodo', key: 'periodo', width: 16 },
    { header: 'Fecha inicio', key: 'fechaInicio', width: 16 },
    { header: 'Fecha fin', key: 'fechaFin', width: 16 },
    { header: 'Programados', key: 'programados', width: 14 },
    { header: 'Completados', key: 'completados', width: 14 },
    { header: 'Omitidos', key: 'omitidos', width: 14 },
    { header: 'Cumplimiento %', key: 'cumplimiento', width: 18 },
  ];
  progress.addRows(data.progreso);

  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

