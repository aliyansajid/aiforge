# Complete Navigation Structure

## Overview
The AIForge application now has a comprehensive navigation system with all essential pages implemented and properly linked with Role-Based Access Control (RBAC).

## Main Sidebar Navigation

### 1. **Dashboard**
- **Route**: `/{teamSlug}/dashboard`
- **Icon**: LayoutDashboard
- **Access**: All team members (OWNER, ADMIN, MEMBER)
- **Description**: Overview of team statistics, recent projects, and quick actions
- **Features**:
  - Total projects and endpoints count
  - Team members count
  - User role display
  - Recent projects list
  - Quick action buttons
  - Team information card

### 2. **Projects**
- **Route**: `/{teamSlug}`
- **Icon**: Boxes
- **Access**: All team members
- **Description**: List of all team projects
- **Features**:
  - Project cards with endpoint counts
  - Create new project button (OWNER/ADMIN)
  - Empty state with CTA

### 3. **Analytics**
- **Parent Route**: `/{teamSlug}/analytics`
- **Icon**: BarChart3
- **Access**: All team members
- **Subitems**:

  #### 3.1 Usage Analytics
  - **Route**: `/{teamSlug}/analytics/usage`
  - **Features**:
    - Total requests count
    - Active endpoints
    - Average response time
    - Estimated cost
    - Request volume charts (placeholder)
    - Endpoint usage breakdown

  #### 3.2 Performance Analytics
  - **Route**: `/{teamSlug}/analytics/performance`
  - **Features**:
    - Uptime percentage
    - Average latency
    - P95 latency
    - Error rate
    - Response time trends (placeholder)
    - Endpoint health status

### 4. **Settings**
- **Parent Route**: `/{teamSlug}/settings`
- **Icon**: Settings2
- **Access**: RBAC-controlled (varies by subsection)
- **Subitems**:

  #### 4.1 General Settings
  - **Route**: `/{teamSlug}/settings/general`
  - **Access**: OWNER only
  - **Features**:
    - Update team name
    - View team ID and slug
    - Danger zone (delete team - disabled)

  #### 4.2 Team Members
  - **Route**: `/{teamSlug}/settings/members`
  - **Access**: OWNER and ADMIN
  - **Features**:
    - List active members with roles
    - Invite new members
    - Manage member roles (OWNER only)
    - Remove members
    - View pending invitations
    - Resend/cancel invitations
    - Role permissions guide

  #### 4.3 Billing
  - **Route**: `/{teamSlug}/settings/billing`
  - **Access**: OWNER only
  - **Features**:
    - Current plan (Beta - Free)
    - Usage statistics
    - Payment method (placeholder)
    - Billing history (placeholder)

### 5. **Projects List** (Sidebar Section)
- **Dynamic**: Shows all team projects
- **Route Pattern**: `/{teamSlug}/{projectSlug}`
- **Access**: All team members
- **Features**:
  - Quick navigation to any project
  - Shows project icon

## Project-Level Pages

### 1. **Project Details**
- **Route**: `/{teamSlug}/{projectSlug}`
- **Features**:
  - List of all endpoints in the project
  - Search and filter endpoints
  - Create new endpoint button
  - Endpoint cards with status badges

### 2. **Create Endpoint**
- **Route**: `/{teamSlug}/{projectSlug}/create-endpoint`
- **Features**:
  - Upload ML model
  - Configure endpoint settings
  - Deploy model

### 3. **Endpoint Details**
- **Route**: `/{teamSlug}/{projectSlug}/{endpointSlug}`
- **Features**:
  - Endpoint status and information
  - API key management
  - Test endpoint
  - View logs and metrics

## Special Pages

### **Invitation Acceptance**
- **Route**: `/invite/accept?token={token}`
- **Access**: Public (with valid token)
- **Features**:
  - Token validation
  - Email verification
  - Team and role information display
  - Accept/decline options
  - Automatic redirection

## Role-Based Access Control

### OWNER Permissions
- ✅ All Dashboard and Analytics pages
- ✅ All Projects pages
- ✅ All Settings pages (General, Members, Billing)
- ✅ Can manage all team members
- ✅ Can change member roles
- ✅ Can remove any member except themselves
- ✅ Can update team settings
- ✅ Can view billing information

### ADMIN Permissions
- ✅ All Dashboard and Analytics pages
- ✅ All Projects pages
- ✅ Settings: Members only
- ✅ Can invite members
- ✅ Can remove MEMBERs (not other ADMINs or OWNER)
- ❌ Cannot change member roles
- ❌ Cannot access General settings
- ❌ Cannot access Billing

### MEMBER Permissions
- ✅ All Dashboard and Analytics pages
- ✅ All Projects pages
- ✅ Can create endpoints
- ✅ Can manage their own endpoints
- ❌ Cannot access any Settings pages
- ❌ Cannot invite members
- ❌ Cannot remove members

## Navigation Implementation

### Sidebar Component
**File**: `apps/app/components/app-sidebar.tsx`

Features:
- Dynamic menu generation based on user role
- RBAC permission checking
- Conditional rendering of menu items
- Team switcher integration
- Project list integration

### Layout Integration
**File**: `apps/app/app/[teamSlug]/layout.tsx`

Features:
- Passes current user role to sidebar
- Breadcrumb navigation
- Consistent header across all pages

### Settings Layout
**File**: `apps/app/app/[teamSlug]/settings/layout.tsx`

Features:
- Secondary navigation for settings pages
- Role-based tab visibility
- Clean sidebar navigation

## Page Implementations

### Created Pages
1. ✅ `/{teamSlug}/dashboard` - Dashboard overview
2. ✅ `/{teamSlug}` - Projects listing
3. ✅ `/{teamSlug}/analytics/usage` - Usage analytics
4. ✅ `/{teamSlug}/analytics/performance` - Performance analytics
5. ✅ `/{teamSlug}/settings/general` - General settings
6. ✅ `/{teamSlug}/settings/members` - Member management
7. ✅ `/{teamSlug}/settings/billing` - Billing information
8. ✅ `/{teamSlug}/{projectSlug}` - Project details
9. ✅ `/{teamSlug}/{projectSlug}/create-endpoint` - Create endpoint
10. ✅ `/{teamSlug}/{projectSlug}/{endpointSlug}` - Endpoint details
11. ✅ `/invite/accept` - Accept invitation

### Created Components
1. ✅ `components/app-sidebar.tsx` - Main sidebar
2. ✅ `components/settings/team-general-settings.tsx` - Team settings form
3. ✅ `components/members/members-table.tsx` - Members list
4. ✅ `components/members/invitations-table.tsx` - Invitations list
5. ✅ `components/members/invite-member-button.tsx` - Invite modal
6. ✅ `components/members/role-permissions-info.tsx` - Permissions guide
7. ✅ `components/members/invite-accept-content.tsx` - Invitation acceptance

## Key Features

### 1. **Complete RBAC Integration**
- Every page checks user permissions
- Navigation items show/hide based on role
- Actions are permission-gated
- Proper redirects for unauthorized access

### 2. **Email Invitation System**
- Send invitations via email
- Token-based validation
- Email verification on acceptance
- 7-day expiration
- Resend and cancel options

### 3. **Analytics Placeholders**
- Usage tracking ready
- Performance monitoring ready
- Charts and graphs placeholders
- Easy to integrate real data

### 4. **Billing Structure**
- Beta pricing (free)
- Usage tracking ready
- Plan management structure
- Payment method integration ready

## Future Enhancements

### To Implement
1. Real-time analytics data integration
2. Actual billing system integration
3. Team name update functionality
4. Team deletion functionality
5. Chart libraries for analytics visualization
6. API usage tracking
7. Performance monitoring metrics
8. Notification system
9. Activity logs
10. Webhook integrations

## Testing Checklist

- [ ] Test all navigation links work correctly
- [ ] Verify RBAC permissions for each role
- [ ] Test invitation flow end-to-end
- [ ] Verify email sending works
- [ ] Test member management operations
- [ ] Check responsiveness on all pages
- [ ] Test breadcrumb navigation
- [ ] Verify settings pages access control
- [ ] Test project and endpoint navigation
- [ ] Check all empty states display correctly

## Notes

- All pages are server-side rendered for optimal performance
- RBAC checks happen both client and server side
- Navigation is responsive and mobile-friendly
- Empty states guide users to take action
- All forms have proper validation
- Loading states are handled appropriately
