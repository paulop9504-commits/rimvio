import { primaryExecutionNodeForEngine } from "@/lib/engine/execution-graph-engine-bindings";

export {
  flightBookingEnginePackage as flightBookingEngine,
  FLIGHT_BOOKING_ENGINE_GOAL,
} from "@/lib/engine/packages/flight-booking-package";

export const FLIGHT_BOOKING_EXECUTION_NODE_ID =
  primaryExecutionNodeForEngine("flight_booking");
