import { PrismaClient, UserRole, TaskStatus, TaskType, TechStack, Priority } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const ID_USER_SAG = "00000000-0000-0000-0000-000000000001";
const ID_USER_DEV = "00000000-0000-0000-0000-000000000002";

const rawData = [
  { tpo: TaskType.I_MODAPL, nro: 1745, desc: 'Facturación - Facturación', item: 'Cuadro Tarifario - Desarrollar metodo de carga masiva', asignado: 'NMC', hs: 2, status: TaskStatus.BACKLOG },
  { tpo: TaskType.I_CASO, nro: 4553, desc: 'Longitud Ruta Med', item: 'Desarrollar', asignado: 'NMC', hs: 2, status: TaskStatus.TODO },
  { tpo: TaskType.I_MODAPL, nro: 1744, desc: 'Mediciones - Modificaciones NewJass CI', item: 'Poder Calorifico - Desarrollar ABM para los renglones con validación de cabecera', asignado: 'NMC', hs: 16, status: TaskStatus.IN_PROGRESS },
  { tpo: TaskType.I_MODAPL, nro: 1744, desc: 'Mediciones - Modificaciones NewJass CI', item: 'Toque en la pantalla del Em Ser', asignado: 'SAG', hs: 4, status: TaskStatus.IN_PROGRESS },
  { tpo: TaskType.I_MODAPL, nro: 1744, desc: 'Mediciones - Modificaciones NewJass CI', item: 'Consumo diarios: carga de consumos diarios en pantalla y recálculo en caliente', asignado: 'SAG', hs: 4, status: TaskStatus.IN_PROGRESS },
  { tpo: TaskType.I_MODAPL, nro: 1744, desc: 'Mediciones - Modificaciones NewJass CI', item: 'Objeto de Asignacion y conexion: Cambiar medidor, Retirar medidor y Retirar conexion Agregar Baremo a las pantallas', asignado: 'SAG', hs: 32, status: TaskStatus.IN_PROGRESS },
  { tpo: TaskType.I_MODAPL, nro: 1744, desc: 'Mediciones - Modificaciones NewJass CI', item: 'Desarrollar un nuevo objeto Estados Medidos Equipo de Medición...', asignado: 'SAG', hs: 80, status: TaskStatus.IN_PROGRESS },
  { tpo: TaskType.I_MODAPL, nro: 1744, desc: 'Mediciones - Modificaciones NewJass CI', item: 'Migrador de Histórico de Unidades', asignado: 'SAG', hs: 16, status: TaskStatus.IN_PROGRESS },
  { tpo: TaskType.I_MODAPL, nro: 1748, desc: 'Facturación - Contabilidad', item: 'Tracking list - Ajustar la impresión de los servicios ICH*', asignado: 'FAF', hs: 4, status: TaskStatus.TODO },
  { tpo: TaskType.I_MODAPL, nro: 1748, desc: 'Facturación - Contabilidad', item: 'Tracking list - Unico porcentaje por provincia', asignado: 'FAF', hs: 80, status: TaskStatus.TODO },
  { tpo: TaskType.I_CONS, nro: 7977, desc: 'Error en facturación', item: 'Nulo en un importe de un cambio de tarifa - Problema con el rango mínimo', asignado: 'FAF', hs: 8, status: TaskStatus.REVIEW },
  { tpo: TaskType.I_MODAPL, nro: 1754, desc: 'Facturación - Recaudación', item: 'Recargos', asignado: 'FAF', hs: 40, status: TaskStatus.DONE },
  { tpo: TaskType.I_MODAPL, nro: 1754, desc: 'Facturación - Recaudación', item: 'Migrar z80facturas_agr_reca', asignado: 'FAF', hs: 16, status: TaskStatus.DONE },
];

async function main() {
  console.log("🚀 Iniciando Seed ALM...");

  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. Crear Usuarios
  console.log("👤 Creando usuarios...");
  await db.user.upsert({
    where: { id: ID_USER_SAG },
    update: {
      email: "sebastian.galarza@sisa.com.ar",
      username: "SAG",
      role: UserRole.ADMIN,
      password: hashedPassword,
    },
    create: {
      id: ID_USER_SAG,
      email: "sebastian.galarza@sisa.com.ar",
      username: "SAG",
      name: "Sebastian Galarza",
      role: UserRole.ADMIN,
      password: hashedPassword,
    },
  });

  await db.user.upsert({
    where: { id: ID_USER_DEV },
    update: {
      email: "dev@sisa.com.ar",
      username: "DEV",
      name: "Dev Sisa",
      role: UserRole.DEV,
      password: hashedPassword,
    },
    create: {
      id: ID_USER_DEV,
      email: "dev@sisa.com.ar",
      username: "DEV",
      name: "Dev Sisa",
      role: UserRole.DEV,
      password: hashedPassword,
    },
  });

  // 2. Procesar y Agrupar Datos
  console.log("📊 Cargando incidencias y subtasks...");
  await db.incidence.deleteMany();

  const groupedTasks: Record<string, {
    type: TaskType,
    externalId: number,
    title: string,
    items: string[],
    assignees: Set<string>,
    totalHs: number,
    status: TaskStatus
  }> = {};

  for (const row of rawData) {
    const key = `${row.tpo}-${row.nro}`;
    if (!groupedTasks[key]) {
      groupedTasks[key] = {
        type: row.tpo as TaskType,
        externalId: row.nro,
        title: row.desc,
        items: [],
        assignees: new Set<string>(),
        totalHs: 0,
        status: row.status as TaskStatus
      };
    }
    groupedTasks[key].items.push(row.item);
    groupedTasks[key].totalHs += row.hs;

    if (row.asignado === 'SAG') {
      groupedTasks[key].assignees.add(ID_USER_SAG);
    } else {
      groupedTasks[key].assignees.add(ID_USER_DEV);
    }
  }

  for (const key in groupedTasks) {
    const task = groupedTasks[key];

    const incidence = await db.incidence.create({
      data: {
        type: task.type,
        externalId: task.externalId,
        title: task.title,
        status: task.status,
        priority: Priority.MEDIUM,
        technology: TechStack.WEB,
        estimatedTime: task.totalHs,
        description: `Este es el backlog técnico para **${task.title}**.
Se requiere implementar la lógica necesaria para cumplir con los puntos del checklist.
Para más información, consultar la [documentación técnica](https://wiki.sisa.com.ar).`,
        assignees: {
          connect: Array.from(task.assignees).map(id => ({ id }))
        },
        subTasks: {
          create: task.items.map(title => ({ title }))
        }
      }
    });
  }

  console.log("✅ Seed ALM finalizado con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
