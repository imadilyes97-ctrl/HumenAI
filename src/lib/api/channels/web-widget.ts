// HumenAI — Web Widget Channel Adapter
// Handles embedding script generation and widget-sourced conversations

export class WebWidgetAdapter {
  private tenantId: string;
  private publicKey: string;

  constructor(tenantId: string, publicKey: string) {
    this.tenantId = tenantId;
    this.publicKey = publicKey;
  }

  /**
   * Generate the embed script for the merchant's website
   */
  generateEmbedScript(): string {
    return `
<script>
  (function(w,d,s,o,f){
    w.HumenAI=w.HumenAI||function(){(w.HumenAI.q=w.HumenAI.q||[]).push(arguments)};
    w.HumenAI('init', '${this.publicKey}');
    s=d.createElement('script');s.async=1;s.src=o;
    d.head.appendChild(s);
  })(window,document,'https://widget.humenai.app/widget.js');
</script>
    `.trim();
  }

  /**
   * Generate widget initialization config for the embed script
   */
  getWidgetConfig(): WidgetConfig {
    return {
      tenantId: this.tenantId,
      position: "bottom-right",
      theme: {
        primaryColor: "#4f46e5",
        bubbleIcon: "💬",
        position: "bottom-right",
      },
      greeting: {
        message: "Bonjour ! Je suis votre assistant. Comment puis-je vous aider ?",
        delay: 2000,
      },
    };
  }
}

export interface WidgetConfig {
  tenantId: string;
  position: "bottom-right" | "bottom-left";
  theme: {
    primaryColor: string;
    bubbleIcon: string;
    position: string;
  };
  greeting: {
    message: string;
    delay: number;
  };
}
