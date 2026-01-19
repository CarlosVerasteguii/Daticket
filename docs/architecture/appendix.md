# Appendix

## Database Migration Strategy

All database changes must be version-controlled and applied via migrations:

```bash
# Create new migration
supabase migration new add_receipt_tags

# Edit migration file in packages/database/migrations/

# Apply migration to local database
supabase db push

# Migration will auto-apply on deploy via Supabase CLI
```

## Type Generation from Database

```bash
# Generate TypeScript types from Supabase schema
supabase gen types typescript --local > packages/database/types/database.types.ts

# Add to package.json scripts
{
  "generate:types": "supabase gen types typescript --local > packages/database/types/database.types.ts"
}
```

## Useful Resources

- **Next.js Documentation:** https://nextjs.org/docs
- **Supabase Documentation:** https://supabase.com/docs
- **Vercel Documentation:** https://vercel.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Radix UI:** https://www.radix-ui.com/docs/primitives
- **Zod:** https://zod.dev
- **Recharts:** https://recharts.org

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Author:** Winston (Architect)  
**Status:** Ready for Implementation



---
