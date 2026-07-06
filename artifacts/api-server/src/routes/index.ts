import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectRouter from "./project";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectRouter);

export default router;
