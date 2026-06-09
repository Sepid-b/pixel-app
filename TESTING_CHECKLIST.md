# Testing Checklist

Use this checklist to verify all features are working correctly.

## Setup Verification

- [ ] Dependencies installed: `npm install` completed in root, backend, and frontend
- [ ] Backend starts: `cd backend && npm run dev` shows "Backend server running"
- [ ] Frontend starts: `cd frontend && npm run dev` opens on port 5173
- [ ] Both start together: `npm run dev` from root runs both servers

## Authentication

- [ ] Login screen displays correctly
- [ ] Can sign in with b.sepid@gmail.com / Pixel2026!
- [ ] Invalid credentials show error message
- [ ] Successful login redirects to app
- [ ] User avatar and name display in top right
- [ ] Sign out button works

## Navigation

- [ ] Top nav shows: Logo, Board/List switcher, Vibe strip area, Theme toggle, User menu
- [ ] Sidebar shows all menu items: Home, My tasks, Due this week, Standup, Time tracking, Projects, Docs, Activity
- [ ] Sidebar collapse/expand button works
- [ ] Board view tab is active by default
- [ ] Switching to List view works

## Board View - Basic

- [ ] 5 columns display: To do, In progress, In review, Blocked, Done
- [ ] Column headers show task counts
- [ ] "New task" button opens modal
- [ ] Toolbar shows filters: Member, Project, Priority, Search

## Board View - Create Task

- [ ] Click "New task" opens modal
- [ ] Modal has all fields: Title, Description, Status, Priority, Project, Assignee, Due date, Hours
- [ ] Title is required (error shows if empty)
- [ ] Can select status from dropdown
- [ ] Can select priority: Low, Medium, High
- [ ] Can select project (if any exist)
- [ ] Can select assignee from members
- [ ] Can pick due date from date picker
- [ ] Can enter hours (accepts decimals like 2.5)
- [ ] Cancel button closes modal
- [ ] Create button saves task
- [ ] New task appears in correct column
- [ ] Error message displays if save fails

## Board View - Task Cards

- [ ] Task cards show title
- [ ] Tags display as colored chips (if added)
- [ ] Priority badge shows (if set)
- [ ] Due date shows with calendar icon (if set)
- [ ] Hours show with clock icon (if set)
- [ ] Assignee avatar shows (if assigned)
- [ ] Project color shows as left border (if set)
- [ ] Card has hover effect (lifts slightly)

## Board View - Drag and Drop

- [ ] Can grab a task card
- [ ] Column highlights when dragging over it
- [ ] Can drop task in different column
- [ ] Task moves to new column
- [ ] Task status updates in database
- [ ] Can reorder tasks within same column
- [ ] Multiple users see updates (open in 2 tabs)

## Board View - Task Detail Modal

- [ ] Click task card opens detail modal
- [ ] Modal has split layout: Left (details), Right (metadata)
- [ ] Can edit title
- [ ] Can edit description (multiline)
- [ ] Can change status
- [ ] Can change priority
- [ ] Can change project
- [ ] Can change assignee
- [ ] Can change due date
- [ ] Can change hours
- [ ] Save button updates task
- [ ] Changes reflect immediately in board
- [ ] Error shows if save fails (modal stays open)

## Board View - Comments

- [ ] Comments section shows in task detail
- [ ] Existing comments load (if any)
- [ ] Comment shows: Avatar, Name, Date, Content
- [ ] Can type new comment
- [ ] Can press Enter to send
- [ ] Send button posts comment
- [ ] New comment appears immediately
- [ ] Comment shows current user as author

## Board View - Docs

- [ ] Docs section shows in task detail
- [ ] Can add URL
- [ ] Can add optional title
- [ ] Add button creates doc
- [ ] Doc shows as link (opens in new tab)
- [ ] Delete button (X) removes doc
- [ ] Multiple docs can be added

## Board View - Tags

- [ ] Tags section shows in task detail (right side)
- [ ] All available tags display as buttons
- [ ] Active tags are highlighted
- [ ] Can click to toggle tag on/off
- [ ] Tags appear on task card immediately
- [ ] Default tags exist: design, feedback, urgent, review-needed, waiting-for-client, quick-win

## Board View - Filters

- [ ] Member dropdown shows all members
- [ ] Selecting member filters tasks
- [ ] "All members" shows all tasks
- [ ] Project dropdown shows all projects
- [ ] Selecting project filters tasks
- [ ] "All projects" shows all tasks
- [ ] Priority dropdown has Low, Medium, High
- [ ] Selecting priority filters tasks
- [ ] "All priorities" shows all tasks
- [ ] Search box filters by task title
- [ ] Filters work in combination
- [ ] Clearing filters shows all tasks
- [ ] Dropdowns close when clicking outside

## List View - Table

- [ ] Table has 6 columns: Status, Task, Project, Assignee, Priority, Due
- [ ] All filtered tasks display
- [ ] Empty state shows if no tasks
- [ ] Task title shows in Task column
- [ ] Tags show in Task column (up to 2)
- [ ] Project shows with colored dot
- [ ] Assignee shows with avatar and name
- [ ] Priority shows as colored badge
- [ ] Due date formatted correctly

## List View - Status Dots

- [ ] Status column shows colored dots
- [ ] Colors: gray (todo), blue (in-progress), orange (in-review), red (blocked), green (done)
- [ ] Clicking dot changes status
- [ ] Status cycles: todo → in-progress → in-review → blocked → done → todo
- [ ] Hover effect on dots (scales up)
- [ ] Multiple clicks cycle through all statuses

## List View - Done Tasks

- [ ] Done tasks show with strikethrough
- [ ] Done tasks are dimmed (60% opacity)
- [ ] Done tasks still clickable

## List View - Task Detail

- [ ] Clicking row (not status dot) opens task detail
- [ ] Modal has same layout as board view detail
- [ ] Can edit all fields
- [ ] Save updates task
- [ ] Changes reflect in table
- [ ] Cancel closes modal

## Theme System

- [ ] Default theme is dark
- [ ] Dark theme colors: Dark background, light text
- [ ] Click sun/moon icon toggles theme
- [ ] Light theme colors: Light background, dark text
- [ ] Theme persists when refreshing page
- [ ] Theme applies to all components
- [ ] Dropdowns use theme colors
- [ ] Modals use theme colors
- [ ] Inputs use theme colors

## Vibe Strip

- [ ] Top nav shows vibe strip area
- [ ] Note: Vibes require standup data (not implemented in Phase 1 UI)
- [ ] With data, would show: Member avatars
- [ ] With data, would animate: Letter ↔ Emoji every 4.5 seconds
- [ ] With data, emojis would be: 1=😩, 2=😔, 3=😐, 4=😊, 5=🔥

## Real-time Updates

- [ ] Open app in two browser tabs
- [ ] Create task in tab 1
- [ ] Task appears in tab 2 (without refresh)
- [ ] Move task in tab 1
- [ ] Task moves in tab 2
- [ ] Update task in tab 1
- [ ] Changes appear in tab 2
- [ ] Delete task in tab 1
- [ ] Task disappears in tab 2

## Responsive Design

- [ ] App works on desktop (1920px)
- [ ] App works on laptop (1366px)
- [ ] Sidebar collapse useful on smaller screens
- [ ] Modals are scrollable on small screens
- [ ] Board view scrolls horizontally if needed

## Error Handling

- [ ] Network errors show user-friendly messages
- [ ] Invalid data shows validation errors
- [ ] Failed saves keep modal open
- [ ] Errors don't crash the app
- [ ] Console logs show detailed errors (for debugging)

## Performance

- [ ] App loads quickly (< 2 seconds)
- [ ] No lag when dragging tasks
- [ ] Filters apply instantly
- [ ] Search is responsive
- [ ] Large task lists scroll smoothly

## Build & Deploy

- [ ] `npm run build` succeeds with no errors
- [ ] Build output in frontend/dist/
- [ ] No console warnings in build
- [ ] Bundle size reasonable (< 500KB)

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)

## Known Limitations (Expected)

These are **not implemented** in Phase 1:
- ❌ Standup view (API ready, no UI)
- ❌ Time tracking view (API ready, no UI)
- ❌ Activity log view (table exists, no UI)
- ❌ Project creation modal (API works via direct DB insert)
- ❌ Sidebar navigation (items render but don't route)
- ❌ Vibe animation (needs standup data)

These are **future enhancements**:
- File attachments
- Task dependencies
- Notifications
- Email integration
- Mobile app
- Keyboard shortcuts

## Production Testing (After Deployment)

- [ ] Vercel URL loads
- [ ] Can log in on production
- [ ] Create task works
- [ ] Drag and drop works
- [ ] All filters work
- [ ] Real-time updates work
- [ ] No CORS errors in console
- [ ] No 404s for API calls
- [ ] Images/assets load correctly

## Final Verification

- [ ] All critical features work
- [ ] No console errors
- [ ] No broken links
- [ ] Login/logout cycle works
- [ ] Data persists correctly
- [ ] App is usable for real work

---

## Summary Counts

Total checks: ~150
Critical checks: ~50
Nice-to-have checks: ~100

If all critical checks pass, the app is **production-ready**.

## Bug Report Template

If you find issues:

```
**Bug**: Brief description
**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected**: What should happen
**Actual**: What actually happens
**Browser**: Chrome 120 / Firefox 121 / etc.
**Console Errors**: [Paste any errors]
**Screenshots**: [If relevant]
```

---

**Happy Testing!** 🧪
