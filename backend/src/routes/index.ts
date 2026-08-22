import { Router } from "express";
import { requireAdmin } from "../middleware/admin.js";
import { authenticate } from "../middleware/auth.js";
import { adminUsersRouter } from "./admin-users.js";
import { authRouter } from "./auth.js";
import { categoriesRouter } from "./categories.js";
import { dashboardRouter } from "./dashboard.js";
import { reportsRouter } from "./reports.js";
import { transactionsRouter } from "./transactions.js";

export const routes = Router();
routes.use("/auth", authRouter);
routes.use("/categories", authenticate, categoriesRouter);
routes.use("/transactions", authenticate, transactionsRouter);
routes.use("/dashboard", authenticate, dashboardRouter);
routes.use("/reports", authenticate, reportsRouter);
routes.use("/admin/users", authenticate, requireAdmin, adminUsersRouter);
