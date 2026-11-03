# NEXA V3.20 — Integration Status

## Completed in this version
- Restored missing authentication service contract used by the master server.
- Restored payment capability flag contract used by marketplace checkout configuration.
- Restored marketplace social compatibility service used by AI shopping references, receipts, product snapshots, watches and alerts.
- Restored marketplace dispute read route.
- Added a real authenticated master-app entry screen with sign-up/sign-in.
- Unified Home, Money, Zeeza, Chat and Dream Marketplace navigation.
- Connected the existing Groups, Friends and Chat state/hooks to the master shell.
- Added missing shared style tokens used by the group/staff screens.
- Updated project version to 3.20.0.

## Still required for production completion
- Install project dependencies and run an Expo native/web build.
- Configure `EXPO_PUBLIC_API_URL` to the deployed API.
- Configure `DB_PATH` on persistent server storage.
- Configure `OPENAI_API_KEY` for AI features.
- Connect a real payment provider and enable `PAYMENTS_ENABLED=true` only after provider integration is implemented and tested.
- Add the complete Dream Marketplace customer storefront and vendor dashboard UI over the existing marketplace APIs.
- Connect real push-provider delivery and native notification tap handling.
- Replace chat polling with a realtime transport if instant delivery is required.


## V3.21 storefront/payment completion checkpoint
- Customer Dream Marketplace UI added over the existing `/api/mall/*` endpoints.
- Vendor dashboard added over vendor product/order/summary/staff endpoints.
- Paystack payment adapter added; set `PAYMENTS_ENABLED=true` and provide `PAYSTACK_SECRET_KEY` only after configuring the Paystack dashboard/webhook and testing.
- Native push tap listener remains app-shell work; server push delivery was already present and marketplace events now continue using it.
