# Mintlify & MCP Integration Guide

This guide details the Mintlify configuration and Model Context Protocol (MCP) server setup for automated documentation management.

---

## 1. Mintlify Configuration (`docs.json`)

The portal documentation is configured using `docs.json` compliant with Mintlify standard specifications:

- **Location**: `/docs.json` (root) and `/docs/docs.json`
- **Schema**: `https://mintlify.com/docs.json`
- **Primary Color**: `#4F46E5` (Indigo)
- **Top Bar Action**: "Launch Portal" pointing to the live preview deployment.

---

## 2. MCP Server Configuration (`mcp.config.json`)

To enable Model Context Protocol (MCP) tools for Mintlify content management and search, add the following configuration to your client application:

```json
{
  "mcpServers": {
    "Mintlify": {
      "url": "https://mcp.mintlify.com",
      "clientId": "mcp-cc-f0e3b51b-d333-4989-9563-ceaaac149ece",
      "clientSecret": "sA2EYfVPcdNeIWM27pZZJUAjrDQbg-AB4dqqAQkYzDRJlJRC"
    }
  }
}
```

---

## 3. Documentation Structure

- **Getting Started**: `docs/README.md`, `docs/DEVELOPMENT_GUIDE.md`
- **Architecture & Engineering**: `docs/ARCHITECTURE.md`, `docs/PROJECT_STRUCTURE.md`, `docs/TECHNICAL_OVERVIEW.md`
- **Workflows & Data Flow**: `docs/USER_FLOWS.md`, `docs/STATE_MANAGEMENT.md`, `docs/ROUTING.md`
- **Specifications & Security**: `docs/CONFIGURATION.md`, `docs/SECURITY.md`
