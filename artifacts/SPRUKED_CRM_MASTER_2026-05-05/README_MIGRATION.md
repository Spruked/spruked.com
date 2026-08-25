# Spruked CRM Master Snapshot

This folder is a master copy of the CRM-integrated implementation from spruked.com.

## Included code
- cali_skg/core/cali_personal_skg.py
- cali_skg/api/cali_routes.py
- components/admin/CaliOperationsHub.tsx
- app/api/waitlist/route.ts
- app/api/orb/route.ts
- app/page.tsx

## Migration target
Recommended target root on R drive substrate:
- /mnt/r/CALI_SUBSTRATE/SPRUKED_CRM_MASTER_2026-05-05

## Rebuild checklist
1. Restore files into matching paths in destination repo.
2. Ensure CALI API launches with updated routes.
3. Ensure Next app includes updated admin UI and waitlist route.
4. Configure environment:
   - ADMIN_ACCESS_TOKEN or CALI_ADMIN_TOKEN
   - CALI_API_URL
   - BUSINESS_EMAIL_APP_PASSWORD (for IMAP poll)
5. Verify endpoints:
   - /cali/crm/pipeline
   - /cali/crm/email/status
   - /cali/crm/email/poll

## Notes
- The IMAP inbound poll feature is password-gated by env var.
- Admin ORB context now supports CRM/email intents.
