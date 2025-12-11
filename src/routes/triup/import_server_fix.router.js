// src/routes/triup/import_server_fix.router.js
import { Router } from 'express';
import { readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// ====== PATH JSON จาก fetch-all ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '..', 'scripts', 'json');

const COFUNDERS_JSON_PATH = path.join(OUTPUT_DIR, 'cofunders.json');
const DEPARTMENTS_JSON_PATH = path.join(OUTPUT_DIR, 'departments.json');
const EDUCATIONLEVELS_JSON_PATH = path.join(OUTPUT_DIR, 'educationlevels.json');
const FINDINGDETAILLISTS_JSON_PATH = path.join(
  OUTPUT_DIR,
  'findingdetaillists.json',
);
const FUNDERS_JSON_PATH = path.join(OUTPUT_DIR, 'funders.json');
const PROVINCE_JSON_PATH = path.join(OUTPUT_DIR, 'province.json');
const GROUPSTUDIES_JSON_PATH = path.join(OUTPUT_DIR, 'groupstudies.json');
const MAINSTUDIES_JSON_PATH = path.join(OUTPUT_DIR, 'mainstudies.json');
const SUBSTUDIES_JSON_PATH = path.join(OUTPUT_DIR, 'substudies.json');
const TARGET_AUDIENCES_JSON_PATH = path.join(
  OUTPUT_DIR,
  'target_audiences.json',
);
const TIME_SETTINGS_JSON_PATH = path.join(OUTPUT_DIR, 'time_settings.json');
const ROLES_JSON_PATH = path.join(OUTPUT_DIR, 'roles.json');
const PREFIXS_JSON_PATH = path.join(OUTPUT_DIR, 'prefixs.json');

// ===== helpers =====
function toStr(v) {
  if (v === undefined || v === null) return null;
  return String(v);
}

function truncate(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * เอาโครง JSON ที่ถูกห่อโดย fetch-all มาคลี่ให้เหลือ data จริง
 * - ถ้าเป็น { fetchedAt, key, url, data: { data: [...] } } -> คืน [... ]
 * - ถ้าเป็น { fetchedAt, key, url, data: {...} } -> คืน {...}
 * - ถ้าไม่มี data ก็คืน root เดิม
 */
function extractData(root) {
  if (root && typeof root === 'object') {
    if ('data' in root) {
      const inner = root.data;
      if (inner && typeof inner === 'object' && 'data' in inner) {
        return inner.data;
      }
      return inner;
    }
  }
  return root;
}

export function createImportServerFixRouter(prisma) {
  const router = Router();

  // ========== cofunders ==========
  async function importCofunders() {
    const raw = await readFile(COFUNDERS_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('cofunders.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.cofunders.create({
          data: {
            cof_pk_uuid: randomUUID(),
            id: null,
            name: truncate(toStr(item.name), 255),
          },
        });
      } else {
        const existing = await prisma.cofunders.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.cofunders.update({
            where: { cof_pk_uuid: existing.cof_pk_uuid },
            data: {
              id,
              name: truncate(toStr(item.name), 255),
            },
          });
        } else {
          await prisma.cofunders.create({
            data: {
              cof_pk_uuid: randomUUID(),
              id,
              name: truncate(toStr(item.name), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== departments ==========
  async function importDepartments() {
    const raw = await readFile(DEPARTMENTS_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('departments.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.departments.create({
          data: {
            dep_pk_uuid: randomUUID(),
            id: null,
            name: truncate(toStr(item.name), 255),
          },
        });
      } else {
        const existing = await prisma.departments.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.departments.update({
            where: { dep_pk_uuid: existing.dep_pk_uuid },
            data: {
              id,
              name: truncate(toStr(item.name), 255),
            },
          });
        } else {
          await prisma.departments.create({
            data: {
              dep_pk_uuid: randomUUID(),
              id,
              name: truncate(toStr(item.name), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== educationlevels ==========
  async function importEducationlevels() {
    const raw = await readFile(EDUCATIONLEVELS_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('educationlevels.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.educationlevels.create({
          data: {
            ecl_pk_uuid: randomUUID(),
            id: null,
            title: truncate(toStr(item.title), 255),
          },
        });
      } else {
        const existing = await prisma.educationlevels.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.educationlevels.update({
            where: { ecl_pk_uuid: existing.ecl_pk_uuid },
            data: {
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        } else {
          await prisma.educationlevels.create({
            data: {
              ecl_pk_uuid: randomUUID(),
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== findingdetaillists ==========
  async function importFindingdetaillists() {
    const raw = await readFile(FINDINGDETAILLISTS_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('findingdetaillists.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.findingdetaillists.create({
          data: {
            fdl_pk_uuid: randomUUID(),
            id: null,
            title: truncate(toStr(item.title), 255),
          },
        });
      } else {
        const existing = await prisma.findingdetaillists.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.findingdetaillists.update({
            where: { fdl_pk_uuid: existing.fdl_pk_uuid },
            data: {
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        } else {
          await prisma.findingdetaillists.create({
            data: {
              fdl_pk_uuid: randomUUID(),
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== funders (data เป็น object) ==========
  async function importFunders() {
    const raw = await readFile(FUNDERS_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error('funders.json: data is not object');
    }

    const items = Object.values(data);
    let count = 0;

    for (const item of items) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.funder.create({
          data: {
            fun_pk_uuid: randomUUID(),
            id: null,
            title: truncate(toStr(item.title), 255),
          },
        });
      } else {
        const existing = await prisma.funder.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.funder.update({
            where: { fun_pk_uuid: existing.fun_pk_uuid },
            data: {
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        } else {
          await prisma.funder.create({
            data: {
              fun_pk_uuid: randomUUID(),
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== province → address ==========
  async function importProvincesToAddress() {
    const raw = await readFile(PROVINCE_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('province.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.address.create({
          data: {
            ad_pk_uuid: randomUUID(),
            id: null,
            title: truncate(toStr(item.name), 255),
          },
        });
      } else {
        const existing = await prisma.address.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.address.update({
            where: { ad_pk_uuid: existing.ad_pk_uuid },
            data: {
              id,
              title: truncate(toStr(item.name), 255),
            },
          });
        } else {
          await prisma.address.create({
            data: {
              ad_pk_uuid: randomUUID(),
              id,
              title: truncate(toStr(item.name), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== groupstudies ==========
  async function importGroupstudies() {
    const raw = await readFile(GROUPSTUDIES_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('groupstudies.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.groupstudies.create({
          data: {
            group_pk_uuid: randomUUID(),
            id: null,
            title: truncate(toStr(item.title), 255),
          },
        });
      } else {
        const existing = await prisma.groupstudies.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.groupstudies.update({
            where: { group_pk_uuid: existing.group_pk_uuid },
            data: {
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        } else {
          await prisma.groupstudies.create({
            data: {
              group_pk_uuid: randomUUID(),
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== mainstudies ==========
  async function importMainstudies() {
    const raw = await readFile(MAINSTUDIES_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('mainstudies.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.mainstudies.create({
          data: {
            main_pk_uuid: randomUUID(),
            id: null,
            title: truncate(toStr(item.title), 255),
          },
        });
      } else {
        const existing = await prisma.mainstudies.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.mainstudies.update({
            where: { main_pk_uuid: existing.main_pk_uuid },
            data: {
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        } else {
          await prisma.mainstudies.create({
            data: {
              main_pk_uuid: randomUUID(),
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== substudies ==========
  async function importSubstudies() {
    const raw = await readFile(SUBSTUDIES_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('substudies.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.substudies.create({
          data: {
            sub_pk_uuid: randomUUID(),
            id: null,
            title: truncate(toStr(item.title), 255),
          },
        });
      } else {
        const existing = await prisma.substudies.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.substudies.update({
            where: { sub_pk_uuid: existing.sub_pk_uuid },
            data: {
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        } else {
          await prisma.substudies.create({
            data: {
              sub_pk_uuid: randomUUID(),
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== target_audiences ==========
  async function importTargetAudiences() {
    const raw = await readFile(TARGET_AUDIENCES_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('target_audiences.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.target_audiences.create({
          data: {
            target_aud_pk_uuid: randomUUID(),
            id: null,
            title: truncate(toStr(item.title), 255),
          },
        });
      } else {
        const existing = await prisma.target_audiences.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.target_audiences.update({
            where: { target_aud_pk_uuid: existing.target_aud_pk_uuid },
            data: {
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        } else {
          await prisma.target_audiences.create({
            data: {
              target_aud_pk_uuid: randomUUID(),
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== time_settings ==========
  async function importTimeSettings() {
    const raw = await readFile(TIME_SETTINGS_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('time_settings.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.time_settings.create({
          data: {
            ts_pk_uuid: randomUUID(),
            id: null,
            title: truncate(toStr(item.title), 255),
          },
        });
      } else {
        const existing = await prisma.time_settings.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.time_settings.update({
            where: { ts_pk_uuid: existing.ts_pk_uuid },
            data: {
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        } else {
          await prisma.time_settings.create({
            data: {
              ts_pk_uuid: randomUUID(),
              id,
              title: truncate(toStr(item.title), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== roles ==========
  async function importRoles() {
    const raw = await readFile(ROLES_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('roles.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.roles.create({
          data: {
            roles_pk_uuid: randomUUID(),
            id: null,
            name_th: truncate(toStr(item.name_th), 255),
          },
        });
      } else {
        const existing = await prisma.roles.findFirst({
          where: { id },
        });

        if (existing) {
          await prisma.roles.update({
            where: { roles_pk_uuid: existing.roles_pk_uuid },
            data: {
              id,
              name_th: truncate(toStr(item.name_th), 255),
            },
          });
        } else {
          await prisma.roles.create({
            data: {
              roles_pk_uuid: randomUUID(),
              id,
              name_th: truncate(toStr(item.name_th), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== prefixs ==========
  async function importPrefixs() {
    const raw = await readFile(PREFIXS_JSON_PATH, 'utf8');
    const root = JSON.parse(raw);
    const data = extractData(root);

    if (!Array.isArray(data)) {
      throw new Error('prefixs.json: data is not array');
    }

    let count = 0;

    for (const item of data) {
      const id = item.id ?? null;

      if (id === null) {
        await prisma.prefixs.create({
          data: {
            prefixs_pk_uuid: randomUUID(),
            id: null,
            prefix_name: truncate(toStr(item.prefix_name), 255),
          },
        });
      } else {
        const existing = await prisma.prefixs.findUnique({
          where: { id },
        });

        if (existing) {
          await prisma.prefixs.update({
            where: { prefixs_pk_uuid: existing.prefixs_pk_uuid },
            data: {
              id,
              prefix_name: truncate(toStr(item.prefix_name), 255),
            },
          });
        } else {
          await prisma.prefixs.create({
            data: {
              prefixs_pk_uuid: randomUUID(),
              id,
              prefix_name: truncate(toStr(item.prefix_name), 255),
            },
          });
        }
      }

      count++;
    }

    return count;
  }

  // ========== GET /api/scripts/import-server-fix ==========
  // ไม่ต้องใช้ session, ไม่ต้อง login
  router.get('/import-server-fix', async (_req, res) => {
    try {
      const startedAt = new Date().toISOString();
      const counts = {};

      counts.cofunders = await importCofunders();
      counts.departments = await importDepartments();
      counts.educationlevels = await importEducationlevels();
      counts.findingdetaillists = await importFindingdetaillists();
      counts.funder = await importFunders();
      counts.address = await importProvincesToAddress();
      counts.groupstudies = await importGroupstudies();
      counts.mainstudies = await importMainstudies();
      counts.substudies = await importSubstudies();
      counts.target_audiences = await importTargetAudiences();
      counts.time_settings = await importTimeSettings();
      counts.roles = await importRoles();
      counts.prefixs = await importPrefixs();

      const finishedAt = new Date().toISOString();

      return res.json({
        success: true,
        startedAt,
        finishedAt,
        message:
          'Imported/updated master tables successfully (upsert by id, from JSON files of fetch-all).',
        counts,
      });
    } catch (err) {
      console.error('import-server-fix error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || String(err),
      });
    }
  });

  return router;
}
