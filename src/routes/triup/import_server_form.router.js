// src/routes/triup/import_server_form.router.js
import { Router } from 'express';
import { readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// ====== JSON DIR (ใช้ไฟล์จาก fetch-all) ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_DIR = path.join(__dirname, '..', 'scripts', 'json');

const FORM_NEW_FINDINGS_JSON_PATH = path.join(
  JSON_DIR,
  'form_new_findings.json',
);
const FORM_RESEARCH_OWNER_JSON_PATH = path.join(
  JSON_DIR,
  'form_research_owner.json',
);
const FORM_RESEARCH_PLAN_JSON_PATH = path.join(
  JSON_DIR,
  'form_research_plan.json',
);

// ====== helpers ======
function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function toDate(v) {
  if (!v) return null;
  const s = String(v).trim().replace(' ', 'T');
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toStr(v) {
  if (v === undefined || v === null) return null;
  return String(v);
}

function truncate(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

// ดึง array จากไฟล์ JSON ที่มาจาก fetch-all
// รองรับทั้งรูปแบบ { fetchedAt, key, url, data: [] }
// หรือ { fetchedAt, key, url, data: { data: [] } }
async function readJsonArray(filePath, label) {
  const raw = await readFile(filePath, 'utf8');
  const json = JSON.parse(raw);

  // ห่อรองรับทั้งเคส
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

// map field ของไฟล์ใน JSON → file_uploads
function normalizeFileMeta(f) {
  if (!f || typeof f !== 'object') return {};

  const fu_name = f.fu_name ?? f.name ?? null;
  const fu_path = f.fu_path ?? f.path ?? null;
  const fu_ext = f.fu_ext ?? f.ext ?? null;
  const fu_mime = f.fu_mime ?? f.mime ?? f.mimetype ?? null;
  const fu_size_raw = f.fu_size ?? f.size ?? null;
  const fu_size =
    fu_size_raw !== undefined && fu_size_raw !== null
      ? BigInt(fu_size_raw)
      : null;
  const url = f.url ?? null;

  return { fu_name, fu_path, fu_ext, fu_mime, fu_size, url };
}

// ลบ pivot + file_uploads เดิมของ record นั้น ๆ (กรณี update)
async function deleteFilesWithPivot(tx, uploadableType, uploadableId) {
  if (!uploadableId) return;

  const pivots = await tx.pivot.findMany({
    where: {
      uploadable_type: uploadableType,
      uploadable_id: uploadableId,
    },
  });

  if (!pivots.length) return;

  const fuIds = [
    ...new Set(
      pivots.map((p) => p.fu_id).filter((id) => id !== null && id !== undefined),
    ),
  ];

  await tx.pivot.deleteMany({
    where: {
      uploadable_type: uploadableType,
      uploadable_id: uploadableId,
    },
  });

  if (fuIds.length > 0) {
    await tx.file_uploads.deleteMany({
      where: { fu_id: { in: fuIds } },
    });
  }
}

// สร้าง file_uploads + pivot แล้วคืน array ของ fu record
async function saveFilesWithPivot(tx, files, uploadableType, uploadableId) {
  if (!Array.isArray(files) || files.length === 0 || !uploadableId) return [];

  const created = [];

  for (const f of files) {
    const meta = normalizeFileMeta(f);

    const fu = await tx.file_uploads.create({
      data: {
        fu_pk_uuid: randomUUID(),
        fu_name: truncate(meta.fu_name, 255),
        fu_path: truncate(meta.fu_path, 255),
        fu_ext: truncate(meta.fu_ext, 50),
        fu_mime: truncate(meta.fu_mime, 100),
        fu_size: meta.fu_size,
        url: truncate(meta.url, 255),
        create_by: null,
        pivot_id: null,
      },
    });

    await tx.pivot.create({
      data: {
        pivot_pk_uuid: randomUUID(),
        uploadable_id: uploadableId,
        uploadable_type: truncate(uploadableType, 255),
        fu_id: fu.fu_id,
      },
    });

    created.push(fu);
  }

  return created;
}

// ====== สร้าง Router ======
export function createImportServerFormRouter(prisma) {
  const router = Router();

  // ----- 1) import form_new_findings -----
  async function importFormNewFindings() {
    const items = await readJsonArray(
      FORM_NEW_FINDINGS_JSON_PATH,
      'form_new_findings.json',
    );

    let count = 0;

    for (const item of items) {
      const formNewId = item.form_new_id ?? null;

      const data = {
        form_new_id: formNewId,
        report_code: truncate(toStr(item.report_code), 1255),
        report_title_th: truncate(toStr(item.report_title_th), 1255),
        report_title_en: truncate(toStr(item.report_title_en), 1255),
        createby: item.createBy ?? null,
        form_status_id: item.form_status_id ?? null,
        sla_at: toDate(item.sla_at),
        sla_by: item.sla_by ?? null,
        status: truncate(toStr(item.status), 1255),
      };

      if (formNewId !== null) {
        const existing = await prisma.form_new_findings.findFirst({
          where: { form_new_id: formNewId },
        });

        if (existing) {
          await prisma.form_new_findings.update({
            where: { findings_pk_uuid: existing.findings_pk_uuid },
            data,
          });
        } else {
          await prisma.form_new_findings.create({
            data: {
              findings_pk_uuid: randomUUID(),
              ...data,
            },
          });
        }
      } else {
        await prisma.form_new_findings.create({
          data: {
            findings_pk_uuid: randomUUID(),
            ...data,
          },
        });
      }

      count++;
    }

    return count;
  }

  // ----- 2) import form_research_plan + file_uploads + pivot -----
  async function importFormResearchPlan() {
    const items = await readJsonArray(
      FORM_RESEARCH_PLAN_JSON_PATH,
      'form_research_plan.json',
    );

    let count = 0;

    for (const item of items) {
      await prisma.$transaction(async (tx) => {
        const commonData = {
          form_plan_id: item.form_plan_id ?? null,
          form_plan_form_new_id: item.form_plan_form_new_id ?? null,
          form_plan_code: truncate(toStr(item.form_plan_code), 1255),

          form_plan_fullname: truncate(toStr(item.form_plan_fullname), 1255),
          form_plan_lastname: truncate(toStr(item.form_plan_lastname), 1255),
          form_plan_prefix: toInt(item.form_plan_prefix),

          form_plan_idcard: truncate(toStr(item.form_plan_idcard), 1255),
          form_plan_department: truncate(
            toStr(item.form_plan_department),
            1255,
          ),
          form_plan_position: truncate(toStr(item.form_plan_position), 1255),
          form_plan_tel: truncate(toStr(item.form_plan_tel), 1255),
          form_plan_email: truncate(toStr(item.form_plan_email), 1255),

          form_plan_type_status: truncate(
            toStr(item.form_plan_type_status),
            1255,
          ),
          form_plan_type_status_other: truncate(
            toStr(item.form_plan_type_status_other),
            1255,
          ),

          form_plan_period: toInt(item.form_plan_period),
          form_plan_start_date: toDate(item.form_plan_start_date),

          form_plan_usage_value:
            item.form_plan_usage_value !== undefined &&
            item.form_plan_usage_value !== null
              ? String(item.form_plan_usage_value)
              : null,

          form_plan_target: item.form_plan_target ?? null,
          form_plan_target_check: truncate(
            toStr(item.form_plan_target_check),
            1255,
          ),
          form_plan_target_other: truncate(
            toStr(item.form_plan_target_other),
            1255,
          ),
          form_plan_user_target: truncate(
            toStr(item.form_plan_user_target),
            1255,
          ),

          form_plan_result: item.form_plan_result ?? null,
          form_plan_result_check: truncate(
            toStr(item.form_plan_result_check),
            1255,
          ),
          form_plan_result_other: truncate(
            toStr(item.form_plan_result_other),
            1255,
          ),
          form_plan_user_result: truncate(
            toStr(item.form_plan_user_result),
            1255,
          ),

          form_plan_status: truncate(toStr(item.form_plan_status), 1255),
          form_plan_checked_by: toInt(item.form_plan_checked_by),
          form_plan_checked_date: toDate(item.form_plan_checked_date),

          form_plan_form_own_id: item.form_plan_form_own_id ?? null,
          form_plan_form_plan_id: item.form_plan_form_plan_id ?? null,
          form_plan_type: truncate(toStr(item.form_plan_type), 1255),
          form_plan_reason: item.form_plan_reason ?? null,
          form_plan_condition: toInt(item.form_plan_condition),

          form_plan_create_by: toInt(item.form_plan_create_by),
          form_plan_created_at: toDate(item.form_plan_created_at),
          form_plan_update_by: toInt(item.form_plan_update_by),
          form_plan_updated_at: toDate(item.form_plan_updated_at),
          form_plan_deleted_at: toDate(item.form_plan_deleted_at),

          fullname: truncate(toStr(item.fullname), 1255),

          objective: item.objective ? JSON.stringify(item.objective) : null,
          period: item.period
            ? truncate(JSON.stringify(item.period), 1255)
            : null,

          file_uploads: null,
        };

        let plan;

        if (
          item.form_plan_form_new_id !== null &&
          item.form_plan_form_new_id !== undefined
        ) {
          plan = await tx.form_research_plan.upsert({
            where: {
              form_plan_form_new_id: item.form_plan_form_new_id,
            },
            create: {
              plan_pk_uuid: randomUUID(),
              ...commonData,
            },
            update: {
              ...commonData,
            },
          });
        } else if (
          item.form_plan_id !== null &&
          item.form_plan_id !== undefined
        ) {
          plan = await tx.form_research_plan.upsert({
            where: {
              form_plan_id: item.form_plan_id,
            },
            create: {
              plan_pk_uuid: randomUUID(),
              ...commonData,
            },
            update: {
              ...commonData,
            },
          });
        } else {
          plan = await tx.form_research_plan.create({
            data: {
              plan_pk_uuid: randomUUID(),
              ...commonData,
            },
          });
        }

        await deleteFilesWithPivot(tx, 'form_research_plan', plan.plan_pk_id);

        const planFiles = await saveFilesWithPivot(
          tx,
          item.file_uploads || [],
          'form_research_plan',
          plan.plan_pk_id,
        );

        if (planFiles.length > 0) {
          await tx.form_research_plan.update({
            where: { plan_pk_uuid: plan.plan_pk_uuid },
            data: {
              file_uploads: planFiles[0].fu_id,
            },
          });
        }
      });

      count++;
    }

    return count;
  }

  // ----- 3) import form_research_owner + file_uploads + pivot -----
  async function importFormResearchOwner() {
    const items = await readJsonArray(
      FORM_RESEARCH_OWNER_JSON_PATH,
      'form_research_owner.json',
    );

    let count = 0;

    for (const item of items) {
      await prisma.$transaction(async (tx) => {
        const data = {
          form_own_id: item.form_own_id ?? null,
          form_own_code: truncate(toStr(item.form_own_code), 1255),
          form_own_form_id: item.form_own_form_id ?? null,

          form_own_prefix: toInt(item.form_own_prefix),
          form_own_fullname: truncate(toStr(item.form_own_fullname), 1255),
          form_own_lastname: truncate(toStr(item.form_own_lastname), 1255),

          form_own_co_owner: truncate(toStr(item.form_own_co_owner), 1255),
          form_own_co_owner_type: truncate(
            toStr(item.form_own_co_owner_type),
            1255,
          ),
          form_own_ownertype: truncate(
            toStr(item.form_own_ownertype),
            1255,
          ),

          form_own_co_prefix: toInt(item.form_own_co_prefix),
          form_own_co_name: truncate(toStr(item.form_own_co_name), 1255),
          form_own_co_lastname: truncate(
            toStr(item.form_own_co_lastname),
            1255,
          ),
          form_own_co_idcard_no: truncate(
            toStr(item.form_own_co_idcard_no),
            1255,
          ),
          form_own_co_department: truncate(
            toStr(item.form_own_co_department),
            1255,
          ),
          form_own_co_position: truncate(
            toStr(item.form_own_co_position),
            1255,
          ),
          form_own_co_tel: truncate(toStr(item.form_own_co_tel), 1255),
          form_own_co_mail: truncate(toStr(item.form_own_co_mail), 1255),

          form_own_status: truncate(toStr(item.form_own_status), 1255),
          form_own_checked_by: toInt(item.form_own_checked_by),
          form_own_checked_date: toDate(item.form_own_checked_date),
          form_own_date_approve: toDate(item.form_own_date_approve),

          form_own_form_plan_id: toInt(item.form_own_form_plan_id),

          is_ownership:
            item.is_ownership === undefined || item.is_ownership === null
              ? null
              : Boolean(Number(item.is_ownership)),

          form_own_create_by: toInt(item.form_own_create_by),
          form_own_created_at: toDate(item.form_own_created_at),
          form_own_update_by: toInt(item.form_own_update_by),
          form_own_updated_at: toDate(item.form_own_updated_at),
          form_own_deleted_at: toDate(item.form_own_deleted_at),

          form_new_id: item.form_new_id ?? null,

          form_own_form_name: truncate(toStr(item.form_own_form_name), 1255),
          status: truncate(toStr(item.status), 1255),
          fullname: truncate(toStr(item.fullname), 1255),
          form_owner_name: truncate(toStr(item.form_owner_name), 1255),
          form_own_department: truncate(
            toStr(item.form_own_department),
            1255,
          ),
          is_ownership_status: truncate(
            toStr(item.is_ownership_status),
            1255,
          ),

          objective: item.objective
            ? JSON.stringify(item.objective)
            : null,
          period: item.period
            ? truncate(JSON.stringify(item.period), 1255)
            : null,

          file_uploads_plan: null,
          file_uploads_contract: null,
          file_uploads_other: null,
        };

        let existing = null;

        if (item.form_new_id !== null && item.form_new_id !== undefined) {
          existing = await tx.form_research_owner.findUnique({
            where: { form_new_id: item.form_new_id },
          });
        }

        if (
          !existing &&
          item.form_own_id !== null &&
          item.form_own_id !== undefined
        ) {
          existing = await tx.form_research_owner.findFirst({
            where: { form_own_id: item.form_own_id },
          });
        }

        let owner;

        if (existing) {
          owner = await tx.form_research_owner.update({
            where: { owner_pk_uuid: existing.owner_pk_uuid },
            data,
          });
        } else {
          owner = await tx.form_research_owner.create({
            data: {
              owner_pk_uuid: randomUUID(),
              ...data,
            },
          });
        }

        await deleteFilesWithPivot(
          tx,
          'form_research_owner_plan',
          owner.owner_pk_id,
        );
        await deleteFilesWithPivot(
          tx,
          'form_research_owner_contract',
          owner.owner_pk_id,
        );
        await deleteFilesWithPivot(
          tx,
          'form_research_owner_other',
          owner.owner_pk_id,
        );

        const planFiles = await saveFilesWithPivot(
          tx,
          item.file_uploads_plan || [],
          'form_research_owner_plan',
          owner.owner_pk_id,
        );

        const contractFiles = await saveFilesWithPivot(
          tx,
          item.file_uploads_contract || [],
          'form_research_owner_contract',
          owner.owner_pk_id,
        );

        const otherFiles = await saveFilesWithPivot(
          tx,
          item.file_uploads_other || [],
          'form_research_owner_other',
          owner.owner_pk_id,
        );

        if (planFiles.length || contractFiles.length || otherFiles.length) {
          await tx.form_research_owner.update({
            where: { owner_pk_uuid: owner.owner_pk_uuid },
            data: {
              file_uploads_plan:
                planFiles.length > 0 ? planFiles[0].fu_id : null,
              file_uploads_contract:
                contractFiles.length > 0 ? contractFiles[0].fu_id : null,
              file_uploads_other:
                otherFiles.length > 0 ? otherFiles[0].fu_id : null,
            },
          });
        }
      });

      count++;
    }

    return count;
  }

  // ===== GET /api/scripts/import-server-form =====
  router.get('/import-server-form', async (_req, res) => {
    try {
      const findingsCount = await importFormNewFindings();
      const planCount = await importFormResearchPlan();
      const ownerCount = await importFormResearchOwner();

      return res.json({
        success: true,
        message:
          'Imported form_new_findings, form_research_plan, form_research_owner successfully (with upsert + relations)',
        counts: {
          form_new_findings: findingsCount,
          form_research_plan: planCount,
          form_research_owner: ownerCount,
        },
      });
    } catch (err) {
      console.error('import-server-form error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || String(err),
      });
    }
  });

  return router;
}
  