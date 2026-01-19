# MVP Scope Guardrails & Risk Mitigation

## Phase 2+ Features (Parking Lot)

**DO NOT BUILD THESE FOR MVP - Move to Phase 2:**

### Authentication (Epic 1)
- ❌ Email verification/confirmation
- ❌ Password reset functionality
- ❌ "Remember me" functionality
- ❌ Multi-device session management
- ❌ Account deletion
- ❌ Social login (Google, etc.)
- ✅ Basic email/password registration ONLY
- ✅ Simple login with session ONLY

### Receipt Management (Epic 2)
- ❌ Receipt OCR/text extraction
- ❌ Receipt editing after creation (defer to Sprint 3)
- ❌ Batch upload
- ❌ Receipt sharing
- ✅ Basic upload with manual entry ONLY
- ✅ View list and details ONLY

### Analytics (Epic 4)
- ❌ Interactive charts (Recharts)
- ❌ Export to CSV/PDF
- ❌ Advanced filtering
- ❌ Budget alerts
- ❌ Price tracking
- ✅ Simple stat cards with numbers ONLY
- ✅ Basic HTML tables for category breakdown

### General
- ❌ Dark mode
- ❌ Internationalization (i18n)
- ❌ Mobile app
- ❌ Offline support
- ❌ Advanced search
- ❌ Data export

**Rule:** If it's not explicitly in the MVP acceptance criteria, it goes in Phase 2.

---

## Supabase Learning & Troubleshooting

### Pre-Development Checklist

Before starting Sprint 1, complete these Supabase tutorials:

- [ ] Create Supabase project and connect locally
- [ ] Test basic INSERT/SELECT with RLS disabled
- [ ] Enable RLS and test policy with `auth.uid()`
- [ ] Upload test image to Supabase Storage
- [ ] Test Supabase Auth with email/password locally
- [ ] Read: "Row Level Security Guide" in Supabase docs
- [ ] Estimate storage needs (500MB free tier = ~250 receipts at 2MB each)

### Common RLS Debugging Patterns

**Problem:** Queries return empty results even though data exists

**Solution Checklist:**
```sql
-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- 2. Check current user ID
SELECT auth.uid();

-- 3. Test query without RLS (as service role)
SELECT * FROM receipts;  -- Should see all data

-- 4. Test query with RLS (as authenticated user)
SELECT * FROM receipts;  -- Should see only your data

-- 5. Check policy definition
SELECT * FROM pg_policies WHERE tablename = 'receipts';
```

**Quick Fix:** Start with permissive RLS, tighten later
```sql
-- Temporary permissive policy for debugging
CREATE POLICY "temp_allow_all" ON receipts
  FOR ALL USING (true);
  
-- Remove once real policies work
DROP POLICY "temp_allow_all" ON receipts;
```

### Supabase Storage Troubleshooting

**Problem:** CORS errors when uploading images

**Solution:**
1. Check Storage bucket is set to public
2. Add CORS policy in Supabase Dashboard:
   ```json
   {
     "allowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"]
   }
   ```

**Problem:** Images not displaying after upload

**Solution:**
1. Verify bucket privacy settings
2. Use `getPublicUrl()` not `createSignedUrl()` for public buckets
3. Check browser network tab for actual URL being requested

### When to Ask for Help

**Stop and ask for help if:**
- Spent >2 hours debugging same RLS issue
- Spent >1 day on authentication flow
- Hit storage/bandwidth limits unexpectedly
- Supabase CLI commands failing repeatedly
- Migration broke database and rollback unclear

**Where to ask:**
- Supabase Discord: https://discord.supabase.com
- Stack Overflow: Tag [supabase]
- r/Supabase on Reddit

---

## Risk Monitoring & Emergency Responses

### Weekly Health Check (Every Friday)

Answer these questions honestly:

1. **Momentum Check:**
   - ❓ Did I ship something working this week?
   - ❓ Do I feel closer to MVP completion?
   - ❓ Am I excited about next week's work?

2. **Scope Check:**
   - ❓ Am I building Phase 1 or Phase 2 features?
   - ❓ Have I added features not in original PRD?
   - ❓ Are acceptance criteria still realistic?

3. **Complexity Check:**
   - ❓ Did I spend >3 days on one feature?
   - ❓ Am I fighting the tech stack?
   - ❓ Do I understand what I built last week?

4. **Burnout Check:**
   - ❓ Am I still enjoying this?
   - ❓ Have I taken breaks this week?
   - ❓ Am I sleeping okay?

### Warning Signs (RED FLAGS 🚩)

| Warning Sign | What It Means | Emergency Response |
|--------------|---------------|-------------------|
| **No commits for 3+ days** | Blocked or demotivated | Identify blocker, ask for help, or switch tasks |
| **Spent entire week on auth** | Stuck in rabbit hole | Simplify auth scope, use magic links instead |
| **Reading more than coding** | Analysis paralysis | Set 2-hour timer, build something ugly but working |
| **Thinking about rewriting** | Perfectionism creeping in | DON'T DO IT. Ship current version first |
| **Comparing to production apps** | Unrealistic expectations | Remember: They had teams and years, you have 6 weeks |
| **Added 5+ "nice to have" features** | Scope creep | Delete everything not in PRD, move to Phase 2 |
| **Haven't tested app in browser for 2 days** | Lost in abstraction | Open localhost:3000, click around, find bugs |
| **Supabase bill >$25 in Sprint 1** | Using paid features unknowingly | Check billing dashboard, optimize queries |

### Emergency Responses

**If blocked >2 days:**
1. Document what you tried (for future reference)
2. Ask for help on Discord/Reddit with specific error
3. Consider alternative approach (skip feature, use simpler solution)
4. Take 1 day break, come back with fresh eyes

**If burned out:**
1. Stop coding immediately
2. Take 2-3 days completely off
3. Return with reduced scope (move features to Phase 2)
4. Consider pairing with someone (even rubber duck debugging)

**If behind schedule:**
1. Don't panic - flexible timeline was agreed
2. Review parking lot - what can move to Phase 2?
3. Focus on ONE epic at a time (finish Epic 1 before starting Epic 2)
4. Ship imperfect but working features

**If tech stack fighting you:**
1. Check if it's learning curve (normal) or fundamental mismatch (problem)
2. Give it 1 more week of focused effort
3. If still fighting, consider alternatives:
   - Supabase too complex → Vercel Postgres + NextAuth
   - Next.js App Router confusing → Vite + React + Express
   - TypeScript overwhelming → Allow `any` types for MVP

---

## Client-Side Image Compression Implementation

Since we removed server-side Sharp compression, here's the client-side approach:

### Install Package
```bash
pnpm add browser-image-compression
```

### Implementation Example
```typescript
// components/receipts/ReceiptUploadForm.tsx
import imageCompression from 'browser-image-compression';

async function handleImageUpload(file: File) {
  try {
    // Compression options
    const options = {
      maxSizeMB: 2,          // Max file size
      maxWidthOrHeight: 1920, // Max dimensions
      useWebWorker: true,     // Use web worker for performance
    };

    // Compress image in browser
    const compressedFile = await imageCompression(file, options);
    
    // Upload compressed image to Supabase Storage
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(fileName, compressedFile);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

**Benefits:**
- No serverless timeout issues
- Faster uploads (less data transferred)
- Works offline-first if needed later
- No server-side dependencies (Sharp, etc.)

---

## Simplified Testing Strategy for MVP

### Forget the Testing Pyramid for Now

**Instead of:**
- 70% unit tests
- 20% integration tests
- 10% E2E tests

**Do this for MVP:**
- 0% unit tests (add in Sprint 4+ if time)
- 0% integration tests (add in Sprint 4+ if time)
- 100% focus on 2-3 critical E2E tests

### The 2-Test Minimum

**Test 1: Happy Path (Playwright)**
```typescript
test('user can complete full workflow', async ({ page }) => {
  // Register
  await page.goto('/register');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'TestPass123');
  await page.click('button[type="submit"]');
  
  // Should be logged in
  await expect(page).toHaveURL(/dashboard/);
  
  // Upload receipt
  await page.goto('/receipts/new');
  await page.setInputFiles('input[type="file"]', 'test-receipt.jpg');
  await page.fill('[name="store"]', 'Whole Foods');
  await page.fill('[name="amount"]', '85.50');
  await page.click('button:has-text("Save")');
  
  // View receipt
  await expect(page.locator('text=Whole Foods')).toBeVisible();
  await expect(page.locator('text=$85.50')).toBeVisible();
});
```

**Test 2: Security (Data Isolation)**
```typescript
test('users cannot see each others data', async ({ browser }) => {
  // Create two users
  const user1Context = await browser.newContext();
  const user2Context = await browser.newContext();
  
  const page1 = await user1Context.newPage();
  const page2 = await user2Context.newPage();
  
  // User 1 creates receipt
  await page1.goto('/register');
  // ... register user1, create receipt ...
  
  // User 2 tries to access User 1's receipt
  await page2.goto('/register');
  // ... register user2 ...
  await page2.goto('/receipts');
  
  // Should NOT see User 1's receipt
  await expect(page.locator('text=Whole Foods')).not.toBeVisible();
});
```

**That's it for MVP. Add more tests in Phase 2.**

### When to Add More Tests

Add unit/integration tests when:
- You have a working MVP that users are actually using
- You're making changes and afraid of breaking things
- You have time after Sprint 6
- A bug happened twice in the same place

Don't add tests because:
- Some guide said you should
- You feel guilty
- It's "best practice"

**For MVP: Working > Tested > Perfect**

---
