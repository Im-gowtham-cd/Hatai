/**
 * ANTIGRAVITY TEST FILE
 * Use this file to verify the extension's detection and redaction capabilities.
 */

// 1. Critical Severity: AWS Key
const AWS_ACCESS_KEY = "{{AWS_ACCESS_KEY}}";

// 2. High Severity: OpenAI Key
const OPENAI_KEY = "sk-ant-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0";

// 3. Medium Severity: Generic Password
const db_config = {
    host: "localhost",
    user: "admin",
    password: "SuperSecretPassword123!"
};

// 4. Custom Pattern (from .antigravity.json)
const internal_token = "INT-ABC123DEF456GHI789JKL012MNO345P6";

// 5. JWT Token
const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

console.log("Antigravity is watching...");
