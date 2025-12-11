// src/routes/triup/import_server_user.router.js
import { Router } from 'express';
import { readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// ====== JSON DIR (ใช้ไฟล์จาก fetch-all) ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_DIR = path.join(__dirname, '..', 'scripts', 'json');

const USERS_JSON_PATH = path.join(JSON_DIR, 'users.json');
const RESEARCHER_JSON_PATH = path.join(JSON_DIR, 'researcher.json');

// helper: ดึง array จากไฟล์ที่มาจาก fetch-all
async function readJsonArray(filePath, label) {
  const raw = await readFile(filePath, 'utf8');
  const json = JSON.parse(raw);

  const lvl1 = json && typeof json === 'object' ? json.data ?? json : json;
  const arr = Array.isArray(lvl1)
    ? lvl1
    : Array.isArray(lvl1?.data)
    ? lvl1.data
    : null;

  if (!Array.isArray(arr)) {
    throw new Error(`${label}: data is not array`);
  }
  return arr;
}

export function createImportServerUserRouter(prisma) {
  const router = Router();

  // ========== import users ==========
  async function importUsers() {
    const items = await readJsonArray(USERS_JSON_PATH, 'users.json');

    // ลบข้อมูลเดิมก่อน
    await prisma.users.deleteMany({});

    let count = 0;

    for (const item of items) {
      const userId =
        item.user_id !== undefined && item.user_id !== null
          ? String(item.user_id)
          : null;

      await prisma.users.create({
        data: {
          user_pk_uuid: randomUUID(),
          user_id: userId,
          email: item.email,
          card_id: item.card_id,
          default_role_id: item.default_role_id,
          fullname: item.fullname,
        },
      });

      count++;
    }

    return count;
  }

  // ========== import researcher ==========
  async function importResearchers() {
    const items = await readJsonArray(
      RESEARCHER_JSON_PATH,
      'researcher.json',
    );

    // ลบข้อมูลเดิมก่อน
    await prisma.researcher.deleteMany({});

    let count = 0;

    for (const item of items) {
      const userId =
        item.user_id !== undefined && item.user_id !== null
          ? String(item.user_id)
          : null;

      const departmentId =
        item.department_id !== undefined && item.department_id !== null
          ? String(item.department_id)
          : null;

      await prisma.researcher.create({
        data: {
          res_pk_uuid: randomUUID(),
          user_id: userId,
          email: item.email,
          card_id: item.card_id,
          default_role_id: item.default_role_id,
          department_id: departmentId,
          fullname: item.fullname,
          department_name: item.department_name ?? null,
        },
      });

      count++;
    }

    return count;
  }

  // ========== GET /api/scripts/import-server-user ==========
  router.get('/import-server-user', async (_req, res) => {
    try {
      const usersCount = await importUsers();
      const researcherCount = await importResearchers();

      return res.json({
        success: true,
        message: 'Imported users & researcher successfully',
        counts: {
          users: usersCount,
          researcher: researcherCount,
        },
      });
    } catch (err) {
      console.error('import-server-user error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || String(err),
      });
    }
  });

  return router;
}
