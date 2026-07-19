#!/usr/bin/env node
/**
 * DISABLED: Zoho provision no longer CLI-deploys Unit311 Central production.
 * Configure env vars via Vercel dashboard / env APIs, then ship via Git.
 */
import { refuseCliProductionDeploy } from "./assert-canonical-unit311-repo.mjs";

refuseCliProductionDeploy("provision-unit311-zoho-vercel.mjs");
