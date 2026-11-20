# LPU Library Seat Booking System

Frontend demo (HTML5, CSS3, vanilla JavaScript, LocalStorage). No build step.

## Run with VS Code Live Server
1. Open the `lpu-library` folder in VS Code.
2. Install the **Live Server** extension (Ritwick Dey).
3. Right-click `index.html` and choose **Open with Live Server**.
4. To reset demo data: DevTools > Application > Local Storage > delete `lpu_lib_v1` and `lpu_lib_session`, then refresh.



## Files
- `index.html` page shell · `style.css` design (LPU orange and blue, animations) · `firebase.js` optional sync · `script.js` all logic · `assets/` library photos

## Rules implemented
- Hours 9:00 AM to 12:00 AM (editable by admin), 30-minute steps, booking up to 30 days ahead.
- Rejects past dates/times, closing-time violations, end before start, double bookings and a student's own overlapping bookings.
- Group Discussion: one booking reserves all 4 seats of a table (IDs `GRP-xxxxxx`, seats listed as `GD-T02-S1..S4`).

## Optional: Firebase cloud sync (firebase.js)
Off by default, so the project still runs with LocalStorage only.
1. Firebase console > create project > add a **Web app** > copy its config into `firebase.js`.
2. Build > Firestore Database > create (test mode while developing).
3. Reload with Live Server. The demo data uploads once; every device then shares one document `lpu_library/main`.
Limits: last write wins (two people saving at the same instant can overwrite each other), the whole state is one document (1 MB cap), and login is still checked in the browser. Test-mode rules let anyone read and write, so do not store real data. Check your CSE326 rules before using it: the brief said no backend.

## Honest limits
Without Firebase, LocalStorage lives in one browser only: there is **no multi-device sync** and **no real security**. Passwords are stored in plain text for demo purposes; admin credentials are hard-coded.

## Ready for a backend
All reads/writes go through `load()`, `save()` and the `DB` object (`users`, `bookings`, `cats`, `feedback`, `hours`). Replace these with API calls (e.g. `POST /bookings`) and move validation in `confirmBook()` to the server, with hashed passwords and token auth.

## Group table booking: member details
Booking a Group Discussion table asks for exactly 4 members (member 1 is the logged-in student). Each needs an 8-digit registration number of a registered, unblocked student plus a full name; numbers must differ and nobody may already have an overlapping booking. Members are saved on the booking and shown in the receipt, My Bookings (also for the other members) and the admin booking table. To see the new demo data, clear `lpu_lib_v1` in Local Storage once; older saved bookings still work but have no member list.
