import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: Number(process.env.TIDB_PORT),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: process.env.TIDB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  decimalNumbers: true,
  dateStrings: true,
  namedPlaceholders: true,
});

interface ComplianceRow extends mysql.RowDataPacket {
  ejercicios_programados: number;
  ejercicios_completados: number;
  ejercicios_omitidos: number;
  ejercicios_parciales: number;
}

async function recalculateWeeklyStats(
  connection: mysql.PoolConnection,
  idAdultoMayor: number,
  idPlanEjercicio: number,
  fecha: string,
): Promise<{ programmed: number; completed: number; percentage: number } | null> {
  await connection.query(
    `set @week_start := date_sub(:fecha, interval weekday(:fecha) day)`,
    { fecha },
  );
  await connection.query(
    `set @week_end := date_add(@week_start, interval 6 day)`,
  );

  const [rows] = await connection.query<ComplianceRow[]>(
    `with scheduled as (
       select ep.id_ejercicio_plan,
              ep.dia_semana,
              date_add(@week_start, interval (case ep.dia_semana
                when 'lunes'    then 0
                when 'martes'   then 1
                when 'miercoles' then 2
                when 'jueves'   then 3
                when 'viernes'  then 4
                when 'sabado'   then 5
                when 'domingo'  then 6
              end) day) as expected_date
       from plan_ejercicio pe
       join ejercicio_plan ep
         on ep.id_plan_ejercicio = pe.id_plan_ejercicio
        and ep.activo = 1
       where pe.id_adulto_mayor = :idAdultoMayor
         and pe.estado not in ('finalizado', 'cancelado')
     )
     select count(*) as ejercicios_programados,
            sum(case when rep.estado = 'completado' then 1 else 0 end) as ejercicios_completados,
            sum(case when rep.estado = 'omitido'   then 1 else 0 end) as ejercicios_omitidos,
            sum(case when rep.estado = 'parcial'   then 1 else 0 end) as ejercicios_parciales
     from scheduled s
     left join registro_ejercicio_plan rep
       on rep.fecha_programada = s.expected_date
      and rep.id_adulto_mayor = :idAdultoMayor
     where s.expected_date <= current_date`,
    { idAdultoMayor },
  );

  const stats = rows[0] ?? {
    ejercicios_programados: 0,
    ejercicios_completados: 0,
    ejercicios_omitidos: 0,
    ejercicios_parciales: 0,
  };

  const completed = Number(stats.ejercicios_completados ?? 0);
  const programmed = Number(stats.ejercicios_programados ?? 0);
  const percentage = programmed > 0 ? (completed / programmed) * 100 : 0;

  await connection.query(
    `insert into estadistica_progreso
      (id_adulto_mayor, id_plan_ejercicio, tipo_periodo, fecha_inicio, fecha_fin,
       ejercicios_programados, ejercicios_completados, ejercicios_omitidos, porcentaje_cumplimiento, datos_metricas)
     values
      (:idAdultoMayor, :idPlanEjercicio, 'semana', @week_start, @week_end,
       :programmed, :completed, :omitted, :percentage, :metrics)
     on duplicate key update
       ejercicios_programados = values(ejercicios_programados),
       ejercicios_completados = values(ejercicios_completados),
       ejercicios_omitidos    = values(ejercicios_omitidos),
       porcentaje_cumplimiento = values(porcentaje_cumplimiento),
       datos_metricas = values(datos_metricas),
       calculado_en = current_timestamp(3)`,
    {
      idAdultoMayor,
      idPlanEjercicio,
      programmed,
      completed,
      omitted: Number(stats.ejercicios_omitidos ?? 0),
      percentage,
      metrics: JSON.stringify({
        parciales: Number(stats.ejercicios_parciales ?? 0),
      }),
    },
  );

  return { programmed, completed, percentage };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`=== Backfill de estadistica_progreso ${dryRun ? '(DRY RUN)' : ''} ===\n`);

  const connection = await pool.getConnection();
  try {
    // Get all adults with active plans (not finalizado/cancelado)
    const [adults] = await connection.query<mysql.RowDataPacket[]>(
      `select pe.id_adulto_mayor, pe.id_plan_ejercicio, pe.estado, pe.titulo
       from plan_ejercicio pe
       where pe.estado not in ('finalizado', 'cancelado')
       order by pe.id_adulto_mayor`,
    );

    console.log(`Planes a recalcular: ${adults.length}`);
    for (const plan of adults) {
      console.log(`  - Adulto ${plan.id_adulto_mayor}: plan ${plan.id_plan_ejercicio} (${plan.estado}) "${plan.titulo}"`);
    }
    console.log('');

    // Get all distinct weeks with activity for each adult
    const [weeks] = await connection.query<mysql.RowDataPacket[]>(
      `select id_adulto_mayor,
              min(fecha_programada) as min_fecha,
              max(fecha_programada) as max_fecha
       from registro_ejercicio_plan
       group by id_adulto_mayor`,
    );

    let totalUpdated = 0;
    let totalChanged = 0;

    for (const week of weeks) {
      const idAdultoMayor = week.id_adulto_mayor;
      const plan = adults.find((a) => a.id_adulto_mayor === idAdultoMayor);
      if (!plan) {
        console.log(`Adulto ${idAdultoMayor}: sin plan activo, saltando`);
        continue;
      }

      // Generate all weeks between min and max fecha
      const minDate = new Date(week.min_fecha);
      const maxDate = new Date(week.max_fecha);
      const current = new Date(minDate);
      // Go back to Monday of the min week
      current.setDate(current.getDate() - current.getDay() + 1);

      while (current <= maxDate) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const fecha = weekStart.toISOString().slice(0, 10);

        // Get current stats for comparison
        const [currentStats] = await connection.query<mysql.RowDataPacket[]>(
          `select ejercicios_programados, ejercicios_completados, porcentaje_cumplimiento
           from estadistica_progreso
           where id_adulto_mayor = :idAdultoMayor
             and fecha_inicio = :weekStart`,
          { idAdultoMayor, weekStart: fecha },
        );

        const oldProgrammed = currentStats[0]?.ejercicios_programados ?? 0;
        const oldCompleted = currentStats[0]?.ejercicios_completados ?? 0;
        const oldPercentage = currentStats[0]?.porcentaje_cumplimiento ?? 0;

        if (!dryRun) {
          const result = await recalculateWeeklyStats(
            connection,
            idAdultoMayor,
            plan.id_plan_ejercicio,
            fecha,
          );

          if (result) {
            totalUpdated++;
            if (result.programmed !== oldProgrammed || result.completed !== oldCompleted) {
              totalChanged++;
              console.log(
                `  Adulto ${idAdultoMayor} semana ${fecha}: ` +
                `${oldProgrammed}prog/${oldCompleted}comp (${oldPercentage}%) → ` +
                `${result.programmed}prog/${result.completed}comp (${result.percentage.toFixed(1)}%)`,
              );
            }
          }
        } else {
          // Dry run: simulate the CTE query
          const [simRows] = await connection.query<ComplianceRow[]>(
            `with scheduled as (
               select ep.id_ejercicio_plan,
                      ep.dia_semana,
                      date_add(:weekStart, interval (case ep.dia_semana
                        when 'lunes'    then 0
                        when 'martes'   then 1
                        when 'miercoles' then 2
                        when 'jueves'   then 3
                        when 'viernes'  then 4
                        when 'sabado'   then 5
                        when 'domingo'  then 6
                      end) day) as expected_date
               from plan_ejercicio pe
               join ejercicio_plan ep
                 on ep.id_plan_ejercicio = pe.id_plan_ejercicio
                and ep.activo = 1
               where pe.id_adulto_mayor = :idAdultoMayor
                 and pe.estado not in ('finalizado', 'cancelado')
             )
             select count(*) as ejercicios_programados,
                    sum(case when rep.estado = 'completado' then 1 else 0 end) as ejercicios_completados,
                    sum(case when rep.estado = 'omitido'   then 1 else 0 end) as ejercicios_omitidos,
                    sum(case when rep.estado = 'parcial'   then 1 else 0 end) as ejercicios_parciales
             from scheduled s
             left join registro_ejercicio_plan rep
               on rep.fecha_programada = s.expected_date
              and rep.id_adulto_mayor = :idAdultoMayor
             where s.expected_date <= current_date`,
            { idAdultoMayor, weekStart: fecha },
          );

          const simStats = simRows[0];
          const simProgrammed = Number(simStats?.ejercicios_programados ?? 0);
          const simCompleted = Number(simStats?.ejercicios_completados ?? 0);
          const simPercentage = simProgrammed > 0 ? (simCompleted / simProgrammed) * 100 : 0;

          if (simProgrammed !== oldProgrammed || simCompleted !== oldCompleted) {
            totalChanged++;
            console.log(
              `  Adulto ${idAdultoMayor} semana ${fecha}: ` +
              `${oldProgrammed}prog/${oldCompleted}comp (${oldPercentage}%) → ` +
              `${simProgrammed}prog/${simCompleted}comp (${simPercentage.toFixed(1)}%)`,
            );
          }
        }

        // Move to next week
        current.setDate(current.getDate() + 7);
      }
    }

    console.log(`\n=== Resumen ===`);
    console.log(`Semanas ${dryRun ? 'evaluadas' : 'actualizadas'}: ${dryRun ? totalChanged : totalUpdated}`);
    console.log(`Semanas con cambio: ${totalChanged}`);
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
