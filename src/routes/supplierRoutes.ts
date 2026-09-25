import { Router } from "express";
import { createSupplierHandler } from "../controllers/supplierController";
import { supplierAData } from "../data/supplierAData";
import { supplierBData } from "../data/supplierBData";

const supplierARouter = Router();
supplierARouter.get("/supplierA/hotels", createSupplierHandler("Supplier A", supplierAData));

const supplierBRouter = Router();
supplierBRouter.get("/supplierB/hotels", createSupplierHandler("Supplier B", supplierBData));

export { supplierARouter, supplierBRouter };
