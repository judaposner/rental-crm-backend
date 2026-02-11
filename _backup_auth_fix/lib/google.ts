import { google } from "googleapis";

export function getSheetsClient(tokens: any) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  auth.setCredentials(tokens);

  return google.sheets({ version: "v4", auth });
}

