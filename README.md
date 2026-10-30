# FlashVault (React + Firebase)
1. `npm install && npm run dev`
2. Firebase console: enable Authentication → Email/Password, create Firestore, paste `firestore.rules` into Rules.
3. Register on the site, then in Firestore create collection `admins` with a document whose ID is your user UID (shown on /admin). Refresh → Admin appears.
4. Admin → Tools → add tools (Drive URL + password are saved in the protected `secrets` collection).
5. Admin signs in at /admin/login (separate header, footer and login page).
6. Create the first admin at /admin/register (one-time, locks afterwards). Customers top up at /wallet.
7. Enterprise features: orders + printable invoices, categories, sorting, CSV export, revenue chart, info pages. Republish firestore.rules.
8. Hero slider: Admin → Hero slider. Each picture is saved as a base64 string in its own Firestore doc in `banners`. Republish firestore.rules so the new `banners` rule is active.
