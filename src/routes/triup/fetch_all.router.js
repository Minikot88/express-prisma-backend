// src/routes/triup/fetch_all.router.js
import { Router } from 'express';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const endpoints = [
  { key: 'province', url: 'https://triup.tsri.or.th/service/api/address/province' },
  { key: 'cofunders', url: 'https://triup.tsri.or.th/service/api/cofunders' },
  { key: 'departments', url: 'https://triup.tsri.or.th/service/api/departments' },
  { key: 'educationlevels', url: 'https://triup.tsri.or.th/service/api/educationlevels' },
  { key: 'findingdetaillists', url: 'https://triup.tsri.or.th/service/api/findingdetaillists' },
  { key: 'form_allocate', url: 'https://triup.tsri.or.th/service/api/form_allocate' },
  { key: 'form_extend', url: 'https://triup.tsri.or.th/service/api/form_extend' },
  { key: 'form_new_findings', url: 'https://triup.tsri.or.th/service/api/form_new_findings' },
  { key: 'form_research_owner', url: 'https://triup.tsri.or.th/service/api/form_research_owner' },
  { key: 'form_research_plan', url: 'https://triup.tsri.or.th/service/api/form_research_plan' },
  { key: 'funders', url: 'https://triup.tsri.or.th/service/api/funders' },
  { key: 'groupstudies', url: 'https://triup.tsri.or.th/service/api/groupstudies' },
  { key: 'mainstudies', url: 'https://triup.tsri.or.th/service/api/mainstudies' },
  { key: 'prefixs', url: 'https://triup.tsri.or.th/service/api/prefixs' },
  { key: 'researcher', url: 'https://triup.tsri.or.th/service/api/users/researcher' },
  { key: 'roles', url: 'https://triup.tsri.or.th/service/api/roles' },
  { key: 'substudies', url: 'https://triup.tsri.or.th/service/api/substudies' },
  { key: 'target_audiences', url: 'https://triup.tsri.or.th/service/api/target_audiences' },
  { key: 'time_settings', url: 'https://triup.tsri.or.th/service/api/time_settings' },
  { key: 'users', url: 'https://triup.tsri.or.th/service/api/users' },
];

// ---- กำหนดโฟลเดอร์เก็บ JSON ----
// เก็บใน src/routes/scripts/json เหมือนเดิม
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '..', 'scripts', 'json');
// ถ้าอยากย้ายไปที่อื่นก็เปลี่ยนตรงนี้ได้ เช่น:
// const OUTPUT_DIR = path.join(process.cwd(), 'data', 'triup-json');

export function createFetchAllRouter(prisma) {
  const router = Router();

  // GET /api/scripts/fetch-all
  router.get('/fetch-all', async (_req, res) => {
    try {
      // 1) เอา token ล่าสุดจากตาราง session
      const latest = await prisma.session.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { token: true },
      });

      if (!latest?.token) {
        return res
          .status(400)
          .json({ success: false, error: 'no session token login found' });
      }

      const token = latest.token.replace(/^Bearer\s+/i, '');
      const fetchedAt = new Date().toISOString();

      // 2) สร้างโฟลเดอร์เก็บไฟล์ (ถ้ายังไม่มี)
      await mkdir(OUTPUT_DIR, { recursive: true });

      // 3) ดึงทุก endpoint แล้วเขียนลงไฟล์
      const results = await Promise.allSettled(
        endpoints.map(async (ep) => {
          const r = await fetch(ep.url, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!r.ok) {
            const text = await r.text().catch(() => '');
            throw new Error(
              `${ep.key} failed: ${r.status} ${r.statusText} ${text}`,
            );
          }

          const json = await r.json();

          // ใส่วันที่ไว้บนสุดในไฟล์
          const wrapped = {
            fetchedAt,
            key: ep.key,
            url: ep.url,
            data: json,
          };

          const filePath = path.join(OUTPUT_DIR, `${ep.key}.json`);
          await writeFile(filePath, JSON.stringify(wrapped, null, 2), 'utf-8');

          console.log(`Saved ${ep.key} to ${filePath}`);

          return { key: ep.key, path: filePath };
        }),
      );

      // 4) สรุปผลแบบอ่านง่าย
      const summary = results.map((r, i) => {
        const key = endpoints[i].key;
        if (r.status === 'fulfilled') {
          return { key, status: 'ok', path: r.value.path };
        } else {
          return { key, status: 'error', error: r.reason.message };
        }
      });

      const total = summary.length;
      const okCount = summary.filter((s) => s.status === 'ok').length;
      const failedCount = total - okCount;

      // ✅ ตอบเป็น JSON ล้วน ๆ ไม่มี HTML
      return res.json({
        success: failedCount === 0,
        fetchedAt,
        outputDir: OUTPUT_DIR,
        total,
        ok: okCount,
        failed: failedCount,
        items: summary,
      });
    } catch (e) {
      console.error('Fetch-all error:', e);
      return res
        .status(500)
        .json({ success: false, error: 'internal error fetch-all' });
    }
  });

  return router;
}
