"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREDEFINED_PATTERNS = void 0;
exports.PREDEFINED_PATTERNS = [
    {
        type: 'api_key',
        pattern: /(?:sk|pk)-(?:live|test)-[a-zA-Z0-9]{20,}/gi,
        description: 'Generic API Key (sk- or pk- prefix)'
    },
    {
        type: 'bearer_token',
        pattern: /Bearer\s+[a-zA-Z0-9-._~+/]+=*/gi,
        description: 'Bearer Auth Token'
    },
    {
        type: 'jwt_token',
        pattern: /ey[a-zA-Z0-9-_]+\.ey[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/gi,
        description: 'JSON Web Token'
    },
    {
        type: 'aws_key',
        pattern: /AKIA[0-9A-Z]{16}/gi,
        description: 'AWS Access Key ID'
    },
    {
        type: 'github_token',
        pattern: /gh[pous]_[a-zA-Z0-9]{36,}/gi,
        description: 'GitHub Token'
    },
    {
        type: 'password_assignment',
        pattern: /(?:password|pwd|secret|token|key)\s*[:=]\s*["']?([^"'\s,;]+)["']?/gi,
        description: 'Password or Secret Assignment'
    },
    {
        type: 'private_key',
        pattern: /-----BEGIN\s+([A-Z ]+)\s+PRIVATE\s+KEY-----/gi,
        description: 'PEM Private Key'
    },
    {
        type: 'env_secret',
        pattern: /[A-Z0-9_]+_(?:SECRET|TOKEN|KEY|PASS|PASSWORD)=["']?[^"'\s]+["']?/gi,
        description: 'Common Environment Variable Secret'
    }
];
//# sourceMappingURL=patterns.js.map