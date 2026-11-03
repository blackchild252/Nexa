# B314 — V5.99.68 (Kitchen Hub, 25 milestones)

## Done (each has a passing server test unless marked)
1. Owner approval screen in the Hub tab (admins only). Screen NOT TESTED on a phone.
2. Approval queue shows counts: pending, approved, rejected, suspended.
3. Every decision, apply and order change is written to an audit log (admin can read it).
4. Reject and suspend need a written reason; the shop owner sees it.
5. A rejected shop can apply again ("Apply again").
6. Iceland cannot be rejected or suspended from the queue.
7. Seller order inbox (server).
8. Seller order inbox (screen, NOT TESTED on a phone).
9. Buyer taps "I have paid".
10. Seller taps "Confirm payment received" (or "Not received").
11. Seller marks shipped; seller or buyer marks delivered.
12. Cancel rules: buyer before paying, seller before payment is confirmed, nobody after.
13. Order status guard: wrong moves and strangers are refused.
14. Delivery country and address are required on every order.
15. Ship-to list is enforced (the shop's own country is always allowed; an empty list means no limit).
16. Delivery charge is worked out on the server from the shop's weight billing (kg, g, lb, oz, flat, per item, minimum). The app cannot set it.
17. Order total = items + delivery, shown to the buyer and the seller.
18. Items carry a weight in grams.
19. Seller can edit item name, price, weight.
20. Seller can hide or delete an item (old orders stay readable).
21. Item photos: PNG, JPEG or WebP only, size capped, shown in the shop.
22. "My hub orders" list for buyers, with the shop's payment details.
23. Filter shops by country.
24. Notifications: owner on new application, shop owner on decision, seller on new order, both sides on status change.
25. Country requirements added: France, Germany, Canada, South Africa, Kenya, UAE, India (total 12 plus a general fallback).

## TESTED / PASSED
- New hub tests: 21 of 21 (behaviour through a fake server and in-memory database).
- Full server suite: 4931 passed, 26 failed. All 26 fail the same way on the untouched V5.99.66 copy (no node_modules here: dotenv and the SQLite wrapper are missing), except one release-enforcement test that only needs these release notes to exist.
- Devil's Walk: clean.

## NOT TESTED / BLOCKED
- Hub screens on a phone; photo picker; keyboard behaviour on long forms.
- Real notifications arriving on a device.
- Typecheck (no node_modules).
- Still no payment provider: the buyer pays the seller outside NEXA and the seller confirms. NEXA cannot see or protect that money.
- Country requirement text is a starter list; check it against real rules before launch.
- Photos are stored in the database as small images; fine for a start, move to file storage if shops get many items.

## Next
- Real payment provider for the hub; phone check of the Hub screens.
