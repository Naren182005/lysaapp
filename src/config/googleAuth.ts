/**
 * Google OAuth configuration
 * 
 * To set up Google OAuth:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select an existing one
 * 3. Go to "APIs & Services" > "Credentials"
 * 4. Click "Create Credentials" > "OAuth client ID"
 * 5. Set up the OAuth consent screen if prompted
 * 6. Select "Web application" as the application type
 * 7. Add your domain to the "Authorized JavaScript origins"
 * 8. Add your redirect URI to the "Authorized redirect URIs"
 * 9. Copy the Client ID and paste it below
 */

// Replace with your actual Google OAuth client ID
export const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";

// Scopes requested from Google
export const GOOGLE_SCOPES = [
  "email",
  "profile",
];
