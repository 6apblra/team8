# Design Guidelines: Gaming Teammate Matchmaking App

## Authentication Architecture

**Auth Required**: Yes - the app has user accounts, matches, chat, and social features.

**Implementation**:
- SSO-based authentication (Apple Sign-In for iOS, Google Sign-In for cross-platform)
- Mock authentication in prototype using local state
- Include privacy policy & terms of service placeholder links on auth screens
- Account management includes:
  - Log out with confirmation alert
  - Delete account (nested: Settings > Account > Delete Account with double confirmation)

## Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs + Floating Action Button)

**Tab Structure**:
1. **Discover** (Home) - Swipe feed
2. **Matches** - List of mutual matches
3. **[FAB]** - Filters/Search (floating action button)
4. **Profile** - User profile and settings

**Navigation Stacks**:
- Auth Stack: Login → Onboarding (game selection, preferences setup)
- Main Stack: Tab navigator with 4 feature areas
- Modal Screens: Chat (per match), Edit Profile, Report User, Party Creation

## Screen Specifications

### 1. Onboarding Flow (Stack-Only)
**Screens**: Welcome → Game Selection → Role/Rank Setup → Schedule Setup → Region/Language

**Layout**:
- Custom header with progress indicator (dots or progress bar)
- Scrollable content area with form elements
- Fixed bottom CTA: "Continue" button
- Safe area: top = insets.top + Spacing.xl, bottom = insets.bottom + Spacing.xl

**Components**: Multi-select game cards, dropdown pickers, time slot grid, checkbox groups

### 2. Discover (Swipe Feed)
**Purpose**: Browse and swipe on player profiles

**Layout**:
- Transparent header with filter icon (right) and logo/title (center)
- Card stack as main content (non-scrollable, gesture-driven)
- Fixed bottom action buttons: Skip (left), Like (right), Super-Invite (center top)
- Safe area: top = headerHeight + Spacing.xl, bottom = Spacing.xl (no tab bar overlap)

**Components**: Swipeable cards with avatar, username, game badges, rank badges, role tags, availability status ("Online Now" pill)

### 3. Matches
**Purpose**: View and access conversations with matched players

**Layout**:
- Default navigation header with title "Matches"
- Scrollable list of match cards
- Each card shows: avatar, username, game icon, last message preview, timestamp
- Safe area: top = Spacing.xl, bottom = tabBarHeight + Spacing.xl

**Components**: FlatList, match card with avatar, text preview, badge indicators

### 4. Chat (Modal)
**Purpose**: 1-on-1 messaging with matched player

**Layout**:
- Custom header: back button (left), username + game icon (center), report/block menu (right)
- Scrollable message list (inverted)
- Fixed bottom: message input field + send button + quick template chips
- Safe area: top = Spacing.xl, bottom = insets.bottom + Spacing.xl

**Components**: Message bubbles, input field, quick message chips ("Ready to play?", "What role?"), typing indicator

### 5. Profile
**Purpose**: View and edit own profile, access settings

**Layout**:
- Transparent header with edit icon (right)
- Scrollable content: avatar, username, game cards with ranks/roles, schedule grid, playstyle tags, external links section, settings options
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

**Components**: Editable avatar, badge list, expandable sections, link buttons, toggle switches for settings

### 6. Filters (Modal from FAB)
**Purpose**: Refine swipe feed criteria

**Layout**:
- Header with "Filters" title, cancel (left), apply (right)
- Scrollable form: game selector, rank range slider, role checkboxes, region selector, language selector, mic requirement toggle, availability time picker
- Safe area: top = Spacing.xl, bottom = insets.bottom + Spacing.xl

**Components**: Segmented controls, range sliders, checkbox groups, dropdowns

## Design System

### Color Palette
**Gaming-Focused Dark Theme**:
- Primary: Electric Blue (#00D9FF) - for CTAs, active states, matches
- Secondary: Neon Purple (#B857FF) - for super-invites, premium features
- Success: Neon Green (#00FF88) - for online status, positive actions
- Danger: Hot Pink (#FF3366) - for reports, blocks, skip action
- Background: Dark Navy (#0A0E1A) - main background
- Surface: Dark Gray (#1A1F2E) - cards, elevated surfaces
- Text Primary: White (#FFFFFF)
- Text Secondary: Light Gray (#A0A8B8)

### Typography
- Display: System Bold, 28-32pt (headers, usernames)
- Headline: System Semibold, 20-24pt (section titles)
- Body: System Regular, 16pt (descriptions, messages)
- Caption: System Medium, 14pt (badges, tags, timestamps)
- Button: System Semibold, 16pt

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

### Component Specifications

**Swipe Cards**:
- Border radius: 16px
- Drop shadow: shadowOffset {width: 0, height: 4}, shadowOpacity: 0.25, shadowRadius: 8
- Gesture feedback: scale down to 0.95 on press, rotate on swipe (-15° left, +15° right)

**Buttons**:
- Primary: Filled, Electric Blue background, 48px height, 16px border radius
- Secondary: Outlined, 1px border, 48px height, 16px border radius
- Icon buttons: 44x44px touch target, subtle highlight on press

**Floating Action Button**:
- Size: 56x56px
- Background: Neon Purple gradient
- Drop shadow: shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
- Icon: Feather "sliders" icon, white color

**Badges**:
- Small pills: 8px vertical padding, 12px horizontal padding, 12px border radius
- Game-specific colors: Valorant (red), CS2 (orange), Dota2 (dark red), Fortnite (purple), LoL (gold)

**Touch Feedback**:
- All touchables: opacity 0.7 on press
- Cards: scale transform on press
- Buttons: subtle highlight overlay

## Visual Assets

**Critical Assets** (Generate):
1. **User Avatars (8 presets)**: Gaming-themed character illustrations in flat design style - cyberpunk gamer, fantasy mage, tactical soldier, sci-fi pilot, esports pro, retro arcade character, ninja, robot. Each in circular frame, vibrant colors matching theme.

2. **Game Icons**: 
   - Valorant, CS2, Dota2, Fortnite, LoL official/recognizable logos
   - Standard size: 32x32px for badges, 48x48px for profile cards

3. **Role Icons** (Feather icons):
   - Use standard icons: "target" (DPS), "shield" (Tank), "heart" (Support), "zap" (Flex), "star" (Captain)

4. **Empty States**:
   - No matches yet: illustration of two gamers with controller/keyboard shaking hands
   - No messages: illustration of chat bubble with game controller
   - Out of swipes: illustration of empty card stack with timer icon

**Standard Icons** (Feather from @expo/vector-icons):
- Navigation: "compass" (Discover), "users" (Matches), "user" (Profile), "sliders" (Filters)
- Actions: "heart" (Like), "x" (Skip), "arrow-up" (Super-invite), "message-circle" (Chat)
- Settings: "settings", "log-out", "bell", "help-circle"
- Safety: "flag" (Report), "slash" (Block)

## Accessibility

- Minimum touch target: 44x44px for all interactive elements
- Color contrast ratio: 4.5:1 for text, 3:1 for UI components
- Screen reader labels for all icons and cards
- Support for system font scaling
- Swipe alternatives: provide button controls for accessibility
- Focus indicators for keyboard navigation (web)
- Haptic feedback for swipe actions (iOS)