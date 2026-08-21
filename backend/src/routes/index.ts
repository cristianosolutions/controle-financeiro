import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authRouter } from "./auth.js";
import { categoriesRouter } from "./categories.js";
import { dashboardRouter } from "./dashboard.js";
import { transactionsRouter } from "./transactions.js";

export const routes = Router();
routes.use("/auth", authRouter);
routes.use("/categories", authenticate, categoriesRouter);
routes.use("/transactions", authenticate, transactionsRouter);
routes.use("/dashboard", authenticate, dashboardRouter);
