import { Router } from "express";
import { randomUUID } from "crypto";

export function createAdminUserRouter(prisma) {
  const router = Router();

  const roleMap = {
    1000: "ผู้ดูแลระบบ",
    2000: "เจ้าหน้าที่วิจัย",
    3000: "ผู้ใช้งานทั่วไป",
    4000: "ผู้ร่วมวิจัยภายนอก",
    5000: "ผู้บ่มข้อมูล",
    6000: "อื่นๆ",
  };

  // GET users
  router.get("/users", async (req, res) => {
    try {
      const logins = await prisma.psu_user_login.findMany();
      const profiles = await prisma.psu_user_profile.findMany();

      const users = logins.map((u) => ({
        ...u,
        role_name: roleMap[u.roles_id] || "-",
        profile: profiles.find((p) => p.user_id === u.username) || null,
      }));

      res.json({ success: true, data: users });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET user detail
  router.get("/users/:uuid", async (req, res) => {
    const login = await prisma.psu_user_login.findUnique({
      where: { user_pk_uuid: req.params.uuid },
    });

    if (!login)
      return res.status(404).json({ success: false });

    const profile = await prisma.psu_user_profile.findUnique({
      where: { user_id: login.username },
    });

    res.json({
      success: true,
      data: { ...login, profile },
    });
  });

  // GET role log
  router.get("/users/:uuid/role-log", async (req, res) => {
    const user = await prisma.psu_user_login.findUnique({
      where: { user_pk_uuid: req.params.uuid },
    });

    if (!user) return res.json({ success: true, data: [] });

    const logs = await prisma.psu_user_role_log.findMany({
      where: { user_id: user.username },
      orderBy: { changed_at: "desc" },
    });

    res.json({
      success: true,
      data: logs.map((l) => ({
        ...l,
        old_role_name: roleMap[l.old_role] || "-",
        new_role_name: roleMap[l.new_role] || "-",
      })),
    });
  });

  // PUT update role
  router.put("/users/:uuid/role", async (req, res) => {
    const { roles_id, changed_by } = req.body;

    const user = await prisma.psu_user_login.findUnique({
      where: { user_pk_uuid: req.params.uuid },
    });

    if (!user)
      return res.status(404).json({ success: false });

    // ❌ Block CEO
    if (user.roles_id === 900) {
      return res.status(403).json({
        success: false,
        message: "CEO role cannot be changed",
      });
    }

    await prisma.psu_user_role_log.create({
      data: {
        log_id: randomUUID(),
        user_id: user.username,
        old_role: String(user.roles_id),
        new_role: String(roles_id),
        changed_by: changed_by || "unknown",
        changed_at: new Date(),
      },
    });

    const updated = await prisma.psu_user_login.update({
      where: { user_pk_uuid: req.params.uuid },
      data: { roles_id: Number(roles_id) },
    });

    res.json({ success: true, data: updated });
  });

  return router;
}
