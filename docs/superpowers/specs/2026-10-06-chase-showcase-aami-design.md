# NEXA Chase Showcase & Aami Reward Design

## Goal
Turn Chase into a profile/lifestyle showcase where opted-in users present photo-led profiles, visitors can like, comment and add friends, and profile owners earn 5 Aami for each completed block of 150 unique likes.

## Product behavior
- Chase remains an opt-in discovery surface and must preserve existing privacy/friend-request controls.
- Each Chase result becomes a profile showcase rather than a plain directory card: primary profile photo, optional showcase photos, identity/profile fields already supported by Chase, like count, comment count, comments entry point, and Add Friend.
- Likes are toggleable per viewer and counted uniquely per profile owner/viewer pair.
- Comments belong to the Chase profile showcase, are authored by authenticated users, are rate-limited and removable under the existing social safety model.
- Add Friend continues to use the existing Chase friend-request authority and proximity limits.
- Demo profiles must be available for product/design review without granting real social or Aami side effects. They should be clearly marked as demo data and isolated from production reward accounting.
- Aami reward: for every 150 unique likes accumulated on an eligible user's Chase profile, credit 5 Aami. Each 150-like threshold can be rewarded only once. The reward must be idempotent and server-authoritative.
- Aami earning remains restricted to confirmed NEXA members aged 18+ through the existing Aami account gate.
- Unliking does not claw back an already issued reward. The reward is tied to crossing a cumulative threshold, not to a reversible current balance.
- Deleted/blocked/closed users and hidden/removed Chase profiles must not expose stale interactive data.

## Data authority
The server is authoritative for like uniqueness, counts, comments, threshold detection and Aami credits. The client never calculates or posts an Aami amount.

## UX direction
- Photo-first, lifestyle-showcase presentation.
- No decorative animation requirement; preserve NEXA's existing functional interaction feedback only.
- Like count must be visible.
- Comments must be accessible from each showcase.
- Add Friend remains prominent but must reflect request state and existing proximity restrictions.
- Demo profiles should let us tune density, typography, image proportions, button placement and counts before relying on live profiles.
