# OAuth System Refactoring - Phase 1

This document outlines the first phase of OAuth system refactoring that centralizes OAuth service configurations and eliminates hardcoded service type checks across the entire codebase.

## 🚀 Adding a New OAuth Provider

Thanks to our centralized configuration system, adding a new OAuth provider is now as simple as updating a single JSON file:

### Step 1: Add Service Configuration

Edit `oauth-services.json` and add your new service:

```json
{
  "services": {
    "Slack": {
      "displayName": "Slack",
      "internalName": "slack",
      "type": "oauth2",
      "category": "predefined",
      "config": {
        "authorizationURL": "https://slack.com/oauth/v2/authorize",
        "tokenURL": "https://slack.com/api/oauth.v2.access",
        "scope": "channels:read users:read"
      },
      "callbackPath": "/oauth/slack/callback",
      "validation": {
        "required": ["clientID", "clientSecret", "authorizationURL", "tokenURL", "scope"]
      }
    }
  }
}
```

### Step 2: That's It!

The new service will automatically work across:

- ✅ Frontend service type detection and validation
- ✅ Backend OAuth routing and callback handling
- ✅ React component dropdowns and form validation
- ✅ Builder UI configuration and defaults
- ✅ Callback URL generation and normalization

## 🔧 Adding OAuth Authentication to a Component

To add OAuth authentication functionality to a Builder UI component, follow this modular approach:

### Step 1: Create OAuth Settings Helper

Use the `oAuthSettings` helper class to handle all OAuth-related logic:

```typescript
import { oAuthSettings } from '../../helpers/oauth/oauth-settings.helper';
import { Trigger } from './Trigger.class';

export class GmailTrigger extends Trigger {
  private oauth: oAuthSettings | undefined;
  //...
}
```

### Step 2: Initialize OAuth in prepare()

Initialize the OAuth helper in your component's `prepare()` method:

```typescript
protected async prepare(): Promise<boolean> {
  try {
    // Initialize OAuth settings helper
    this.oauth = new oAuthSettings(this);
    await this.oauth.initialize();
    return true;
  } catch (error) {
    console.error('Error preparing OAuth component:', error);
    return false;
  }
}
```

### Step 3: Configure OAuth Settings

Spread the OAuth configuration into your component's settings:

```typescript
protected async init(): Promise<void> {
  await super.init();

  // Set up component settings with OAuth configuration
  this.settings = {
    // Your component-specific settings
    interval: {
      type: 'range',
      label: 'Interval',
      min: 1,
      max: 720,
      value: 1,
    },
    // Spread OAuth settings (connection selector + auth button)
    ...this.oauth?.configure(),
  };
}
```

### Step 4: Clean Up Resources

Ensure proper cleanup in the `destroy()` method:

```typescript
destroy(): void {
  // Clean up OAuth helper
  if (this.oauth) {
    this.oauth.destroy();
  }

  super.destroy?.();
}
```

### What You Get Automatically:

- ✅ **OAuth Connection Selector**: Dropdown with all available OAuth connections
- ✅ **Add/Edit Connection Actions**: "Add New" and "Edit" options in the dropdown
- ✅ **Authentication Button**: Shows connection status and allows sign-in/sign-out
- ✅ **Connection Management**: Full CRUD operations for OAuth connections
- ✅ **Service Type Detection**: Automatic handling of OAuth1, OAuth2, and Client Credentials
- ✅ **Form Validation**: Service-specific field validation
- ✅ **Error Handling**: Centralized error handling and user feedback

### ⚠️ Special Note: APICall Component

The `APICall.class.ts` component currently **does not** use the `oAuthSettings` helper approach described above. Instead, it implements OAuth functionality directly within the component itself.

**Why?** The APICall component needs to handle:

- **Legacy data formats** from existing workflows
- **Backward compatibility** with older OAuth connection structures
- **Complex field mapping** between different data formats
- **Direct integration** with API call configurations

**Migration Needed:** To improve maintainability, the APICall component should be migrated to use the `oAuthSettings` helper approach while maintaining backward compatibility. This would:

- ✅ **Reduce code duplication** (currently ~200 lines of OAuth logic)
- ✅ **Improve consistency** with other OAuth-enabled components
- ✅ **Simplify maintenance** by centralizing OAuth logic
- ✅ **Enhance testing** through better separation of concerns

**Recommended Approach:**

1. Create a specialized `APICallOAuthSettings` class that extends `oAuthSettings`
2. Handle legacy data format conversion within this specialized class
3. Gradually migrate APICall to use the helper while maintaining compatibility
4. Add comprehensive tests for both legacy and new data formats

### Configuration Options

| Field                 | Description                                                              | Required |
| --------------------- | ------------------------------------------------------------------------ | -------- |
| `displayName`         | User-facing service name                                                 | ✅       |
| `internalName`        | Internal service identifier                                              | ✅       |
| `type`                | OAuth flow type: `oauth1`, `oauth2`, `oauth2_client_credentials`, `none` | ✅       |
| `category`            | Service category: `predefined`, `custom`, `system`                       | ✅       |
| `config`              | Default URLs and scopes (empty for custom services)                      | ✅       |
| `callbackPath`        | OAuth callback path pattern                                              | ✅       |
| `validation.required` | Required form fields for this service type                               | ✅       |

## 📚 System Dependencies

### Core Components

#### `oauth-services.json`

- **Purpose**: Single source of truth for all OAuth service configurations
- **Contains**: Service definitions, default URLs, validation rules, callback paths
- **Impact**: Changes here propagate automatically across the entire system

#### `oauth-services.helper.ts` - `OAuthServicesRegistry`

- **Purpose**: Centralized API for accessing OAuth service configurations
- **Key Methods**:
  - `isOAuth2Service()` / `isOAuth1Service()` / `isClientCredentialsService()` - Service type detection
  - `getServiceDefaults()` - Get pre-configured URLs and scopes
  - `getValidationRules()` - Get required fields for validation
  - `mapServiceNameToInternal()` / `mapInternalToServiceName()` - Name mapping
  - `getCallbackPath()` - Get OAuth callback paths

#### `oauth.utils.ts`

- **Purpose**: Shared OAuth utilities and helper functions
- **Updated**: Now delegates to `OAuthServicesRegistry` instead of hardcoded logic
- **Functions**: URL derivation, platform extraction, API response handling

## 🏗️ Code Dependencies by Section

### React Components (`src/react/features/vault/`)

#### Components Using OAuth Logic:

- **`create-oauth-connection-modal.tsx`**
  - Service type detection for field visibility
  - Pre-filling service defaults
  - Form validation based on service type

- **`use-vault-oauth.ts`**
  - OAuth connection CRUD operations
  - Service type determination for API calls
  - Data format conversion between storage and UI

#### Key Integration Points:

```typescript
// Service type checks
const showOAuth2Fields = OAuthServicesRegistry.isOAuth2Service(selectedService);
const showOAuth1Fields = OAuthServicesRegistry.isOAuth1Service(selectedService);

// Service defaults
const serviceDefaults = OAuthServicesRegistry.getServiceDefaults(selectedService);
```

### Builder UI (`src/builder-ui/`)

#### Components Using OAuth Logic:

- **`components/APICall.class.ts`**
  - OAuth service configuration in API calls
  - Service type detection for field visibility
  - Default URL pre-filling

- **`helpers/oauth/oauth.service.ts`**
  - OAuth connection management
  - Service name mapping
  - Callback URL normalization

- **`helpers/oauth/ui.helper.ts`**
  - OAuth modal UI logic
  - Form validation
  - Service-specific field handling

- **`helpers/oauth/oauth-modal.helper.ts`**
  - OAuth modal HTML generation
  - Service default pre-filling
  - Field visibility management

#### Key Integration Points:

```typescript
// Service configuration
const isOAuth2 = OAuthServicesRegistry.isOAuth2Service(selectedValue);
const serviceDefaults = OAuthServicesRegistry.getServiceDefaults(selectedService);
const callbackPath = OAuthServicesRegistry.getCallbackPath(serviceType);
```

### Backend (`src/backend/`)

#### Components Using OAuth Logic:

- **`middlewares/oauthStrategy.mw.ts`**
  - OAuth strategy initialization
  - Service type detection for routing
  - Callback URL derivation

- **`routes/oauth/router.ts`**
  - OAuth flow routing (OAuth1 vs OAuth2)
  - Authentication URL construction
  - Service-specific parameter handling

#### Key Integration Points:

```typescript
// Service type detection
const isOAuth2 = OAuthServicesRegistry.isOAuth2Service(service);
const isOAuth1 = OAuthServicesRegistry.isOAuth1Service(service);

// Flow routing
if (OAuthServicesRegistry.isOAuth2Service(service) || service === 'oauth2') {
  // OAuth2 flow
} else if (OAuthServicesRegistry.isOAuth1Service(service) || service === 'oauth1') {
  // OAuth1 flow
}
```

## 🔄 What We Accomplished

### Before Refactoring:

- ❌ **8+ files** with hardcoded service arrays like `['Google', 'LinkedIn', 'Custom OAuth2.0']`
- ❌ **Duplicated service defaults** across 6+ components
- ❌ **Inconsistent service type checks** using different logic
- ❌ **Manual synchronization** required when adding new services
- ❌ **High maintenance risk** - easy to miss files when making changes

### After Refactoring:

- ✅ **1 centralized JSON file** (`oauth-services.json`) as single source of truth
- ✅ **Consistent API** (`OAuthServicesRegistry`) used across all components
- ✅ **Automatic propagation** - JSON changes apply everywhere instantly
- ✅ **Type-safe service detection** with comprehensive validation
- ✅ **Easy service addition** - just update JSON, no code changes needed

### Files Refactored:

- **Frontend**: `oauth.utils.ts`, `ui.helper.ts`, `oauth-modal.helper.ts`, `create-oauth-connection-modal.tsx`, `use-vault-oauth.ts`
- **Builder UI**: `APICall.class.ts`, `oauth.service.ts`
- **Backend**: `oauthStrategy.mw.ts`, `router.ts`

## 🚧 Future Refactoring Needs

While this phase significantly improved maintainability, the OAuth system still requires additional refactoring:

### Remaining Technical Debt:

1. **Data Format Inconsistencies**: Multiple OAuth data formats exist (nested vs flat) across different parts of the system
2. **Complex Type Definitions**: OAuth type interfaces are scattered and sometimes duplicated
3. **Legacy Compatibility Code**: Backward compatibility logic that could be simplified
4. **Callback URL Logic**: Still contains some hardcoded callback path generation
5. **Error Handling**: OAuth error handling could be more centralized and consistent
6. **Testing**: OAuth flows need comprehensive test coverage

### Recommended Next Steps:

1. **Unify Data Formats**: Standardize on a single OAuth connection data format
2. **Consolidate Type Definitions**: Create a single, comprehensive OAuth type system
3. **Simplify Callback Logic**: Fully leverage centralized callback path configuration
4. **Enhanced Error Handling**: Create centralized OAuth error handling and user feedback
5. **Comprehensive Testing**: Add unit and integration tests for all OAuth flows
6. **Documentation**: Create detailed OAuth flow documentation for developers

### Benefits of Future Refactoring:

- 🎯 **Reduced Complexity**: Simpler codebase with fewer edge cases
- 🔧 **Easier Debugging**: Centralized error handling and logging
- 🚀 **Better Performance**: Optimized OAuth flows with reduced redundancy
- 📚 **Improved Developer Experience**: Clear patterns and comprehensive documentation
- 🛡️ **Enhanced Security**: Standardized security practices across all OAuth flows

---

_This refactoring represents a significant step toward a more maintainable and scalable OAuth system. The centralized configuration approach provides a solid foundation for future improvements while immediately reducing the complexity of adding new OAuth providers._
