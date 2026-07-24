# n8n-nodes-evolution-api Plugin Reference

**Source:** Confirmed from GitHub `oriondesign2015/n8n-nodes-evolution-api` (main branch)
**Date:** 2026-07-24

## Node Identifiers

```
Node type (workflow JSON "type"):     evolutionApi
Node typeVersion:                     1
Credential type:                      evolutionApi
Credential properties:                server-url (string), apikey (string/password)
Credential auth:                      Generic header { apikey: <value> }
```

## Resources (parameter: `resource`)

| Display Name | Value |
|---|---|
| Instância | `instances-api` |
| Mensagem | `messages-api` |
| Grupo | `groups-api` |
| Chat | `chat-api` |
| Perfil | `profile-api` |
| Evento | `events-api` |
| Integração | `integrations-api` |

## Message Operations (parameter: `operation`, when `resource = messages-api`)

| Display Name | Value |
|---|---|
| Enviar Texto | `send-text` (default) |
| Enviar Imagem | `send-image` |
| Enviar Video | `send-video` |
| Enviar Audio | `send-audio` |
| Enviar Documento | `send-document` |
| Enviar Enquete | `send-poll` |
| Enviar Contato | `send-contact` |
| Enviar Lista | `send-list` |
| Enviar Botões | `send-buttons` |
| Enviar PIX | `send-pix` |
| Enviar Status | `send-stories` |
| Reagir Mensagem | `send-reaction` |

## sendText Parameters

| Parameter | Type | Description |
|---|---|---|
| `instanceName` | string | Instance name (e.g., `mypersonal`) |
| `remoteJid` | string | Phone number — **raw digits accepted** (e.g., `201012345678`). The API handles JID conversion internally. |
| `messageText` | string | Message text content |
| `options_message` | object | Optional: `delay`, `linkPreview`, `quoted.messageQuoted.messageId`, `mentions` |

## sendText Internals

- Endpoint: `POST /message/sendText/{instanceName}`
- Body: `{ number: remoteJid, text: messageText, ...options }`
- Response: `{ success: true, data: <Evolution API response> }`
- The Evolution API response contains `key.id` as the message ID

## Workflow JSON Node Template

```json
{
  "type": "n8n-nodes-evolution-api.evolutionApi",
  "typeVersion": 1,
  "credentials": {
    "evolutionApi": {
      "id": "<credential-id>",
      "name": "7alm Evolution API"
    }
  },
  "parameters": {
    "resource": "messages-api",
    "operation": "send-text",
    "instanceName": "mypersonal",
    "remoteJid": "={{ $json.phone }}",
    "messageText": "={{ $json.text }}"
  }
}
```

## Number Format Decision (D6)

**Confirmed: raw digits.** The plugin passes `remoteJid` directly as the `number` field to Evolution API. Evolution API v2.2+ accepts raw digits with country code (e.g., `201012345678`) and handles JID conversion internally. No need to append `@s.whatsapp.net`.
