/** L1 facade — globe/feed must not import action-chat directly. */
export { readClientMasterOrchestratorContext } from "@/lib/action-chat/client-master-context";
export {
  defaultMasterOrchestratorContext,
  type MasterOrchestratorContext,
} from "@/lib/source-of-truth/master-orchestrator-context";
