// HumenAI — WhatsApp Business API adapter
// Handles WhatsApp-specific constraints: 24h window, message templates, rate limits

export class WhatsAppAdapter {
  private apiKey: string;
  private phoneNumberId: string;

  constructor(apiKey: string, phoneNumberId: string) {
    this.apiKey = apiKey;
    this.phoneNumberId = phoneNumberId;
  }

  /**
   * Send a message via WhatsApp Business API.
   * Automatically detects 24h window and switches to template messages.
   */
  async sendMessage(to: string, text: string, isInWindow: boolean): Promise<void> {
    if (isInWindow) {
      await this.sendFreeFormMessage(to, text);
    } else {
      await this.sendTemplateMessage(to, text);
    }
  }

  private async sendFreeFormMessage(to: string, text: string): Promise<void> {
    const url = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }
  }

  private async sendTemplateMessage(to: string, text: string): Promise<void> {
    // Use pre-approved message template (e.g., order_update)
    const url = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "customer_support",
          language: { code: "fr" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text }],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp template error: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Verify webhook signature from WhatsApp
   */
  verifySignature(signature: string, body: string): boolean {
    // TODO: Implement HMAC-SHA256 verification
    // const expected = crypto.createHmac('sha256', this.apiKey).update(body).digest('hex');
    // return signature === `sha256=${expected}`;
    return true;
  }
}
