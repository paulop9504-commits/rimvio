/**
 * Hub Dev — Stripe Connect OAuth (dev mock + redirect stub).
 * Re-exports unified OAuth connect (P8).
 */

export {
  connectHubOAuthProvider as connectHubStripe,
  completeHubOAuthConnect as completeHubStripeConnect,
  type HubOAuthConnectResult as HubStripeConnectResult,
  type HubOAuthConnectOptions as HubStripeConnectOptions,
} from "@/lib/hub/dev/hub-oauth-connect";
