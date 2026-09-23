#!/usr/bin/env bash
# End-to-end API check against a seeded database.
#
#   1. npm run dev:db     (or point MONGODB_URI at your own MongoDB)
#   2. npm run seed
#   3. npm run dev
#   4. npm run test:e2e
#
# Exercises the verification gate, role authorization, the review lifecycle,
# archive/restore, bulk safeguards and validation. Assumes freshly seeded data.

set -u
API=http://localhost:5050
pass=0; fail=0
check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then echo "  PASS  $1"; pass=$((pass+1));
  else echo "  FAIL  $1 -> expected [$2] got [$3]"; fail=$((fail+1)); fi
}
jqv() { echo "$1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);const p=process.argv[1].split('.');let v=o;for(const k of p)v=v?.[k];console.log(typeof v==='object'?JSON.stringify(v):String(v))}catch(e){console.log('PARSE_ERR')}})" "$2"; }
code() { curl -s -o /tmp/body.json -w '%{http_code}' "$@"; }

# The credential limiter allows AUTH_RATE_LIMIT logins per 15 min, and this suite
# uses about a dozen. Fail fast with a real explanation rather than 35 confusing errors.
PROBE=$(code -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@aura.dev","password":"Admin@12345"}')
if [ "$PROBE" = "429" ]; then
  echo "  RATE LIMITED. The auth limiter is doing its job."
  echo "  To re-run now: set AUTH_RATE_LIMIT=500 in backend/.env and restart the server,"
  echo "  or wait 15 minutes for the window to reset."
  exit 1
fi

# The suite needs the seeded demo rows in their seeded states. It does NOT assume the
# database is otherwise empty — real influencers may exist alongside them, so every
# assertion below is relative to a baseline captured here rather than an absolute count.
SEED_TOKEN=$(curl -s -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@aura.dev","password":"Admin@12345"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).data.token)}catch(e){console.log('')}})")
if [ -z "$SEED_TOKEN" ]; then
  echo "  Cannot log in as admin@aura.dev. Run: npm run seed"
  exit 1
fi
SEEDED=$(curl -s "$API/api/admin/influencers?archived=all&status=all&limit=200" -H "Authorization: Bearer $SEED_TOKEN" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).data.filter(i=>i.email.endsWith('@example.com')).length)}catch(e){console.log(0)}})")
if [ "$SEEDED" -lt 12 ]; then
  echo "  Seed data missing (found $SEEDED of 12 demo influencers). Run: npm run seed"
  exit 1
fi

echo "── 1. Public directory (no auth) ──"
C=$(code "$API/api/public/influencers?limit=50")
check "public list returns 200" 200 "$C"
BODY=$(cat /tmp/body.json)
NAMES=$(echo "$BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.map(i=>i.name).join('|')))")
check "approved influencer IS public (Rahul Sharma)" true "$(echo "$NAMES" | grep -q 'Rahul Sharma' && echo true || echo false)"
check "pending influencer is NOT public (Priya Singh)" true "$(echo "$NAMES" | grep -q 'Priya Singh' && echo false || echo true)"
check "rejected influencer is NOT public (Karan Malhotra)" true "$(echo "$NAMES" | grep -q 'Karan Malhotra' && echo false || echo true)"
check "archived influencer is NOT public (Meera Pillai)" true "$(echo "$NAMES" | grep -q 'Meera Pillai' && echo false || echo true)"
check "public projection omits email" undefined "$(jqv "$BODY" data.0.email)"
check "public projection omits status" undefined "$(jqv "$BODY" data.0.status)"

echo "── 2. Login gate on verification status ──"
C=$(code -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"priya.singh@example.com","password":"Creator@123"}')
check "pending influencer blocked" 403 "$C"
check "pending message explains review" "Your registration is under review. We will notify you once it is approved." "$(jqv "$(cat /tmp/body.json)" message)"

C=$(code -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"karan.malhotra@example.com","password":"Creator@123"}')
check "rejected influencer blocked" 403 "$C"

C=$(code -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"meera.pillai@example.com","password":"Creator@123"}')
check "archived influencer blocked" 403 "$C"

C=$(code -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"rahul.sharma@example.com","password":"Creator@123"}')
check "approved influencer can log in" 200 "$C"
INF_TOKEN=$(jqv "$(cat /tmp/body.json)" data.token)

C=$(code -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"rahul.sharma@example.com","password":"WrongPassword1"}')
check "wrong password rejected" 401 "$C"

echo "── 3. Authorization: influencer cannot reach admin API ──"
C=$(code "$API/api/admin/stats" -H "Authorization: Bearer $INF_TOKEN")
check "influencer blocked from admin stats" 403 "$C"
C=$(code "$API/api/admin/influencers" -H "Authorization: Bearer $INF_TOKEN")
check "influencer blocked from admin list" 403 "$C"
C=$(code "$API/api/admin/stats")
check "no token blocked" 401 "$C"
C=$(code "$API/api/admin/stats" -H "Authorization: Bearer not.a.real.token")
check "bad token blocked" 401 "$C"

echo "── 4. Influencer self-service ──"
C=$(code "$API/api/influencer/profile" -H "Authorization: Bearer $INF_TOKEN")
check "own profile readable" 200 "$C"
C=$(code -X PUT "$API/api/influencer/profile" -H "Authorization: Bearer $INF_TOKEN" -H 'Content-Type: application/json' -d '{"bio":"Updated bio from e2e test","status":"approved"}')
check "profile update accepted" 200 "$C"
check "bio persisted" "Updated bio from e2e test" "$(jqv "$(cat /tmp/body.json)" data.bio)"

echo "── 5. Admin login + stats ──"
C=$(code -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@aura.dev","password":"Admin@12345"}')
check "admin login" 200 "$C"
AT=$(jqv "$(cat /tmp/body.json)" data.token)
AUTH="Authorization: Bearer $AT"

C=$(code "$API/api/admin/stats" -H "$AUTH")
check "stats 200" 200 "$C"
S=$(cat /tmp/body.json)
check "stats.total covers the seeded rows" true "$([ "$(jqv "$S" data.total)" -ge 12 ] && echo true || echo false)"
check "stats.pending >= 2 (seeded)" true "$([ "$(jqv "$S" data.pending)" -ge 2 ] && echo true || echo false)"
check "stats.approved >= 8 (seeded)" true "$([ "$(jqv "$S" data.approved)" -ge 8 ] && echo true || echo false)"
check "stats.rejected >= 1 (seeded)" true "$([ "$(jqv "$S" data.rejected)" -ge 1 ] && echo true || echo false)"
check "stats.archived >= 1 (seeded)" true "$([ "$(jqv "$S" data.archived)" -ge 1 ] && echo true || echo false)"
check "counts add up (pending+approved+rejected+archived = total)" "$(jqv "$S" data.total)" "$(( $(jqv "$S" data.pending) + $(jqv "$S" data.approved) + $(jqv "$S" data.rejected) + $(jqv "$S" data.archived) ))"

echo "── 6. Review lifecycle: approve a pending influencer ──"
# Target a seeded row by email so ad-hoc data in the database cannot steer the test.
C=$(code "$API/api/admin/influencers?status=pending&q=Priya+Singh" -H "$AUTH")
PID=$(jqv "$(cat /tmp/body.json)" data.0._id)
PEMAIL=$(jqv "$(cat /tmp/body.json)" data.0.email)
check "seeded pending influencer found" "priya.singh@example.com" "$PEMAIL"
C=$(code -X PATCH "$API/api/admin/influencers/$PID/approve" -H "$AUTH")
check "approve 200" 200 "$C"
check "status now approved" approved "$(jqv "$(cat /tmp/body.json)" data.status)"
check "reviewedBy recorded" true "$([ "$(jqv "$(cat /tmp/body.json)" data.reviewedBy)" != "null" ] && echo true || echo false)"

C=$(code -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$PEMAIL\",\"password\":\"Creator@123\"}")
check "newly approved influencer ($PEMAIL) can now log in" 200 "$C"

echo "── 7. Reject with reason ──"
C=$(code -X PATCH "$API/api/admin/influencers/$PID/reject" -H "$AUTH" -H 'Content-Type: application/json' -d '{"reason":"Audience not verified"}')
check "reject 200" 200 "$C"
check "reason stored" "Audience not verified" "$(jqv "$(cat /tmp/body.json)" data.rejectionReason)"
C=$(code -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$PEMAIL\",\"password\":\"Creator@123\"}")
check "same influencer blocked again after rejection" 403 "$C"

echo "── 8. Archive / restore ──"
C=$(code -X PATCH "$API/api/admin/influencers/$PID/archive" -H "$AUTH")
check "archive 200" 200 "$C"
check "isArchived true" true "$(jqv "$(cat /tmp/body.json)" data.isArchived)"
C=$(code -X PATCH "$API/api/admin/influencers/$PID/restore" -H "$AUTH")
check "restore 200" 200 "$C"
check "isArchived false" false "$(jqv "$(cat /tmp/body.json)" data.isArchived)"

echo "── 9. Bulk delete safeguard ──"
C=$(code -X POST "$API/api/admin/influencers/bulk" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"action\":\"delete\",\"ids\":[\"$PID\"]}")
check "bulk delete without confirm is refused" 400 "$C"
C=$(code -X POST "$API/api/admin/influencers/bulk" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"action\":\"archive\",\"ids\":[\"$PID\"]}")
check "bulk archive (reversible) needs no confirm" 200 "$C"

echo "── 10. Validation ──"
C=$(code -X POST "$API/api/auth/register" -H 'Content-Type: application/json' -d '{"email":"bad","password":"x"}')
check "invalid registration rejected" 400 "$C"
check "validation returns field details" true "$([ "$(jqv "$(cat /tmp/body.json)" details)" != "undefined" ] && echo true || echo false)"
C=$(code -X POST "$API/api/auth/register" -H 'Content-Type: application/json' -d '{"name":"Dup User","email":"rahul.sharma@example.com","password":"Password123","category":"000000000000000000000000","location":{"country":"India","state":"X","city":"Y"}}')
check "duplicate email rejected" 409 "$C"
C=$(code "$API/api/admin/influencers/notanid" -H "$AUTH")
check "malformed id rejected" 400 "$C"

echo "── 11. Category integrity ──"
C=$(code "$API/api/admin/categories" -H "$AUTH")
CAT_IN_USE=$(jqv "$(cat /tmp/body.json)" data.0._id)
C=$(code -X DELETE "$API/api/admin/categories/$CAT_IN_USE" -H "$AUTH")
check "category in use cannot be deleted" 409 "$C"

echo "── 12. Filters ──"
C=$(code "$API/api/public/influencers?city=Jaipur")
check "city filter 200" 200 "$C"
JAIPUR=$(jqv "$(cat /tmp/body.json)" meta.total)
C=$(code "$API/api/public/influencers")
check "city filter narrows the result set" true "$([ "$JAIPUR" -lt "$(jqv "$(cat /tmp/body.json)" meta.total)" ] && echo true || echo false)"
C=$(code "$API/api/public/locations?country=India")
check "locations cascade 200" 200 "$C"

echo
echo "── 12b. Admin location options are scoped to the list ──"
# Regression guard: these used to come from the PUBLIC endpoint, which only knows about
# approved, non-archived records — so the Archived and Review lists could not be
# filtered by the very locations they contain.
# archived=all, because this suite archives rows as it goes — the point of the check is
# that the admin endpoint sees states the PUBLIC one cannot, whatever their status.
C=$(code "$API/api/admin/locations?status=all&archived=all" -H "$AUTH")
check "admin locations 200" 200 "$C"
ALL_STATES=$(jqv "$(cat /tmp/body.json)" data.states)
check "includes a pending-only state (Delhi)" true "$(echo "$ALL_STATES" | grep -q Delhi && echo true || echo false)"
check "includes a rejected-only state (Punjab)" true "$(echo "$ALL_STATES" | grep -q Punjab && echo true || echo false)"
check "includes an archived-only state (Tamil Nadu)" true "$(echo "$ALL_STATES" | grep -q "Tamil Nadu" && echo true || echo false)"
check "states returned without needing a country" true "$([ -n "$ALL_STATES" ] && [ "$ALL_STATES" != "[]" ] && echo true || echo false)"

# The public endpoint deliberately hides all three — that difference is the bug this guards.
C=$(code "$API/api/public/locations?country=India")
PUB_STATES=$(jqv "$(cat /tmp/body.json)" data.states)
check "public endpoint still hides non-approved states" true "$(echo "$PUB_STATES" | grep -qE 'Punjab|Tamil Nadu' && echo false || echo true)"

C=$(code "$API/api/admin/locations?status=all&archived=true" -H "$AUTH")
check "archived scope includes the archived state (Tamil Nadu)" true "$(jqv "$(cat /tmp/body.json)" data.states | grep -q "Tamil Nadu" && echo true || echo false)"

C=$(code "$API/api/admin/locations?status=rejected&archived=false" -H "$AUTH")
check "rejected scope narrows to Punjab only" '["Punjab"]' "$(jqv "$(cat /tmp/body.json)" data.states)"

C=$(code "$API/api/admin/locations" -H "Authorization: Bearer $INF_TOKEN")
check "influencer cannot read admin locations" 403 "$C"

echo
echo "── 12c. Pagination ──"
# Default page size, and meta the UI can drive Previous/Next from.
C=$(code "$API/api/admin/influencers?archived=all&status=all" -H "$AUTH")
check "admin list defaults to 20 per page" 20 "$(jqv "$(cat /tmp/body.json)" meta.limit)"

C=$(code "$API/api/admin/influencers?archived=all&status=all&limit=5&page=1" -H "$AUTH")
M1=$(cat /tmp/body.json)
check "page 1 returns exactly limit rows" 5 "$(echo "$M1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.length))")"
check "page 1 reports hasMore" true "$(jqv "$M1" meta.hasMore)"
TOTAL=$(jqv "$M1" meta.total)
check "totalPages matches total/limit" "$(( (TOTAL + 4) / 5 ))" "$(jqv "$M1" meta.totalPages)"

C=$(code "$API/api/admin/influencers?archived=all&status=all&limit=5&page=2" -H "$AUTH")
check "page 2 reports its own page number" 2 "$(jqv "$(cat /tmp/body.json)" meta.page)"
FIRST_P1=$(echo "$M1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data[0]._id))")
FIRST_P2=$(jqv "$(cat /tmp/body.json)" data.0._id)
check "page 2 holds different rows to page 1" true "$([ "$FIRST_P1" != "$FIRST_P2" ] && echo true || echo false)"

C=$(code "$API/api/admin/influencers?archived=all&status=all&limit=5&page=$(( (TOTAL + 4) / 5 ))" -H "$AUTH")
check "last page reports hasMore false" false "$(jqv "$(cat /tmp/body.json)" meta.hasMore)"

C=$(code "$API/api/admin/influencers?archived=all&status=all&limit=0" -H "$AUTH")
check "limit below range is rejected" 400 "$C"
C=$(code "$API/api/admin/influencers?archived=all&status=all&limit=9999" -H "$AUTH")
check "limit above range is rejected" 400 "$C"

# Categories page through the same way.
C=$(code "$API/api/admin/categories?limit=5&page=1" -H "$AUTH")
check "categories paginate" 5 "$(jqv "$(cat /tmp/body.json)" meta.limit)"
check "categories report a total" true "$([ "$(jqv "$(cat /tmp/body.json)" meta.total)" -ge 11 ] && echo true || echo false)"
check "categories page 1 returns 5" 5 "$(cat /tmp/body.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.length))")"
C=$(code "$API/api/admin/categories?limit=200" -H "$AUTH")
check "dropdowns can still request the full list" true "$([ "$(cat /tmp/body.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.length))")" -ge 11 ] && echo true || echo false)"

echo
echo "── 12d. Packages: submit is not publish ──"
PKG_BEFORE=$(code "$API/api/public/influencers?q=Rahul&limit=1" && jqv "$(cat /tmp/body.json)" data.0._id)
RID=$(jqv "$(cat /tmp/body.json)" data.0._id)

C=$(code "$API/api/influencer/packages" -H "Authorization: Bearer $INF_TOKEN")
check "influencer can list own packages" 200 "$C"
check "own list includes non-approved ones" true "$(jqv "$(cat /tmp/body.json)" data | grep -q pending && echo true || echo false)"

PUB_BEFORE=$(code "$API/api/public/influencers/$RID/packages" && cat /tmp/body.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.length))")
check "public list shows only approved" true "$(cat /tmp/body.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.every(p=>p.status===undefined)))")"

C=$(code -X POST "$API/api/influencer/packages" -H "Authorization: Bearer $INF_TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"E2E test package","description":"Created by the suite.","price":4321,"deliveryDays":3}')
check "package submitted" 201 "$C"
check "new package starts pending" pending "$(jqv "$(cat /tmp/body.json)" data.status)"
E2E_PKG=$(jqv "$(cat /tmp/body.json)" data._id)

C=$(code "$API/api/public/influencers/$RID/packages")
check "pending package is NOT public" true "$(cat /tmp/body.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(!JSON.parse(s).data.some(p=>p.title==='E2E test package')))")"

C=$(code "$API/api/admin/packages?status=pending&limit=100" -H "$AUTH")
check "package appears in the admin queue" true "$(cat /tmp/body.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.some(p=>p.title==='E2E test package')))")"

C=$(code -X PATCH "$API/api/admin/packages/$E2E_PKG/approve" -H "$AUTH")
check "admin can approve" 200 "$C"
check "status is approved" approved "$(jqv "$(cat /tmp/body.json)" data.status)"

C=$(code "$API/api/public/influencers/$RID/packages")
check "approved package IS public" true "$(cat /tmp/body.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.some(p=>p.title==='E2E test package')))")"

# The rule that matters: editing an approved package un-publishes it until re-reviewed.
C=$(code -X PUT "$API/api/influencer/packages/$E2E_PKG" -H "Authorization: Bearer $INF_TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"E2E test package","description":"Edited.","price":5555,"deliveryDays":3}')
check "edit accepted" 200 "$C"
check "edit sends it back to pending" pending "$(jqv "$(cat /tmp/body.json)" data.status)"

C=$(code "$API/api/public/influencers/$RID/packages")
check "edited package leaves the public profile" true "$(cat /tmp/body.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(!JSON.parse(s).data.some(p=>p.title==='E2E test package')))")"

C=$(code -X PATCH "$API/api/admin/packages/$E2E_PKG/reject" -H "$AUTH" -H 'Content-Type: application/json' -d '{"reason":"Suite rejection"}')
check "admin can reject" 200 "$C"
check "rejection reason stored" "Suite rejection" "$(jqv "$(cat /tmp/body.json)" data.rejectionReason)"

echo "── 12e. Packages: authorization ──"
C=$(code "$API/api/admin/packages" -H "Authorization: Bearer $INF_TOKEN")
check "influencer cannot read the admin queue" 403 "$C"
C=$(code -X POST "$API/api/influencer/packages" -H 'Content-Type: application/json' -d '{"title":"X","price":1}')
check "anonymous cannot submit" 401 "$C"
C=$(code -X POST "$API/api/influencer/packages" -H "Authorization: Bearer $INF_TOKEN" -H 'Content-Type: application/json' -d '{"title":"Bad","price":-5}')
check "negative price rejected" 400 "$C"
C=$(code -X POST "$API/api/influencer/packages" -H "Authorization: Bearer $INF_TOKEN" -H 'Content-Type: application/json' -d '{"price":100}')
check "missing title rejected" 400 "$C"

# Clean up the row this section created.
code -X DELETE "$API/api/influencer/packages/$E2E_PKG" -H "Authorization: Bearer $INF_TOKEN" >/dev/null

echo
echo "── 12f. A package is only as visible as its influencer ──"
# An admin can approve a package for someone who is not in the directory. The package
# is approved, but nothing about that person is public — so the package is not either.
# The admin UI flags this; these checks pin the API behaviour it relies on.
C=$(code "$API/api/admin/influencers?status=pending&limit=1" -H "$AUTH")
HIDDEN_ID=$(jqv "$(cat /tmp/body.json)" data.0._id)
check "a pending influencer exists to test with" true "$([ -n "$HIDDEN_ID" ] && [ "$HIDDEN_ID" != "undefined" ] && echo true || echo false)"

C=$(code "$API/api/public/influencers/$HIDDEN_ID")
check "pending influencer has no public profile" 404 "$C"
C=$(code "$API/api/public/influencers/$HIDDEN_ID/packages")
check "and therefore no public packages" 404 "$C"

# The admin queue must carry the influencer's own state, or the dashboard cannot warn.
C=$(code "$API/api/admin/packages?status=all&limit=100" -H "$AUTH")
check "admin queue exposes influencer.status" true "$(cat /tmp/body.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s).data.filter(p=>p.influencer);console.log(d.length>0&&d.every(p=>typeof p.influencer.status==='string'))})")"
check "admin queue exposes influencer.isArchived" true "$(cat /tmp/body.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s).data.filter(p=>p.influencer);console.log(d.length>0&&d.every(p=>typeof p.influencer.isArchived==='boolean'))})")"

# Archiving a listed influencer must take their profile AND packages out of public view.
C=$(code "$API/api/public/influencers?limit=1")
LIVE_ID=$(jqv "$(cat /tmp/body.json)" data.0._id)
C=$(code "$API/api/public/influencers/$LIVE_ID/packages")
check "a listed influencer's packages are reachable" 200 "$C"
code -X PATCH "$API/api/admin/influencers/$LIVE_ID/archive" -H "$AUTH" >/dev/null
C=$(code "$API/api/public/influencers/$LIVE_ID")
check "archiving removes the public profile" 404 "$C"
C=$(code "$API/api/public/influencers/$LIVE_ID/packages")
check "archiving removes the public packages too" 404 "$C"
code -X PATCH "$API/api/admin/influencers/$LIVE_ID/restore" -H "$AUTH" >/dev/null
C=$(code "$API/api/public/influencers/$LIVE_ID/packages")
check "restoring brings them back" 200 "$C"

echo "── 12g. Change password (signed in) ──"
INF_AUTH="Authorization: Bearer $INF_TOKEN"
J='Content-Type: application/json'

C=$(code -X POST "$API/api/auth/change-password" -H "$J" -H "$INF_AUTH" \
  -d '{"password":"Switched@123","confirmPassword":"Nope@12345"}')
check "mismatched confirmation is refused" "400" "$C"

C=$(code -X POST "$API/api/auth/change-password" -H "$J" -H "$INF_AUTH" -d '{"password":"short","confirmPassword":"short"}')
check "a short password is refused" "400" "$C"

C=$(code -X POST "$API/api/auth/change-password" -H "$J" -d '{"password":"Switched@123","confirmPassword":"Switched@123"}')
check "anonymous cannot change a password" "401" "$C"

C=$(code -X POST "$API/api/auth/change-password" -H "$J" -H "$INF_AUTH" \
  -d '{"password":"Switched@123","confirmPassword":"Switched@123"}')
check "the owner can change their own" "200" "$C"

C=$(code -X POST "$API/api/auth/login" -H "$J" -d '{"email":"rahul.sharma@example.com","password":"Creator@123"}')
check "the old password stops working" "401" "$C"
C=$(code -X POST "$API/api/auth/login" -H "$J" -d '{"email":"rahul.sharma@example.com","password":"Switched@123"}')
check "the new password works" "200" "$C"

echo "── 12h. Forgot password ──"
C=$(code -X POST "$API/api/auth/forgot-password" -H "$J" -d '{"email":"nobody@example.com"}')
check "an unknown address is refused" "404" "$C"

C=$(code -X POST "$API/api/auth/forgot-password" -H "$J" -d '{"email":"not-an-email"}')
check "a malformed address is refused" "400" "$C"

C=$(code -X POST "$API/api/auth/forgot-password" -H "$J" -d '{"email":"rahul.sharma@example.com"}')
RESET_TOKEN=$(jqv "$(cat /tmp/body.json)" data.token)
check "a registered address returns a reset token" "200" "$C"
[ -n "$RESET_TOKEN" ] && [ "$RESET_TOKEN" != "undefined" ] && T=yes || T=no
check "the token is present" "yes" "$T"

# The reset token is signed with the same secret as a session token, so this is the
# check that stops it being handed straight back as a Bearer token.
C=$(code "$API/api/auth/me" -H "Authorization: Bearer $RESET_TOKEN")
check "a reset token cannot authenticate a session" "401" "$C"

C=$(code -X POST "$API/api/auth/reset-password" -H "$J" -d '{"password":"Creator@123","confirmPassword":"Creator@123"}')
check "reset without a token is refused" "400" "$C"

C=$(code -X POST "$API/api/auth/reset-password" -H "$J" -d '{"token":"garbage","password":"Creator@123","confirmPassword":"Creator@123"}')
check "reset with a forged token is refused" "401" "$C"

C=$(code -X POST "$API/api/auth/reset-password" -H "$J" \
  -d "{\"token\":\"$RESET_TOKEN\",\"password\":\"Creator@123\",\"confirmPassword\":\"Mismatch@99\"}")
check "reset with a mismatched confirmation is refused" "400" "$C"

C=$(code -X POST "$API/api/auth/reset-password" -H "$J" \
  -d "{\"token\":\"$RESET_TOKEN\",\"password\":\"Creator@123\",\"confirmPassword\":\"Creator@123\"}")
check "reset sets the new password" "200" "$C"

C=$(code -X POST "$API/api/auth/login" -H "$J" -d '{"email":"rahul.sharma@example.com","password":"Creator@123"}')
check "the reset password signs in" "200" "$C"

# ---------------------------------------------------------------------------
# Put the rows this suite mutated back the way it found them, so it can be run
# again immediately. Without this, run #2 cannot find its pending influencer.
# ---------------------------------------------------------------------------
echo "── 13. Restore test fixtures ──"
code -X PATCH "$API/api/admin/influencers/$PID/restore" -H "$AUTH" >/dev/null
code -X PUT "$API/api/admin/influencers/$PID" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"status":"pending","rejectionReason":""}' >/dev/null
C=$(code "$API/api/admin/influencers?status=pending&q=Priya+Singh" -H "$AUTH")
check "fixtures reset (suite is re-runnable)" "priya.singh@example.com" "$(jqv "$(cat /tmp/body.json)" data.0.email)"

echo
echo "════ $pass passed, $fail failed ════"
[ "$fail" -eq 0 ]
